import { describe, expect, it } from "vitest"

import { contornoDeLote, encuadreDeLote } from "./encuadre"
import {
  FRAME_PADDING_MIN_M,
  FRAME_PADDING_RATIO,
  METRES_PER_DEGREE_LAT,
} from "./raster"

/** A rectangular lote in the Chaco, about 2.0 x 2.2 km. */
const LOTE: GeoJSON.Polygon = {
  type: "Polygon",
  coordinates: [
    [
      [-61.01, -26.01],
      [-60.99, -26.01],
      [-60.99, -25.99],
      [-61.01, -25.99],
      [-61.01, -26.01],
    ],
  ],
}

const MISMO_LOTE_MULTI: GeoJSON.MultiPolygon = {
  type: "MultiPolygon",
  coordinates: [LOTE.coordinates],
}

/** The x/y extent the outline occupies inside the viewBox. */
function extension(d: string) {
  const numeros = [...d.matchAll(/([ML])(-?[\d.]+) (-?[\d.]+)/g)]
  const xs = numeros.map((m) => Number(m[2]))
  const ys = numeros.map((m) => Number(m[3]))
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  }
}

describe("encuadreDeLote", () => {
  it("frames more ground than the lote covers, on all four sides", () => {
    const { marco } = encuadreDeLote(LOTE)

    expect(marco[0]).toBeLessThan(-61.01)
    expect(marco[1]).toBeLessThan(-26.01)
    expect(marco[2]).toBeGreaterThan(-60.99)
    expect(marco[3]).toBeGreaterThan(-25.99)
  })

  it("gives a Polygon and its equivalent MultiPolygon the same frame", () => {
    // The code this replaces cast coordinates to a Polygon's depth, so a
    // MultiPolygon produced a wrong box or threw.
    expect(encuadreDeLote(MISMO_LOTE_MULTI)).toEqual(encuadreDeLote(LOTE))
  })

  it("returns whole pixels, which is what Sentinel Hub is asked for", () => {
    const { vista } = encuadreDeLote(LOTE)

    expect(Number.isInteger(vista.ancho)).toBe(true)
    expect(Number.isInteger(vista.alto)).toBe(true)
    expect(Math.min(vista.ancho, vista.alto)).toBeGreaterThanOrEqual(1)
  })

  it("survives a lote drawn as a single repeated point", () => {
    const punto: GeoJSON.Polygon = {
      type: "Polygon",
      coordinates: [
        [
          [-61, -26],
          [-61, -26],
          [-61, -26],
          [-61, -26],
        ],
      ],
    }
    const { marco, vista } = encuadreDeLote(punto)

    expect(marco[2]).toBeGreaterThan(marco[0])
    expect(marco[3]).toBeGreaterThan(marco[1])
    expect(vista.ancho).toBeGreaterThan(0)
  })
})

describe("contornoDeLote", () => {
  it("leaves a margin on every side of the viewBox", () => {
    const encuadre = encuadreDeLote(LOTE)
    const { minX, maxX, minY, maxY } = extension(contornoDeLote(encuadre, LOTE))

    expect(minX).toBeGreaterThan(0)
    expect(minY).toBeGreaterThan(0)
    expect(maxX).toBeLessThan(encuadre.vista.ancho)
    expect(maxY).toBeLessThan(encuadre.vista.alto)
  })

  it("centres the lote: the margins match on opposite sides", () => {
    const encuadre = encuadreDeLote(LOTE)
    const { minX, maxX, minY, maxY } = extension(contornoDeLote(encuadre, LOTE))

    expect(minX).toBeCloseTo(encuadre.vista.ancho - maxX, 0)
    expect(minY).toBeCloseTo(encuadre.vista.alto - maxY, 0)
  })

  it("puts the padding the frame promised between the lote and the edge", () => {
    // This is the load-bearing assertion for registration. The margin is read
    // back off the rendered path, converted to ground metres through the
    // frame's own scale, and compared with the padding paddedBbox applied. If
    // the projection and the padding ever drift apart, this number moves.
    const encuadre = encuadreDeLote(LOTE)
    const { minY } = extension(contornoDeLote(encuadre, LOTE))

    const metrosPorPixel =
      ((encuadre.marco[3] - encuadre.marco[1]) * METRES_PER_DEGREE_LAT) /
      encuadre.vista.alto
    const ladoLargoM = 0.02 * METRES_PER_DEGREE_LAT

    expect(minY * metrosPorPixel).toBeCloseTo(
      Math.max(FRAME_PADDING_RATIO * ladoLargoM, FRAME_PADDING_MIN_M),
      0,
    )
  })

  it("emits one subpath per ring, holes included", () => {
    const conHueco: GeoJSON.Polygon = {
      type: "Polygon",
      coordinates: [
        LOTE.coordinates[0]!,
        [
          [-61.005, -26.005],
          [-60.995, -26.005],
          [-60.995, -25.995],
          [-61.005, -25.995],
          [-61.005, -26.005],
        ],
      ],
    }
    const d = contornoDeLote(encuadreDeLote(conHueco), conHueco)

    expect(d.match(/M/g)).toHaveLength(2)
    expect(d.match(/Z/g)).toHaveLength(2)
  })

  it("draws a MultiPolygon exactly where it draws the Polygon", () => {
    const encuadre = encuadreDeLote(LOTE)
    expect(contornoDeLote(encuadre, MISMO_LOTE_MULTI)).toBe(
      contornoDeLote(encuadre, LOTE),
    )
  })
})
