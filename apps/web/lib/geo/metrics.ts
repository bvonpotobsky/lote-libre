import { createHash } from "node:crypto"
import area from "@turf/area"
import bbox from "@turf/bbox"
import centroid from "@turf/centroid"
import rewind from "@turf/rewind"
import { polygon as turfPolygon } from "@turf/helpers"

export type Bbox = {
  minLon: number
  minLat: number
  maxLon: number
  maxLat: number
}

export type LoteMetrics = {
  areaHa: number
  centroid: { lon: number; lat: number }
  bbox: Bbox
  geometryHash: string
}

/** ~0.11 m at the equator: finer than any GPS a producer is carrying. */
const COORD_DECIMALS = 6

const round = (n: number): number =>
  Number.parseFloat(n.toFixed(COORD_DECIMALS))

/**
 * Canonical form of a polygon, so that the same ground truth always produces
 * the same hash — which is what makes the satellite image cache content
 * addressed rather than per-lote.
 *
 * Rounds coordinates, closes every ring, then normalizes winding so the
 * serialization is deterministic. Closing must happen BEFORE the rewind: Turf
 * rejects an open ring outright.
 *
 * It does NOT normalize the ring's starting vertex, so two genuinely identical
 * polygons traced from different corners will miss each other in the cache.
 * That costs one extra Copernicus call, never correctness.
 */
export function canonicalize(geometry: GeoJSON.Polygon): GeoJSON.Polygon {
  const closed = geometry.coordinates.map((ring) => {
    const rounded = ring.map(([lon, lat]) => [round(lon!), round(lat!)])
    const first = rounded[0]!
    const last = rounded[rounded.length - 1]!
    const isClosed = first[0] === last[0] && first[1] === last[1]
    return (isClosed ? rounded : [...rounded, first]) as GeoJSON.Position[]
  })

  const wound = rewind(turfPolygon(closed), {
    reverse: false,
  }) as GeoJSON.Feature<GeoJSON.Polygon>

  return { type: "Polygon", coordinates: wound.geometry.coordinates }
}

export function hashGeometry(geometry: GeoJSON.Polygon): string {
  const canonical = canonicalize(geometry)
  return createHash("sha256")
    .update(JSON.stringify(canonical.coordinates))
    .digest("hex")
}

export function measure(geometry: GeoJSON.Polygon): LoteMetrics {
  const canonical = canonicalize(geometry)
  const feature = turfPolygon(canonical.coordinates)

  const squareMetres = area(feature)
  const [minLon, minLat, maxLon, maxLat] = bbox(feature)
  const [lon, lat] = centroid(feature).geometry.coordinates as [number, number]

  return {
    areaHa: Number.parseFloat((squareMetres / 10_000).toFixed(4)),
    centroid: { lon: round(lon), lat: round(lat) },
    bbox: {
      minLon: round(minLon!),
      minLat: round(minLat!),
      maxLon: round(maxLon!),
      maxLat: round(maxLat!),
    },
    geometryHash: hashGeometry(canonical),
  }
}
