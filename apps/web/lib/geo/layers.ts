import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import area from "@turf/area"
import bbox from "@turf/bbox"
import { featureCollection, polygon as turfPolygon } from "@turf/helpers"
import intersect from "@turf/intersect"

const DATA_DIR = resolve(process.cwd(), "data")

export type LayerProps = Record<string, unknown>
export type PolygonFeature = GeoJSON.Feature<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  LayerProps
>

/** Bounding boxes are precomputed once so a lookup can reject most features
 *  without touching their geometry — a provincial layer holds tens of
 *  thousands of polygons and a lote touches a handful. */
type IndexedFeature = { feature: PolygonFeature; box: [number, number, number, number] }

const cache = new Map<string, IndexedFeature[] | null>()

export async function loadLayer(
  relativePath: string,
): Promise<IndexedFeature[] | null> {
  const cached = cache.get(relativePath)
  if (cached !== undefined) return cached

  let indexed: IndexedFeature[] | null
  try {
    const raw = await readFile(resolve(DATA_DIR, relativePath), "utf8")
    const parsed = JSON.parse(raw) as GeoJSON.FeatureCollection
    indexed = parsed.features
      .filter(
        (feature): feature is PolygonFeature =>
          feature.geometry?.type === "Polygon" ||
          feature.geometry?.type === "MultiPolygon",
      )
      .map((feature) => ({
        feature,
        box: bbox(feature) as [number, number, number, number],
      }))
  } catch {
    // A missing layer is a state the caller handles, not a crash.
    indexed = null
  }

  cache.set(relativePath, indexed)
  return indexed
}

/** Test seam: lets a suite install a layer without touching the filesystem. */
export function primeLayerCache(
  relativePath: string,
  features: PolygonFeature[] | null,
): void {
  cache.set(
    relativePath,
    features?.map((feature) => ({
      feature,
      box: bbox(feature) as [number, number, number, number],
    })) ?? null,
  )
}

const boxesOverlap = (
  a: [number, number, number, number],
  b: [number, number, number, number],
): boolean => !(a[2] < b[0] || a[0] > b[2] || a[3] < b[1] || a[1] > b[3])

export type OverlapResult = {
  /** Intersected area in hectares, grouped by the caller's key. */
  hectaresByKey: Map<string, number>
  /** Features that actually intersected, for provenance and detail. */
  matched: PolygonFeature[]
}

/**
 * Intersects a lote against a layer and totals the overlapping area per key.
 *
 * Areas are measured on the intersection geometry rather than taken from the
 * layer's own attributes: several published layers carry hectare figures that
 * disagree with their geometry, and the figure that has to hold up is the one
 * about THIS lote.
 */
export function overlapByKey(
  lote: GeoJSON.Polygon,
  layer: IndexedFeature[],
  keyOf: (props: LayerProps) => string | null,
): OverlapResult {
  const loteFeature = turfPolygon(lote.coordinates)
  const loteBox = bbox(loteFeature) as [number, number, number, number]

  const hectaresByKey = new Map<string, number>()
  const matched: PolygonFeature[] = []

  for (const { feature, box } of layer) {
    if (!boxesOverlap(loteBox, box)) continue

    const key = keyOf(feature.properties ?? {})
    if (key === null) continue

    let piece
    try {
      piece = intersect(featureCollection([loteFeature, feature]))
    } catch {
      // A malformed polygon in a public layer must not sink the verification.
      continue
    }
    if (!piece) continue

    const hectares = area(piece) / 10_000
    if (hectares <= 0) continue

    hectaresByKey.set(key, (hectaresByKey.get(key) ?? 0) + hectares)
    matched.push(feature)
  }

  return { hectaresByKey, matched }
}

export type SourceManifest = Record<string, Record<string, unknown>>

let manifest: SourceManifest | null | undefined

/** Provenance written by the layer build script; printed in the PDF. */
export async function loadSourceManifest(): Promise<SourceManifest | null> {
  if (manifest !== undefined) return manifest
  try {
    manifest = JSON.parse(
      await readFile(resolve(DATA_DIR, "sources.json"), "utf8"),
    ) as SourceManifest
  } catch {
    manifest = null
  }
  return manifest
}
