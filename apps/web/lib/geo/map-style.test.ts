import { describe, expect, it } from "vitest"

import {
  NO_VERDICT_COLOR,
  VERDICT_COLOR,
  boundsOf,
  toFeatureCollection,
  verdictColor,
  verdictColorExpression,
  type MapLote,
} from "./map-style"

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

const loteOf = (overrides: Partial<MapLote> = {}): MapLote => ({
  id: "lote-1",
  nombre: "Pellegrini",
  geometry: PELLEGRINI,
  verdict: null,
  areaHa: 48.6,
  ...overrides,
})

/**
 * A three-line evaluator for MapLibre's `match` form, so the expression is
 * tested as the map will read it rather than as the shape we happened to build.
 * Without this the record and the expression can drift apart silently — which
 * is the only bug this module can really have.
 */
function evaluateMatch(expression: unknown[], input: string | null): unknown {
  const [, , ...rest] = expression
  const fallback = rest[rest.length - 1]
  for (let i = 0; i < rest.length - 1; i += 2) {
    if (rest[i] === input) return rest[i + 1]
  }
  return fallback
}

describe("verdictColor", () => {
  it("gives each verdict the project's own token, not a generic traffic light", () => {
    expect(verdictColor("verde")).toBe("#17663a")
    expect(verdictColor("amarillo")).toBe("#e0a106")
    expect(verdictColor("rojo")).toBe("#b3161c")
  })

  it("falls back to the neutral colour when a lote was never verified", () => {
    expect(verdictColor(null)).toBe(NO_VERDICT_COLOR)
    expect(NO_VERDICT_COLOR).not.toBe(VERDICT_COLOR.verde)
  })
})

describe("verdictColorExpression", () => {
  it("reads the verdict off the feature", () => {
    const [operator, accessor] = verdictColorExpression()
    expect(operator).toBe("match")
    expect(accessor).toEqual(["get", "verdict"])
  })

  it("resolves to exactly what verdictColor resolves to", () => {
    const expression = verdictColorExpression()
    for (const verdict of ["verde", "amarillo", "rojo"] as const) {
      expect(evaluateMatch(expression, verdict)).toBe(verdictColor(verdict))
    }
    expect(evaluateMatch(expression, null)).toBe(verdictColor(null))
  })
})

describe("toFeatureCollection", () => {
  it("emits one feature per lote", () => {
    const collection = toFeatureCollection([
      loteOf(),
      loteOf({ id: "lote-2", geometry: LA_AMARGA }),
    ])

    expect(collection.type).toBe("FeatureCollection")
    expect(collection.features).toHaveLength(2)
    expect(collection.features[0]?.geometry).toEqual(PELLEGRINI)
  })

  it("carries the properties the click handler and the labels both read", () => {
    const [feature] = toFeatureCollection([
      loteOf({ id: "lote-9", nombre: "La Amarga", verdict: "verde", areaHa: 12.5 }),
    ]).features

    expect(feature?.properties).toEqual({
      id: "lote-9",
      nombre: "La Amarga",
      verdict: "verde",
      areaHa: 12.5,
    })
  })

  it("keeps an unverified lote's verdict null so the match falls through", () => {
    const [feature] = toFeatureCollection([loteOf({ verdict: null })]).features
    expect(feature?.properties.verdict).toBeNull()
  })

  it("returns an empty collection rather than throwing on no lotes", () => {
    expect(toFeatureCollection([]).features).toEqual([])
  })
})

describe("boundsOf", () => {
  it("frames every lote when they are scattered across provinces", () => {
    const bounds = boundsOf([
      loteOf(),
      loteOf({ id: "lote-2", geometry: LA_AMARGA }),
    ])

    // Santiago del Estero is north and east of Córdoba's La Amarga.
    expect(bounds).not.toBeNull()
    const [minLon, minLat, maxLon, maxLat] = bounds!
    expect(minLon).toBeCloseTo(-64.00069, 5)
    expect(minLat).toBeCloseTo(-34.26518, 5)
    expect(maxLon).toBeCloseTo(-63.76816, 5)
    expect(maxLat).toBeCloseTo(-25.84144, 5)
  })

  it("returns that lote's own bbox for a single lote", () => {
    const bounds = boundsOf([loteOf()])
    expect(bounds).not.toBeNull()
    const [minLon, minLat, maxLon, maxLat] = bounds!
    expect(minLon).toBeCloseTo(-64.00069, 5)
    expect(minLat).toBeCloseTo(-25.86162, 5)
    expect(maxLon).toBeCloseTo(-63.97838, 5)
    expect(maxLat).toBeCloseTo(-25.84144, 5)
  })

  it("returns null on an empty list so the caller can keep its default view", () => {
    expect(boundsOf([])).toBeNull()
  })

  it("never hands back a flipped coordinate: Argentina is west and south", () => {
    const bounds = boundsOf([loteOf(), loteOf({ geometry: LA_AMARGA })])!
    const [minLon, minLat, maxLon, maxLat] = bounds

    // Longitude first, latitude second. A lat/lon swap would put this lote
    // in the South Atlantic, and every one of these assertions would fail.
    expect(minLon).toBeLessThan(maxLon)
    expect(minLat).toBeLessThan(maxLat)
    for (const value of [minLon, maxLon]) expect(value).toBeLessThan(-53)
    for (const value of [minLat, maxLat]) expect(value).toBeGreaterThan(-55.2)
    expect(maxLat).toBeLessThan(-21.7)
  })
})
