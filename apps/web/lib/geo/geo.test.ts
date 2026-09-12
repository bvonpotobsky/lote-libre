import { describe, expect, it } from "vitest"

import { canonicalize, hashGeometry, measure } from "./metrics"
import { extractPolygon, parseGeoJSONText } from "./parse"
import { validatePolygon } from "./validate"

/** Pellegrini, Santiago del Estero — the demo lote with post-2020 clearing. */
const PELLEGRINI: GeoJSON.Polygon = {
  type: "Polygon",
  coordinates: [
    [
      [-64.00069, -25.86162],
      [-63.97838, -25.86162],
      [-63.97838, -25.84144],
      [-64.00069, -25.84144],
      [-64.00069, -25.86162],
    ],
  ],
}

/** Pedanía La Amarga, Córdoba — long-established cropland, no forest loss. */
const LA_AMARGA: GeoJSON.Polygon = {
  type: "Polygon",
  coordinates: [
    [
      [-63.79244, -34.26518],
      [-63.76816, -34.26518],
      [-63.76816, -34.24502],
      [-63.79244, -34.24502],
      [-63.79244, -34.26518],
    ],
  ],
}

const polygonOf = (ring: number[][]): GeoJSON.Polygon => ({
  type: "Polygon",
  coordinates: [ring as GeoJSON.Position[]],
})

describe("measure", () => {
  it("computes the demo lotes at roughly 500 ha", () => {
    expect(measure(PELLEGRINI).areaHa).toBeGreaterThan(480)
    expect(measure(PELLEGRINI).areaHa).toBeLessThan(520)
    expect(measure(LA_AMARGA).areaHa).toBeGreaterThan(480)
    expect(measure(LA_AMARGA).areaHa).toBeLessThan(520)
  })

  it("puts the centroid inside the polygon's bbox", () => {
    const { centroid, bbox } = measure(PELLEGRINI)
    expect(centroid.lon).toBeGreaterThan(bbox.minLon)
    expect(centroid.lon).toBeLessThan(bbox.maxLon)
    expect(centroid.lat).toBeGreaterThan(bbox.minLat)
    expect(centroid.lat).toBeLessThan(bbox.maxLat)
  })
})

describe("canonicalize / hashGeometry", () => {
  it("closes an open ring", () => {
    const open = polygonOf([
      [-64.0, -25.86],
      [-63.97, -25.86],
      [-63.97, -25.84],
      [-64.0, -25.84],
    ])
    const ring = canonicalize(open).coordinates[0]!
    expect(ring[0]).toEqual(ring[ring.length - 1])
  })

  it("hashes an open and a closed version of the same lote identically", () => {
    const open = polygonOf(PELLEGRINI.coordinates[0]!.slice(0, -1))
    expect(hashGeometry(open)).toBe(hashGeometry(PELLEGRINI))
  })

  it("ignores coordinate noise below ~0.1 m", () => {
    const jittered = polygonOf(
      PELLEGRINI.coordinates[0]!.map(([lon, lat]) => [
        lon! + 1e-9,
        lat! - 1e-9,
      ]),
    )
    expect(hashGeometry(jittered)).toBe(hashGeometry(PELLEGRINI))
  })

  it("gives different lotes different hashes", () => {
    expect(hashGeometry(PELLEGRINI)).not.toBe(hashGeometry(LA_AMARGA))
  })
})

describe("validatePolygon", () => {
  it("accepts both demo lotes", () => {
    expect(validatePolygon(PELLEGRINI).ok).toBe(true)
    expect(validatePolygon(LA_AMARGA).ok).toBe(true)
  })

  it("rejects a hand-drawn bow tie", () => {
    const bowTie = polygonOf([
      [-64.0, -25.86],
      [-63.97, -25.84],
      [-63.97, -25.86],
      [-64.0, -25.84],
      [-64.0, -25.86],
    ])
    const result = validatePolygon(bowTie)
    expect(result).toEqual({ ok: false, code: "GEOMETRY_SELF_INTERSECTING" })
  })

  it("rejects a polygon outside Argentina", () => {
    const brasilia = polygonOf([
      [-47.9, -15.8],
      [-47.85, -15.8],
      [-47.85, -15.75],
      [-47.9, -15.75],
      [-47.9, -15.8],
    ])
    expect(validatePolygon(brasilia)).toEqual({
      ok: false,
      code: "GEOMETRY_OUTSIDE_ARGENTINA",
    })
  })

  it("flags projected coordinates (Gauss-Kruger) rather than crashing", () => {
    const gaussKruger = polygonOf([
      [4_500_000, 6_200_000],
      [4_502_000, 6_200_000],
      [4_502_000, 6_202_000],
      [4_500_000, 6_202_000],
      [4_500_000, 6_200_000],
    ])
    expect(validatePolygon(gaussKruger)).toEqual({
      ok: false,
      code: "GEOMETRY_OUTSIDE_ARGENTINA",
    })
  })

  it("rejects something that is not a polygon", () => {
    const line: GeoJSON.LineString = {
      type: "LineString",
      coordinates: [
        [-64, -25],
        [-63, -25],
      ],
    }
    expect(validatePolygon(line)).toEqual({
      ok: false,
      code: "GEOMETRY_NOT_POLYGON",
    })
  })

  it("rejects a ring with too few corners", () => {
    expect(
      validatePolygon(
        polygonOf([
          [-64, -25],
          [-63.99, -25],
          [-64, -25],
        ]),
      ),
    ).toEqual({ ok: false, code: "GEOMETRY_NOT_POLYGON" })
  })

  it("rejects a lote under half a hectare", () => {
    const tiny = polygonOf([
      [-64.0, -25.86],
      [-63.9999, -25.86],
      [-63.9999, -25.8599],
      [-64.0, -25.8599],
      [-64.0, -25.86],
    ])
    expect(validatePolygon(tiny)).toEqual({
      ok: false,
      code: "GEOMETRY_TOO_SMALL",
    })
  })

  it("rejects an import that swallowed several provinces", () => {
    const huge = polygonOf([
      [-66, -30],
      [-60, -30],
      [-60, -25],
      [-66, -25],
      [-66, -30],
    ])
    expect(validatePolygon(huge)).toEqual({
      ok: false,
      code: "GEOMETRY_TOO_LARGE",
    })
  })
})

describe("extractPolygon", () => {
  it("takes the single polygon out of a FeatureCollection", () => {
    const fc = {
      type: "FeatureCollection",
      features: [{ type: "Feature", properties: {}, geometry: PELLEGRINI }],
    }
    const result = extractPolygon(fc)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.geometry.coordinates).toEqual(PELLEGRINI.coordinates)
  })

  it("unwraps a MultiPolygon that holds exactly one lote", () => {
    const multi: GeoJSON.MultiPolygon = {
      type: "MultiPolygon",
      coordinates: [PELLEGRINI.coordinates],
    }
    expect(extractPolygon(multi).ok).toBe(true)
  })

  it("asks the user to choose when the file holds several lotes", () => {
    const fc = {
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: {}, geometry: PELLEGRINI },
        { type: "Feature", properties: {}, geometry: LA_AMARGA },
      ],
    }
    expect(extractPolygon(fc)).toEqual({
      ok: false,
      code: "FILE_MULTIPLE_POLYGONS",
    })
  })

  it("reports a file with no polygon at all", () => {
    const fc = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [-64, -25] },
        },
      ],
    }
    expect(extractPolygon(fc)).toEqual({
      ok: false,
      code: "GEOMETRY_NOT_POLYGON",
    })
  })

  it("reports malformed JSON as an unreadable file", () => {
    expect(parseGeoJSONText("{ not json")).toEqual({
      ok: false,
      code: "FILE_UNREADABLE",
    })
  })
})
