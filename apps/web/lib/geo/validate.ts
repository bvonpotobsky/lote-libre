import kinks from "@turf/kinks"
import { polygon as turfPolygon } from "@turf/helpers"

import type { ErrorCode } from "@/lib/http/responses"
import { canonicalize, measure, type LoteMetrics } from "./metrics"

/** Continental Argentina. Deliberately excludes the Antarctic claim. */
export const ARGENTINA_BBOX = {
  minLon: -73.6,
  minLat: -55.2,
  maxLon: -53.6,
  maxLat: -21.7,
} as const

export const MIN_AREA_HA = 0.5
export const MAX_AREA_HA = 100_000

export type GeometryProblem = Extract<
  ErrorCode,
  | "GEOMETRY_NOT_POLYGON"
  | "GEOMETRY_SELF_INTERSECTING"
  | "GEOMETRY_OUTSIDE_ARGENTINA"
  | "GEOMETRY_TOO_SMALL"
  | "GEOMETRY_TOO_LARGE"
>

export type ValidationResult =
  | { ok: true; geometry: GeoJSON.Polygon; metrics: LoteMetrics }
  | { ok: false; code: GeometryProblem }

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value)

/** A ring needs at least 3 distinct corners, i.e. 4 positions once closed. */
function hasUsableRings(coordinates: GeoJSON.Position[][]): boolean {
  const outer = coordinates[0]
  if (!outer) return false

  const closed =
    outer.length > 1 &&
    outer[0]![0] === outer[outer.length - 1]![0] &&
    outer[0]![1] === outer[outer.length - 1]![1]

  return closed ? outer.length >= 4 : outer.length >= 3
}

function everyCoordinateIsSane(coordinates: GeoJSON.Position[][]): boolean {
  return coordinates.every((ring) =>
    ring.every(
      (position) =>
        isFiniteNumber(position[0]) &&
        isFiniteNumber(position[1]) &&
        Math.abs(position[0]) <= 180 &&
        Math.abs(position[1]) <= 90,
    ),
  )
}

function withinArgentina(bbox: LoteMetrics["bbox"]): boolean {
  return (
    bbox.minLon >= ARGENTINA_BBOX.minLon &&
    bbox.maxLon <= ARGENTINA_BBOX.maxLon &&
    bbox.minLat >= ARGENTINA_BBOX.minLat &&
    bbox.maxLat <= ARGENTINA_BBOX.maxLat
  )
}

/**
 * Order matters here. Self-intersection is checked before area because the
 * area of a bow-tie polygon is arithmetic noise — reporting "too small" for a
 * badly drawn shape would send the producer looking in the wrong place.
 */
export function validatePolygon(input: unknown): ValidationResult {
  if (
    typeof input !== "object" ||
    input === null ||
    (input as GeoJSON.Geometry).type !== "Polygon"
  ) {
    return { ok: false, code: "GEOMETRY_NOT_POLYGON" }
  }

  const raw = input as GeoJSON.Polygon
  if (!Array.isArray(raw.coordinates) || raw.coordinates.length === 0) {
    return { ok: false, code: "GEOMETRY_NOT_POLYGON" }
  }

  // Out-of-range values almost always mean a projected CRS (Gauss-Krüger /
  // POSGAR) was exported as if it were lat/lon. That is not "outside
  // Argentina" in any useful sense, but it IS the hint the user needs.
  if (!everyCoordinateIsSane(raw.coordinates)) {
    return { ok: false, code: "GEOMETRY_OUTSIDE_ARGENTINA" }
  }

  if (!hasUsableRings(raw.coordinates)) {
    return { ok: false, code: "GEOMETRY_NOT_POLYGON" }
  }

  const geometry = canonicalize(raw)

  if (kinks(turfPolygon(geometry.coordinates)).features.length > 0) {
    return { ok: false, code: "GEOMETRY_SELF_INTERSECTING" }
  }

  const metrics = measure(geometry)

  if (!withinArgentina(metrics.bbox)) {
    return { ok: false, code: "GEOMETRY_OUTSIDE_ARGENTINA" }
  }
  if (metrics.areaHa < MIN_AREA_HA) {
    return { ok: false, code: "GEOMETRY_TOO_SMALL" }
  }
  if (metrics.areaHa > MAX_AREA_HA) {
    return { ok: false, code: "GEOMETRY_TOO_LARGE" }
  }

  return { ok: true, geometry, metrics }
}
