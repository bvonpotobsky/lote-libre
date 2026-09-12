import { describe, expect, it } from "vitest"

import { encuadreDeLote } from "./encuadre"
import { mascaraDeLote } from "./mascara"
import { geometriaAPath } from "./proyeccion"

/** A square lote in the Chaco, about 2 km on a side. */
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

/** Share of the frame the mask accepts, by walking every pixel. */
function proporcion(geometria: GeoJSON.Polygon | GeoJSON.MultiPolygon) {
  const encuadre = encuadreDeLote(geometria)
  const mascara = mascaraDeLote(encuadre, geometria)

  let dentro = 0
  for (let fila = 0; fila < mascara.alto; fila += 1) {
    for (let columna = 0; columna < mascara.ancho; columna += 1) {
      if (mascara.dentro(columna, fila)) dentro += 1
    }
  }
  return dentro / (mascara.ancho * mascara.alto)
}

describe("mascaraDeLote", () => {
  it("carries the frame's own dimensions", () => {
    const encuadre = encuadreDeLote(LOTE)
    const mascara = mascaraDeLote(encuadre, LOTE)

    expect(mascara.ancho).toBe(encuadre.vista.ancho)
    expect(mascara.alto).toBe(encuadre.vista.alto)
  })

  it("accepts the centre of the frame and rejects its corners", () => {
    const encuadre = encuadreDeLote(LOTE)
    const mascara = mascaraDeLote(encuadre, LOTE)
    const { ancho, alto } = encuadre.vista

    expect(mascara.dentro(Math.floor(ancho / 2), Math.floor(alto / 2))).toBe(true)
    expect(mascara.dentro(0, 0)).toBe(false)
    expect(mascara.dentro(ancho - 1, 0)).toBe(false)
    expect(mascara.dentro(0, alto - 1)).toBe(false)
    expect(mascara.dentro(ancho - 1, alto - 1)).toBe(false)
  })

  it("accepts roughly the share of the frame the lote actually covers", () => {
    // The padding opens the box; whatever it opens is, by definition, not lote.
    // This is the number the old area-ratio approximation was estimating.
    const encuadre = encuadreDeLote(LOTE)
    const [minLon, minLat, maxLon, maxLat] = encuadre.marco
    const esperada =
      (0.02 / (maxLon - minLon)) * (0.02 / (maxLat - minLat))

    expect(proporcion(LOTE)).toBeCloseTo(esperada, 2)
  })

  it("rejects a hole punched in the ring", () => {
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
    const encuadre = encuadreDeLote(conHueco)
    const mascara = mascaraDeLote(encuadre, conHueco)

    // The hole is the middle quarter, so the centre pixel is now outside.
    expect(
      mascara.dentro(
        Math.floor(encuadre.vista.ancho / 2),
        Math.floor(encuadre.vista.alto / 2),
      ),
    ).toBe(false)
    expect(proporcion(conHueco)).toBeLessThan(proporcion(LOTE))
  })

  it("handles a MultiPolygon exactly as it handles the Polygon", () => {
    const multi: GeoJSON.MultiPolygon = {
      type: "MultiPolygon",
      coordinates: [LOTE.coordinates],
    }
    expect(proporcion(multi)).toBeCloseTo(proporcion(LOTE), 6)
  })

  it("agrees with the outline drawn over the same frame", () => {
    // The load-bearing invariant of the whole feature. The mask decides which
    // pixels count as lote; the outline tells the producer which pixels those
    // are. If the two ever drifted, the number under the image would describe
    // ground other than the ground the outline encloses — and nothing else
    // would notice.
    //
    // Full precision on purpose: at the default one decimal the path's own
    // rounding is the same size as the discrepancy being measured.
    const encuadre = encuadreDeLote(LOTE)
    const mascara = mascaraDeLote(encuadre, LOTE)
    const d = geometriaAPath(encuadre.marco, encuadre.vista, LOTE, 6)

    const puntos = [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => [
      Number(m[1]),
      Number(m[2]),
    ])
    const borde = {
      x0: Math.min(...puntos.map((p) => p[0]!)),
      x1: Math.max(...puntos.map((p) => p[0]!)),
      y0: Math.min(...puntos.map((p) => p[1]!)),
      y1: Math.max(...puntos.map((p) => p[1]!)),
    }

    let mx0 = Infinity
    let mx1 = -Infinity
    let my0 = Infinity
    let my1 = -Infinity
    for (let fila = 0; fila < mascara.alto; fila += 1) {
      for (let columna = 0; columna < mascara.ancho; columna += 1) {
        if (!mascara.dentro(columna, fila)) continue
        mx0 = Math.min(mx0, columna)
        mx1 = Math.max(mx1, columna)
        my0 = Math.min(my0, fila)
        my1 = Math.max(my1, fila)
      }
    }

    // A mask answers for pixel centres, so the outermost accepted centre sits
    // less than a whole pixel inside the edge — and never outside it.
    for (const margen of [
      mx0 + 0.5 - borde.x0,
      borde.x1 - (mx1 + 0.5),
      my0 + 0.5 - borde.y0,
      borde.y1 - (my1 + 0.5),
    ]) {
      expect(margen).toBeGreaterThan(0)
      expect(margen).toBeLessThanOrEqual(1)
    }
  })

  it("rejects pixels outside the grid rather than guessing", () => {
    const mascara = mascaraDeLote(encuadreDeLote(LOTE), LOTE)

    expect(mascara.dentro(-1, 0)).toBe(false)
    expect(mascara.dentro(0, -1)).toBe(false)
    expect(mascara.dentro(mascara.ancho, 0)).toBe(false)
    expect(mascara.dentro(0, mascara.alto)).toBe(false)
  })
})
