import { describe, expect, it } from "vitest"

import {
  ANILLO_LOTE,
  MARCO,
  VISTA,
  aPixel,
  anilloAPath,
  geometriaAPath,
  relacionDeAspecto,
} from "./proyeccion"

const [minLon, minLat, maxLon, maxLat] = MARCO

describe("relacionDeAspecto", () => {
  it("matches the viewBox aspect, so the raster and the vectors register", () => {
    const esperada = VISTA.ancho / VISTA.alto
    expect(Math.abs(relacionDeAspecto(MARCO) - esperada)).toBeLessThan(1e-3)
  })
})

describe("aPixel", () => {
  it("maps the north-west corner to the origin", () => {
    const [x, y] = aPixel(MARCO, VISTA, [minLon, maxLat])
    expect(x).toBeCloseTo(0, 6)
    expect(y).toBeCloseTo(0, 6)
  })

  it("maps the south-east corner to the far edge", () => {
    const [x, y] = aPixel(MARCO, VISTA, [maxLon, minLat])
    expect(x).toBeCloseTo(VISTA.ancho, 6)
    expect(y).toBeCloseTo(VISTA.alto, 6)
  })

  it("maps the centre to the centre", () => {
    const [x, y] = aPixel(MARCO, VISTA, [
      (minLon + maxLon) / 2,
      (minLat + maxLat) / 2,
    ])
    expect(x).toBeCloseTo(VISTA.ancho / 2, 6)
    expect(y).toBeCloseTo(VISTA.alto / 2, 6)
  })

  it("grows y towards the south, the SVG way round", () => {
    const [, norte] = aPixel(MARCO, VISTA, [minLon, -25.83])
    const [, sur] = aPixel(MARCO, VISTA, [minLon, -25.87])
    expect(norte).toBeLessThan(sur)
  })

  it("places the seed lote centred in the frame", () => {
    const esquinas = ANILLO_LOTE.slice(0, 4).map((p) => aPixel(MARCO, VISTA, p))
    const esperadas = [
      [569.4, 691.3],
      [870.6, 691.3],
      [870.6, 388.6],
      [569.4, 388.6],
    ]
    esquinas.forEach(([x, y], i) => {
      expect(Math.abs(x - esperadas[i]![0]!)).toBeLessThan(0.2)
      expect(Math.abs(y - esperadas[i]![1]!)).toBeLessThan(0.2)
    })
    const xs = esquinas.map(([x]) => x)
    const ys = esquinas.map(([, y]) => y)
    const centroX = (Math.min(...xs) + Math.max(...xs)) / 2
    const centroY = (Math.min(...ys) + Math.max(...ys)) / 2
    expect(centroX).toBeCloseTo(VISTA.ancho / 2, 0)
    expect(centroY).toBeCloseTo(VISTA.alto / 2, 0)
  })
})

describe("anilloAPath", () => {
  it("emits a closed path that starts with M and ends with Z", () => {
    const d = anilloAPath(MARCO, VISTA, ANILLO_LOTE)
    expect(d.startsWith("M")).toBe(true)
    expect(d.endsWith("Z")).toBe(true)
    expect(d.match(/L/g)).toHaveLength(3)
  })

  it("does not repeat the closing point: Z closes the ring", () => {
    const d = anilloAPath(MARCO, VISTA, ANILLO_LOTE)
    const pares = d.slice(1, -1).split("L")
    expect(pares).toHaveLength(4)
  })

  it("honours the requested decimals", () => {
    const uno = anilloAPath(MARCO, VISTA, ANILLO_LOTE, 1)
    const tres = anilloAPath(MARCO, VISTA, ANILLO_LOTE, 3)
    expect(uno).toMatch(/^M\d+\.\d /)
    expect(tres).toMatch(/^M\d+\.\d{3} /)
  })
})

describe("geometriaAPath", () => {
  it("emits one subpath per ring, holes included", () => {
    const exterior = ANILLO_LOTE.map((p) => [...p])
    const hueco = [
      [-63.995, -25.855],
      [-63.985, -25.855],
      [-63.985, -25.848],
      [-63.995, -25.848],
      [-63.995, -25.855],
    ]
    const d = geometriaAPath(MARCO, VISTA, {
      type: "MultiPolygon",
      coordinates: [[exterior, hueco]],
    })
    expect(d.match(/M/g)).toHaveLength(2)
    expect(d.match(/Z/g)).toHaveLength(2)
  })

  it("handles a plain Polygon too", () => {
    const d = geometriaAPath(MARCO, VISTA, {
      type: "Polygon",
      coordinates: [ANILLO_LOTE.map((p) => [...p])],
    })
    expect(d.match(/M/g)).toHaveLength(1)
  })
})
