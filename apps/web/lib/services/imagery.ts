import { mkdir, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { and, desc, eq, gte, lte } from "drizzle-orm"
import { nanoid } from "nanoid"

import { db } from "@/lib/db"
import { encuadreDeLote } from "@/lib/geo/encuadre"
import { mascaraDeLote } from "@/lib/geo/mascara"
import { satelliteImages, type SatelliteImage } from "@/lib/db/schema"
import { CACHE_DIR, cacheFileName, stillOnDisk } from "./imagery-cache"
import {
  CLEAR_WINDOW_DAYS,
  searchWindow,
  type ImagePeriod,
  type SearchWindow,
} from "./imagery-window"
import { EVALSCRIPT_VERSION, getLoteImage } from "./sentinel"
import { isEmptyCoverage, measureCoverage } from "./png"
import { pickClearWindow } from "./xweather"

export type { ImagePeriod } from "./imagery-window"
export type ImageLayer = "trueColor" | "ndvi"

/**
 * True colour first, NDVI behind a toggle.
 *
 * A producer recognises their own field in true colour and can judge it without
 * a legend; NDVI is the analytical view for when dry canopy and fresh clearing
 * look alike. Both layers are composited cloud-free over the same window, so
 * switching between them never changes what is being compared.
 */
const DEFAULT_LAYER: ImageLayer = "trueColor"

/** A 2020 image never changes; a "current" one goes stale. */
const CURRENT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

/**
 * How much of the lote has to come back unclouded for the image to be evidence.
 *
 * The old default meant "widen only if more than 80% of the field is hidden",
 * which let through comparisons that were mostly holes. Raising it buys better
 * images with more widened windows, and a widened window is the expensive path
 * — this is the dial to turn if Copernicus usage climbs.
 */
const EMPTY_TOLERANCE = 0.5

export type ImageryMeta = {
  period: ImagePeriod
  layer: ImageLayer
  dateFrom: string
  dateTo: string
  cloudAvgPct: number | null
  /** Share of the lote actually seen through the clouds, 0-1. */
  clearRatio: number | null
  windowSource: "xweather" | "ampliada" | "fallback"
  isEmpty: boolean
  bytes: number
  pixelWidth: number
  pixelHeight: number
}

const today = (): string => new Date().toISOString().slice(0, 10)

const otherLayer = (layer: ImageLayer): ImageLayer =>
  layer === "ndvi" ? "trueColor" : "ndvi"

function toMeta(row: SatelliteImage): ImageryMeta {
  return {
    period: row.period,
    layer: row.layer,
    dateFrom: row.dateFrom,
    dateTo: row.dateTo,
    cloudAvgPct: row.cloudAvgPct,
    clearRatio: row.clearRatio,
    windowSource: row.windowSource,
    isEmpty: row.isEmpty,
    bytes: row.bytes,
    pixelWidth: row.pixelWidth,
    pixelHeight: row.pixelHeight,
  }
}

/**
 * The cached row that would be served right now, or null to go and fetch.
 *
 * The two periods expire for different reasons, so they get different rules.
 *
 * A reference window is no longer a constant: it mirrors the season of the
 * current one, so it moves through the year. A row drawn for last season is
 * still a perfectly good 2020 image and would never expire by age — it would
 * just answer the wrong question for ever. Containment in the span we would
 * search now is what retires it.
 *
 * A current window slides every single day, so containment would reject
 * yesterday's row every morning and re-fetch the most expensive path in the
 * system. Age is the honest test there: the image is recent, or it is not.
 */
async function findReusableImage(
  geometryHash: string,
  period: ImagePeriod,
  layer: ImageLayer,
  search: SearchWindow,
): Promise<SatelliteImage | null> {
  const scoped = [
    eq(satelliteImages.geometryHash, geometryHash),
    eq(satelliteImages.period, period),
    eq(satelliteImages.evalscriptVersion, EVALSCRIPT_VERSION),
  ]

  const [row] = await db
    .select()
    .from(satelliteImages)
    .where(
      and(
        ...scoped,
        eq(satelliteImages.layer, layer),
        ...(period === "reference"
          ? [
              gte(satelliteImages.dateFrom, search.from),
              lte(satelliteImages.dateTo, search.to),
            ]
          : []),
      ),
    )
    .orderBy(desc(satelliteImages.createdAt))
    .limit(1)

  if (!row) return null
  if (period === "reference") return row
  return Date.now() - row.createdAt.getTime() < CURRENT_MAX_AGE_MS ? row : null
}

/**
 * Whatever is cached for a period, whichever layer drew it.
 *
 * This one only reports; it decides nothing. Filtering it by layer is what made
 * the document silently lose its satellite evidence when the default view moved
 * to true colour: a lote whose owner never opened the NDVI toggle has no NDVI
 * row, and the PDF would have reported no imagery at all. The two layers share
 * a window by construction, so either row carries the same dates.
 */
async function findLatestImage(
  geometryHash: string,
  period: ImagePeriod,
): Promise<SatelliteImage | null> {
  const [row] = await db
    .select()
    .from(satelliteImages)
    .where(
      and(
        eq(satelliteImages.geometryHash, geometryHash),
        eq(satelliteImages.period, period),
        eq(satelliteImages.evalscriptVersion, EVALSCRIPT_VERSION),
      ),
    )
    .orderBy(desc(satelliteImages.createdAt))
    .limit(1)

  return row ?? null
}

type ResolvedWindow = {
  from: string
  to: string
  cloudAvgPct: number | null
  source: ImageryMeta["windowSource"]
  /** True when the sibling layer already settled this window. */
  shared: boolean
}

/**
 * The window both layers of a period must use.
 *
 * `pickClearWindow` depends on the centroid and the span, never on the layer,
 * so asking twice would spend a second serial run of 31-day Xweather chunks to
 * learn the same answer — against a quota the client documents as tight enough
 * that three bursts trip it. Reading the sibling layer's row costs one indexed
 * query.
 *
 * It is also a correctness requirement, not just a saving: if the two layers
 * resolved separately they could land on different dates, and flipping the
 * toggle would quietly change what the slider is comparing.
 */
async function resolveWindow(
  geometryHash: string,
  period: ImagePeriod,
  layer: ImageLayer,
  centroid: { lon: number; lat: number },
  search: SearchWindow,
): Promise<ResolvedWindow> {
  const sibling = await findReusableImage(
    geometryHash,
    period,
    otherLayer(layer),
    search,
  )

  if (sibling) {
    return {
      from: sibling.dateFrom,
      to: sibling.dateTo,
      cloudAvgPct: sibling.cloudAvgPct,
      source: sibling.windowSource,
      shared: true,
    }
  }

  const picked = await pickClearWindow(centroid, search, CLEAR_WINDOW_DAYS)
  return { ...picked, shared: false }
}

/**
 * Returns the cached image for a lote, fetching it from Copernicus on a miss.
 *
 * The cache is keyed by geometry hash rather than lote id, so two producers who
 * drew the same field share the PNG. Authorization happens one layer up, on the
 * lote — this function never sees a user.
 *
 * The returned `filePath` is guaranteed to exist at the moment it is returned:
 * a row is only a hit while its bytes are still on disk. Callers read that file
 * directly, so a row that outlived its PNG has to count as a miss.
 */
export async function getOrCreateImage(
  geometry: GeoJSON.Polygon,
  geometryHash: string,
  centroid: { lon: number; lat: number },
  period: ImagePeriod,
  layer: ImageLayer = DEFAULT_LAYER,
): Promise<{ meta: ImageryMeta; filePath: string }> {
  const search = searchWindow(period, today())
  const cached = await stillOnDisk(
    await findReusableImage(geometryHash, period, layer, search),
  )
  if (cached) return { meta: toMeta(cached), filePath: cached.filePath }

  const window = await resolveWindow(
    geometryHash,
    period,
    layer,
    centroid,
    search,
  )
  // Built once from the same frame getLoteImage asks Copernicus for, so the
  // clear figure is about the lote rather than about the neighbours now sharing
  // the picture with it.
  const mascara = mascaraDeLote(encuadreDeLote(geometry), geometry)

  let from = window.from
  let to = window.to
  let windowSource = window.source
  let cloudAvgPct = window.cloudAvgPct

  let png = await getLoteImage(geometry, from, to, layer)
  let coverage = measureCoverage(png, mascara)
  let isEmpty = isEmptyCoverage(coverage, EMPTY_TOLERANCE)

  // Sentinel-2 revisits every five days, so a "clear" five-day window can
  // contain exactly one pass — and if that pass was clouded over this tile,
  // nothing clears the filter and the response is a transparent PNG. Widening
  // once costs one request and is the difference between showing a field and
  // showing a blank square.
  //
  // Not when the window came from the sibling layer, though: that layer is
  // already being served on these dates, and moving only this one would make
  // the toggle change what is being compared. A hole is the honest answer there.
  if (isEmpty && windowSource === "xweather" && !window.shared) {
    const ampliada = await getLoteImage(geometry, search.from, search.to, layer)
    const ampliadaCoverage = measureCoverage(ampliada, mascara)
    if (!isEmptyCoverage(ampliadaCoverage, EMPTY_TOLERANCE)) {
      png = ampliada
      coverage = ampliadaCoverage
      from = search.from
      to = search.to
      windowSource = "ampliada"
      cloudAvgPct = null
      isEmpty = false
    }
  }

  const fileName = cacheFileName(
    geometryHash,
    period,
    layer,
    EVALSCRIPT_VERSION,
    from,
    to,
  )
  const filePath = resolve(CACHE_DIR, fileName)

  await mkdir(CACHE_DIR, { recursive: true })
  await writeFile(filePath, png)

  const values = {
    filePath,
    bytes: png.byteLength,
    isEmpty,
    pixelWidth: coverage.width,
    pixelHeight: coverage.height,
    clearRatio: coverage.opaqueRatio,
  }

  const [row] = await db
    .insert(satelliteImages)
    .values({
      id: nanoid(12),
      geometryHash,
      period,
      layer,
      evalscriptVersion: EVALSCRIPT_VERSION,
      dateFrom: from,
      dateTo: to,
      windowSource,
      cloudAvgPct,
      ...values,
    })
    .onConflictDoUpdate({
      target: [
        satelliteImages.geometryHash,
        satelliteImages.period,
        satelliteImages.layer,
        satelliteImages.evalscriptVersion,
        satelliteImages.dateFrom,
        satelliteImages.dateTo,
      ],
      set: { ...values, createdAt: new Date() },
    })
    .returning()

  return { meta: toMeta(row!), filePath }
}

/**
 * Reads whatever imagery is already cached, without contacting Copernicus.
 *
 * Generating the document must not block on a satellite request: the window and
 * its cloud cover are evidence about images the producer has already seen, and
 * a lote with no imagery yet still gets a valid document.
 */
export async function readCachedImagery(
  geometryHash: string,
): Promise<Record<ImagePeriod, ImageryMeta | null>> {
  const periods: ImagePeriod[] = ["reference", "current"]
  const entries = await Promise.all(
    periods.map(async (period) => {
      const row = await findLatestImage(geometryHash, period)
      return [period, row ? toMeta(row) : null] as const
    }),
  )

  return Object.fromEntries(entries) as Record<ImagePeriod, ImageryMeta | null>
}
