import type { ErrorCode } from "@/lib/http/responses"

export type ExtractProblem = Extract<
  ErrorCode,
  "FILE_UNREADABLE" | "FILE_MULTIPLE_POLYGONS" | "GEOMETRY_NOT_POLYGON"
>

export type ExtractResult =
  | { ok: true; geometry: GeoJSON.Polygon }
  | { ok: false; code: ExtractProblem }

function collectPolygons(node: unknown, found: GeoJSON.Polygon[]): void {
  if (typeof node !== "object" || node === null) return
  const candidate = node as { type?: string; [key: string]: unknown }

  switch (candidate.type) {
    case "FeatureCollection": {
      const features = candidate.features
      if (Array.isArray(features)) {
        for (const feature of features) collectPolygons(feature, found)
      }
      return
    }
    case "Feature":
      collectPolygons(candidate.geometry, found)
      return
    case "GeometryCollection": {
      const geometries = candidate.geometries
      if (Array.isArray(geometries)) {
        for (const geometry of geometries) collectPolygons(geometry, found)
      }
      return
    }
    case "Polygon":
      found.push(candidate as unknown as GeoJSON.Polygon)
      return
    case "MultiPolygon": {
      // KML exporters routinely wrap a single lote in a MultiGeometry. One
      // member is the same lote; several members are several lotes.
      const parts = (candidate as unknown as GeoJSON.MultiPolygon).coordinates
      if (!Array.isArray(parts)) return
      for (const coordinates of parts) found.push({ type: "Polygon", coordinates })
      return
    }
    default:
      return
  }
}

/**
 * Pulls exactly one polygon out of anything GeoJSON-shaped. Kept free of DOM
 * access so it can be tested directly; the KML wrapper below is the only part
 * that needs a browser.
 */
export function extractPolygon(input: unknown): ExtractResult {
  const found: GeoJSON.Polygon[] = []
  collectPolygons(input, found)

  if (found.length === 0) return { ok: false, code: "GEOMETRY_NOT_POLYGON" }
  if (found.length > 1) return { ok: false, code: "FILE_MULTIPLE_POLYGONS" }
  return { ok: true, geometry: found[0]! }
}

export function parseGeoJSONText(text: string): ExtractResult {
  try {
    return extractPolygon(JSON.parse(text))
  } catch {
    return { ok: false, code: "FILE_UNREADABLE" }
  }
}
