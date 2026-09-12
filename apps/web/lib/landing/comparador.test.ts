import { describe, expect, it } from "vitest"

import {
  POSICION_INICIAL,
  limitarPosicion,
  recorteDeVista,
} from "./comparador"

describe("POSICION_INICIAL", () => {
  it("parks the divider in the middle, so both halves are visible at rest", () => {
    expect(POSICION_INICIAL).toBe(50)
  })
})

describe("limitarPosicion", () => {
  it("passes a position inside the range straight through", () => {
    expect(limitarPosicion(0)).toBe(0)
    expect(limitarPosicion(50)).toBe(50)
    expect(limitarPosicion(100)).toBe(100)
    expect(limitarPosicion(37.5)).toBe(37.5)
  })

  it("clamps a position outside the range to the nearest edge", () => {
    expect(limitarPosicion(-20)).toBe(0)
    expect(limitarPosicion(140)).toBe(100)
    expect(limitarPosicion(-Infinity)).toBe(0)
    expect(limitarPosicion(Infinity)).toBe(100)
  })

  it("falls back to the initial position when there is no number", () => {
    // A range input hands over a string; Number("") is 0, but Number("x") is
    // NaN, and NaN would produce `inset(0 NaN% 0 0)` and hide both images.
    expect(limitarPosicion(Number.NaN)).toBe(POSICION_INICIAL)
  })
})

describe("recorteDeVista", () => {
  it("inverts the position into the inset the reference image is cut to", () => {
    expect(recorteDeVista(50)).toBe("inset(0 50% 0 0)")
    expect(recorteDeVista(25)).toBe("inset(0 75% 0 0)")
  })

  it("shows nothing of the reference at 0 and all of it at 100", () => {
    expect(recorteDeVista(0)).toBe("inset(0 100% 0 0)")
    expect(recorteDeVista(100)).toBe("inset(0 0% 0 0)")
  })

  it("clamps before it formats, so a bad position cannot leak into CSS", () => {
    expect(recorteDeVista(-10)).toBe("inset(0 100% 0 0)")
    expect(recorteDeVista(180)).toBe("inset(0 0% 0 0)")
    expect(recorteDeVista(Number.NaN)).toBe("inset(0 50% 0 0)")
  })
})
