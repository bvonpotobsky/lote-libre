import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import booleanPointInPolygon from "@turf/boolean-point-in-polygon"
import { point } from "@turf/helpers"

export type Province = { slug: string; nombre: string }

const LAYER_PATH = resolve(process.cwd(), "data/provincias-ar.geojson")

type ProvinceFeature = GeoJSON.Feature<
  GeoJSON.Polygon | GeoJSON.MultiPolygon,
  { slug?: string; nombre?: string }
>

let cache: ProvinceFeature[] | null | undefined

/**
 * Loads the province layer once. `null` means the layer is not present yet —
 * a deliberate, recoverable state rather than a crash, so the rest of the app
 * keeps working while the geodata pipeline is still producing it.
 */
async function loadProvinces(): Promise<ProvinceFeature[] | null> {
  if (cache !== undefined) return cache

  try {
    const raw = await readFile(LAYER_PATH, "utf8")
    const parsed = JSON.parse(raw) as GeoJSON.FeatureCollection
    cache = parsed.features as ProvinceFeature[]
  } catch {
    cache = null
  }

  return cache
}

export async function resolveProvince(centroid: {
  lon: number
  lat: number
}): Promise<Province | null> {
  const features = await loadProvinces()
  if (!features) return null

  const at = point([centroid.lon, centroid.lat])

  for (const feature of features) {
    if (!feature.geometry) continue
    if (booleanPointInPolygon(at, feature.geometry)) {
      const nombre = feature.properties?.nombre ?? "Desconocida"
      return { slug: feature.properties?.slug ?? "desconocida", nombre }
    }
  }

  return null
}

export async function isProvinceLayerAvailable(): Promise<boolean> {
  return (await loadProvinces()) !== null
}
