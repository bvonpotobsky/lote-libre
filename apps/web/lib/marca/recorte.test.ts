import { describe, expect, it } from "vitest"

import {
  aCuadrado,
  bbox,
  conMargen,
  enmascarar,
  esCromatico,
  esVisible,
} from "./recorte"

/** Builds an RGBA buffer and lets the test paint it pixel by pixel. */
function lienzo(
  ancho: number,
  alto: number,
  pintar: (
    x: number,
    y: number
  ) => readonly [number, number, number, number] | null
): Buffer {
  const datos = Buffer.alloc(ancho * alto * 4)
  for (let y = 0; y < alto; y += 1) {
    for (let x = 0; x < ancho; x += 1) {
      const pixel = pintar(x, y)
      if (pixel === null) continue
      const o = (y * ancho + x) * 4
      datos[o] = pixel[0]
      datos[o + 1] = pixel[1]
      datos[o + 2] = pixel[2]
      datos[o + 3] = pixel[3]
    }
  }
  return datos
}

const VERDE = [21, 97, 55, 255] as const
const TINTA = [0, 0, 0, 255] as const

describe("bbox", () => {
  it("wraps the painted pixels and nothing else", () => {
    // A 2×2 block at (3,1) inside a 10×6 canvas.
    const datos = lienzo(10, 6, (x, y) =>
      x >= 3 && x <= 4 && y >= 1 && y <= 2 ? TINTA : null
    )
    expect(bbox(datos, 10, 6, esVisible)).toEqual({
      x: 3,
      y: 1,
      ancho: 2,
      alto: 2,
    })
  })

  it("returns null when nothing passes the predicate", () => {
    expect(bbox(lienzo(4, 4, () => null), 4, 4, esVisible)).toBeNull()
  })

  it("keeps a single pixel in the far corner", () => {
    const datos = lienzo(5, 5, (x, y) => (x === 4 && y === 4 ? TINTA : null))
    expect(bbox(datos, 5, 5, esVisible)).toEqual({
      x: 4,
      y: 4,
      ancho: 1,
      alto: 1,
    })
  })

  it("ignores the antialias ghost below the alpha floor", () => {
    // Alpha 4 is the halo an export leaves behind; only the solid pixel counts.
    const datos = lienzo(6, 3, (x, y) => {
      if (x === 2 && y === 1) return TINTA
      return [0, 0, 0, 4]
    })
    expect(bbox(datos, 6, 3, esVisible)).toEqual({
      x: 2,
      y: 1,
      ancho: 1,
      alto: 1,
    })
  })

  it("isolates the chromatic mark from the black wordmark beside it", () => {
    // The real lockup in one line: green symbol left, black type right.
    const datos = lienzo(12, 4, (x, y) => {
      if (y < 1 || y > 2) return null
      if (x >= 1 && x <= 3) return VERDE
      if (x >= 6 && x <= 10) return TINTA
      return null
    })
    expect(bbox(datos, 12, 4, esVisible)).toEqual({
      x: 1,
      y: 1,
      ancho: 10,
      alto: 2,
    })
    expect(bbox(datos, 12, 4, esCromatico)).toEqual({
      x: 1,
      y: 1,
      ancho: 3,
      alto: 2,
    })
  })
})

describe("esCromatico", () => {
  it("accepts the brand green and rejects every neutral", () => {
    expect(esCromatico(...VERDE)).toBe(true)
    expect(esCromatico(0, 0, 0, 255)).toBe(false)
    expect(esCromatico(255, 255, 255, 255)).toBe(false)
    expect(esCromatico(74, 82, 76, 255)).toBe(false)
  })

  it("rejects a transparent pixel whatever its colour", () => {
    expect(esCromatico(21, 97, 55, 0)).toBe(false)
  })

  it("rejects the compression noise scattered through the wordmark", () => {
    // Measured in the real master: a handful of pixels carry a hue at alpha 9,
    // which is nothing on screen but stretched the crop across the whole file.
    expect(esCromatico(0, 28, 28, 9)).toBe(false)
    expect(esCromatico(25, 0, 0, 10)).toBe(false)
    expect(esCromatico(25, 51, 25, 10)).toBe(false)
  })

  it("keeps a faint but genuine edge of the symbol", () => {
    // Same alpha range, but the hue is strong enough to be the mark itself.
    expect(esCromatico(18, 109, 72, 40)).toBe(true)
  })
})

describe("aCuadrado", () => {
  it("grows the short side around the same centre", () => {
    expect(aCuadrado({ x: 10, y: 20, ancho: 30, alto: 10 })).toEqual({
      x: 10,
      y: 10,
      ancho: 30,
      alto: 30,
    })
  })

  it("leaves a square untouched", () => {
    const caja = { x: 4, y: 4, ancho: 8, alto: 8 }
    expect(aCuadrado(caja)).toEqual(caja)
  })

  it("may return an origin outside the canvas, which the caller pads", () => {
    expect(aCuadrado({ x: 0, y: 5, ancho: 3, alto: 9 })).toEqual({
      x: -3,
      y: 5,
      ancho: 9,
      alto: 9,
    })
  })
})

describe("conMargen", () => {
  it("pads every side by a fraction of the longest side", () => {
    expect(conMargen({ x: 10, y: 10, ancho: 20, alto: 40 }, 0.1)).toEqual({
      x: 6,
      y: 6,
      ancho: 28,
      alto: 48,
    })
  })

  it("returns the same box for a zero margin", () => {
    const caja = { x: 1, y: 2, ancho: 3, alto: 4 }
    expect(conMargen(caja, 0)).toEqual(caja)
  })
})

describe("enmascarar", () => {
  it("clears everything the predicate rejects and leaves the rest alone", () => {
    // Green symbol and black type side by side, as in the real lockup.
    const datos = lienzo(6, 1, (x) => {
      if (x < 2) return VERDE
      if (x >= 4) return TINTA
      return null
    })
    const salida = enmascarar(datos, 6, 1, esCromatico)

    expect([...salida.subarray(0, 4)]).toEqual([...VERDE])
    // The type keeps its colour bytes but stops contributing anything.
    expect(salida[4 * 4 + 3]).toBe(0)
    expect(salida[5 * 4 + 3]).toBe(0)
  })

  it("does not touch the buffer it was given", () => {
    const datos = lienzo(1, 1, () => TINTA)
    enmascarar(datos, 1, 1, esCromatico)
    expect(datos[3]).toBe(255)
  })
})
