import { describe, expect, it } from "vitest"

import {
  type Marco,
  type Punto,
  type Vista,
  aLonLat,
  aPixel,
  anilloAPath,
  geometriaAPath,
} from "./proyeccion"

/** A frame over the Chaco, deliberately not square in degrees. */
const MARCO: Marco = [-61.05, -26.04, -60.95, -25.98]
const VISTA: Vista = { ancho: 400, alto: 240 }
const [minLon, minLat, maxLon, maxLat] = MARCO

const ANILLO: readonly Punto[] = [
  [-61.02, -26.02],
  [-60.98, -26.02],
  [-60.98, -26.0],
  [-61.02, -26.0],
  [-61.02, -26.02],
]

describe("aPixel", () => {
  it("maps the north-west corner to the origin", () => {
    const [x, y] = aPixel(MARCO, VISTA, [minLon, maxLat])
    expect(x).toBeCloseTo(0, 9)
    expect(y).toBeCloseTo(0, 9)
  })

  it("maps the south-east corner to the far edge", () => {
    const [x, y] = aPixel(MARCO, VISTA, [maxLon, minLat])
    expect(x).toBeCloseTo(VISTA.ancho, 9)
    expect(y).toBeCloseTo(VISTA.alto, 9)
  })

  it("grows y towards the south, the SVG way round", () => {
    const [, norte] = aPixel(MARCO, VISTA, [minLon, -25.99])
    const [, sur] = aPixel(MARCO, VISTA, [minLon, -26.03])
    expect(norte).toBeLessThan(sur)
  })

  it("stays linear in degrees, with no cosine of its own", () => {
    // metricAspect corrects the latitude when it decides how many pixels to
    // ask for. If that correction leaked in here as well it would be applied
    // twice and the outline would sit off the lote.
    const medio = aPixel(MARCO, VISTA, [
      (minLon + maxLon) / 2,
      (minLat + maxLat) / 2,
    ])
    expect(medio[0]).toBeCloseTo(VISTA.ancho / 2, 9)
    expect(medio[1]).toBeCloseTo(VISTA.alto / 2, 9)
  })
})

describe("aLonLat", () => {
  it("answers for the middle of the pixel, not its corner", () => {
    // A pixel covers a cell. Asking whether it belongs to the lote is a
    // question about its centre; its north-west corner sits on the boundary,
    // where a lote edge decides the answer by rounding.
    const [lon, lat] = aLonLat(MARCO, VISTA, 0, 0)
    expect(lon).toBeGreaterThan(minLon)
    expect(lat).toBeLessThan(maxLat)

    const anchoPixel = (maxLon - minLon) / VISTA.ancho
    expect(lon - minLon).toBeCloseTo(anchoPixel / 2, 12)
  })

  it("round-trips through aPixel, landing back on the pixel centre", () => {
    for (const [columna, fila] of [
      [0, 0],
      [7, 3],
      [VISTA.ancho - 1, VISTA.alto - 1],
    ] as const) {
      const [x, y] = aPixel(MARCO, VISTA, aLonLat(MARCO, VISTA, columna, fila))
      expect(x).toBeCloseTo(columna + 0.5, 9)
      expect(y).toBeCloseTo(fila + 0.5, 9)
    }
  })

  it("keeps every pixel centre strictly inside the frame", () => {
    const esquinas = [
      aLonLat(MARCO, VISTA, 0, 0),
      aLonLat(MARCO, VISTA, VISTA.ancho - 1, VISTA.alto - 1),
    ]
    for (const [lon, lat] of esquinas) {
      expect(lon).toBeGreaterThan(minLon)
      expect(lon).toBeLessThan(maxLon)
      expect(lat).toBeGreaterThan(minLat)
      expect(lat).toBeLessThan(maxLat)
    }
  })
})

describe("anilloAPath", () => {
  it("emits a closed path that starts with M and ends with Z", () => {
    const d = anilloAPath(MARCO, VISTA, ANILLO)
    expect(d.startsWith("M")).toBe(true)
    expect(d.endsWith("Z")).toBe(true)
    expect(d.match(/L/g)).toHaveLength(3)
  })

  it("does not repeat the closing point: Z closes the ring", () => {
    const pares = anilloAPath(MARCO, VISTA, ANILLO).slice(1, -1).split("L")
    expect(pares).toHaveLength(4)
  })

  it("honours the requested decimals", () => {
    expect(anilloAPath(MARCO, VISTA, ANILLO, 1)).toMatch(/^M\d+\.\d /)
    expect(anilloAPath(MARCO, VISTA, ANILLO, 3)).toMatch(/^M\d+\.\d{3} /)
  })
})

describe("geometriaAPath", () => {
  it("emits one subpath per ring, holes included", () => {
    const hueco = [
      [-61.01, -26.015],
      [-60.99, -26.015],
      [-60.99, -26.005],
      [-61.01, -26.005],
      [-61.01, -26.015],
    ]
    const d = geometriaAPath(MARCO, VISTA, {
      type: "MultiPolygon",
      coordinates: [[ANILLO.map((p) => [...p]), hueco]],
    })
    expect(d.match(/M/g)).toHaveLength(2)
    expect(d.match(/Z/g)).toHaveLength(2)
  })

  it("handles a plain Polygon too", () => {
    const d = geometriaAPath(MARCO, VISTA, {
      type: "Polygon",
      coordinates: [ANILLO.map((p) => [...p])],
    })
    expect(d.match(/M/g)).toHaveLength(1)
  })
})
