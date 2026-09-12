import { describe, expect, it } from "vitest"

import { MOVIMIENTO, retardo } from "./movimiento"

describe("retardo", () => {
  it.each([
    [0, 0],
    [1, 70],
    [4, 280],
    [5, 300],
    [99, 300],
    [-1, 0],
  ])("item %i waits %i ms", (indice, esperado) => {
    expect(retardo(indice)).toBe(esperado)
  })
})

describe("MOVIMIENTO", () => {
  it("draws the lote outline within the brief's 900–1200 ms window", () => {
    expect(MOVIMIENTO.duracion.trazo).toBeGreaterThanOrEqual(900)
    expect(MOVIMIENTO.duracion.trazo).toBeLessThanOrEqual(1200)
  })

  it("keeps the accumulated stagger under the 300 ms cap", () => {
    expect(MOVIMIENTO.escalonado.tope).toBeLessThanOrEqual(300)
  })

  it("uses the editorial easing curve", () => {
    expect(MOVIMIENTO.easing).toBe("cubic-bezier(0.22, 1, 0.36, 1)")
  })

  it("keeps the camera inside the brief's limits", () => {
    expect(MOVIMIENTO.camara.perspectiva).toBeGreaterThanOrEqual(1000)
    expect(MOVIMIENTO.camara.perspectiva).toBeLessThanOrEqual(1400)
    expect(Math.abs(MOVIMIENTO.camara.inclinacionX)).toBeLessThanOrEqual(24)
    expect(Math.abs(MOVIMIENTO.camara.inclinacionZ)).toBeLessThanOrEqual(10)
    expect(MOVIMIENTO.planos.separacion).toBeGreaterThanOrEqual(24)
    expect(MOVIMIENTO.planos.separacion).toBeLessThanOrEqual(40)
    expect(MOVIMIENTO.parallax.maximo).toBeLessThanOrEqual(24)
  })
})
