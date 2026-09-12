import { describe, expect, it } from "vitest"

import { ESTADOS_POR_CAPITULO, estadoEscena, progresoDeRect } from "./escena"

describe("estadoEscena", () => {
  it("starts on the territory with nothing lifted", () => {
    expect(estadoEscena(0)).toEqual({
      capitulo: 1,
      resalte: 0,
      separacion: 0,
      papel: 0,
    })
  })

  it("ends on the sheet, planes realigned", () => {
    expect(estadoEscena(1)).toEqual({
      capitulo: 3,
      resalte: 1,
      separacion: 0,
      papel: 1,
    })
  })

  it.each([
    [0.2499, 1],
    [0.25, 2],
    [0.6499, 2],
    [0.65, 3],
  ])("progress %d is chapter %i", (p, capitulo) => {
    expect(estadoEscena(p).capitulo).toBe(capitulo)
  })

  it("keeps every value inside [0, 1] across the whole scroll", () => {
    for (let i = 0; i <= 100; i++) {
      const { resalte, separacion, papel } = estadoEscena(i / 100)
      for (const v of [resalte, separacion, papel]) {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1)
      }
    }
  })

  it("holds the planes fully apart through the middle of chapter 2", () => {
    for (let p = 0.45; p <= 0.62; p += 0.01) {
      expect(Math.abs(estadoEscena(p).separacion - 1)).toBeLessThan(1e-9)
    }
  })

  it("keeps the planes flat before the rise and after the fall", () => {
    expect(estadoEscena(0.28).separacion).toBe(0)
    expect(estadoEscena(0.1).separacion).toBe(0)
    expect(estadoEscena(0.8).separacion).toBe(0)
    expect(estadoEscena(0.95).separacion).toBe(0)
  })

  it("eases: the separation is halfway at the midpoint of its rise", () => {
    expect(estadoEscena(0.365).separacion).toBeCloseTo(0.5, 6)
  })

  it("never lowers the lote highlight once it is drawn", () => {
    let previo = 0
    for (let i = 0; i <= 100; i++) {
      const { resalte } = estadoEscena(i / 100)
      expect(resalte).toBeGreaterThanOrEqual(previo)
      previo = resalte
    }
    expect(estadoEscena(0.22).resalte).toBe(1)
  })

  it("clamps out-of-range input", () => {
    expect(estadoEscena(-3)).toEqual(estadoEscena(0))
    expect(estadoEscena(9)).toEqual(estadoEscena(1))
  })
})

describe("ESTADOS_POR_CAPITULO", () => {
  it("freezes the three states the stacked fallback renders", () => {
    expect(ESTADOS_POR_CAPITULO[1].separacion).toBe(0)
    expect(ESTADOS_POR_CAPITULO[1].papel).toBe(0)
    expect(ESTADOS_POR_CAPITULO[2].separacion).toBe(1)
    expect(ESTADOS_POR_CAPITULO[2].papel).toBe(0)
    expect(ESTADOS_POR_CAPITULO[3].separacion).toBe(0)
    expect(ESTADOS_POR_CAPITULO[3].papel).toBe(1)
    for (const capitulo of [1, 2, 3] as const) {
      expect(ESTADOS_POR_CAPITULO[capitulo].capitulo).toBe(capitulo)
      expect(ESTADOS_POR_CAPITULO[capitulo].resalte).toBe(1)
    }
  })
})

describe("progresoDeRect", () => {
  it.each([
    [0, 3000, 1000, 0],
    [-1000, 3000, 1000, 0.5],
    [-2000, 3000, 1000, 1],
    [500, 3000, 1000, 0],
    [-5000, 3000, 1000, 1],
  ])("top %i, alto %i, ventana %i → %d", (top, alto, ventana, esperado) => {
    expect(progresoDeRect(top, alto, ventana)).toBeCloseTo(esperado, 9)
  })

  it("is 0 when the section is not taller than the viewport", () => {
    expect(progresoDeRect(-100, 800, 1000)).toBe(0)
    expect(progresoDeRect(-100, 1000, 1000)).toBe(0)
  })
})
