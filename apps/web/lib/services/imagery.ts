import { mkdir, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import area from "@turf/area"
import bboxPolygon from "@turf/bbox-polygon"
import bbox from "@turf/bbox"
import { polygon as turfPolygon } from "@turf/helpers"
import { and, desc, eq } from "drizzle-orm"
import { nanoid } from "nanoid"

import { db } from "@/lib/db"
import { satelliteImages, type SatelliteImage } from "@/lib/db/schema"
import { getLoteImage } from "./sentinel"
import { isEffectivelyEmpty } from "./png"
import { addDays, pickClearWindow, type ClearWindow } from "./xweather"

export type ImagePeriod = "reference" | "current"
export type ImageLayer = "trueColor" | "ndvi"

/** EUDR cutoff is 2020-12-31, so the baseline is the last clear spring of 2020. */
const REFERENCE_SEARCH = { from: "2020-10-01", to: "2020-12-31" } as const
const CURRENT_SEARCH_DAYS = 60
const CLEAR_WINDOW_DAYS = 5
const CACHE_DIR = resolve(process.cwd(), ".cache/sentinel")

/**
 * NDVI, not true colour.
 *
 * In true colour the dry Chaco canopy and a freshly cleared field are both dark
 * and muddy — the change is nearly invisible at 512 px. NDVI separates them
 * outright: standing forest reads deep green, bare ground reads tan to red.
 * This is the layer the Copernicus module's own author documented for showing
 * "el contraste monte/lote pelado", and the map underneath still carries the
 * recognisable true-colour view.
 */

/** A 2020 image never changes; a "current" one goes stale. */
const CURRENT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export type ImageryMeta = {
  period: ImagePeriod
  layer: ImageLayer
  dateFrom: string
  dateTo: string
  cloudAvgPct: number | null
  windowSource: "xweather" | "ampliada" | "fallback"
  isEmpty: boolean
  bytes: number
}

const today = (): string => new Date().toISOString().slice(0, 10)

function searchPeriod(period: ImagePeriod): { from: string; to: string } {
  if (period === "reference") return { ...REFERENCE_SEARCH }
  const to = today()
  return { from: addDays(to, -CURRENT_SEARCH_DAYS), to }
}

function toMeta(row: SatelliteImage): ImageryMeta {
  return {
    period: row.period,
    layer: row.layer,
    dateFrom: row.dateFrom,
    dateTo: row.dateTo,
    cloudAvgPct: row.cloudAvgPct,
    windowSource: row.windowSource,
    isEmpty: row.isEmpty,
    bytes: row.bytes,
  }
}

async function findCached(
  geometryHash: string,
  period: ImagePeriod,
  layer: ImageLayer,
): Promise<SatelliteImage | null> {
  const [row] = await db
    .select()
    .from(satelliteImages)
    .where(
      and(
        eq(satelliteImages.geometryHash, geometryHash),
        eq(satelliteImages.period, period),
        eq(satelliteImages.layer, layer),
      ),
    )
    .orderBy(desc(satelliteImages.createdAt))
    .limit(1)

  if (!row) return null
  if (period === "reference") return row

  const age = Date.now() - row.createdAt.getTime()
  return age < CURRENT_MAX_AGE_MS ? row : null
}

/** How much of its own bounding box a polygon fills. Drives empty detection. */
function footprintRatio(geometry: GeoJSON.Polygon): number {
  const feature = turfPolygon(geometry.coordinates)
  const boxArea = area(bboxPolygon(bbox(feature)))
  return boxArea === 0 ? 1 : area(feature) / boxArea
}

export function cacheFileName(
  geometryHash: string,
  period: ImagePeriod,
  layer: ImageLayer,
  from: string,
  to: string,
): string {
  return `${geometryHash}-${period}-${layer}-${from}_${to}.png`
}

/**
 * Returns the cached image for a lote, fetching it from Copernicus on a miss.
 *
 * The cache is keyed by geometry hash rather than lote id, so two producers who
 * drew the same field share the PNG. Authorization happens one layer up, on the
 * lote — this function never sees a user.
 */
export async function getOrCreateImage(
  geometry: GeoJSON.Polygon,
  geometryHash: string,
  centroid: { lon: number; lat: number },
  period: ImagePeriod,
  layer: ImageLayer = "ndvi",
): Promise<{ meta: ImageryMeta; filePath: string }> {
  const cached = await findCached(geometryHash, period, layer)
  if (cached) return { meta: toMeta(cached), filePath: cached.filePath }

  const search = searchPeriod(period)
  const window = await pickClearWindow(centroid, search, CLEAR_WINDOW_DAYS)
  const expected = footprintRatio(geometry)

  let from = window.from
  let to = window.to
  let windowSource: ImageryMeta["windowSource"] = window.source
  let cloudAvgPct = window.cloudAvgPct

  let png = await getLoteImage(geometry, from, to, layer)
  let isEmpty = isEffectivelyEmpty(png, expected)

  // Sentinel-2 revisits every five days, so a "clear" five-day window can
  // contain exactly one pass — and if that pass was clouded over this tile,
  // nothing clears the filter and the response is a transparent PNG. Widening
  // once costs one request and is the difference between showing a field and
  // showing a blank square.
  if (isEmpty && windowSource === "xweather") {
    const ampliada = await getLoteImage(geometry, search.from, search.to, layer)
    if (!isEffectivelyEmpty(ampliada, expected)) {
      png = ampliada
      from = search.from
      to = search.to
      windowSource = "ampliada"
      cloudAvgPct = null
      isEmpty = false
    }
  }

  const fileName = cacheFileName(geometryHash, period, layer, from, to)
  const filePath = resolve(CACHE_DIR, fileName)

  await mkdir(CACHE_DIR, { recursive: true })
  await writeFile(filePath, png)

  const [row] = await db
    .insert(satelliteImages)
    .values({
      id: nanoid(12),
      geometryHash,
      period,
      layer,
      dateFrom: from,
      dateTo: to,
      windowSource,
      cloudAvgPct,
      filePath,
      bytes: png.byteLength,
      isEmpty,
    })
    .onConflictDoUpdate({
      target: [
        satelliteImages.geometryHash,
        satelliteImages.period,
        satelliteImages.layer,
        satelliteImages.dateFrom,
        satelliteImages.dateTo,
      ],
      set: { filePath, bytes: png.byteLength, isEmpty, createdAt: new Date() },
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
  layer: ImageLayer = "ndvi",
): Promise<Record<ImagePeriod, ImageryMeta | null>> {
  const periods: ImagePeriod[] = ["reference", "current"]
  const entries = await Promise.all(
    periods.map(async (period) => {
      const row = await findCached(geometryHash, period, layer)
      return [period, row ? toMeta(row) : null] as const
    }),
  )

  return Object.fromEntries(entries) as Record<ImagePeriod, ImageryMeta | null>
}
