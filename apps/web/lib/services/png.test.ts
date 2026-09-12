import { PNG } from "pngjs"
import { describe, expect, it } from "vitest"

import type { Mascara } from "@/lib/geo/mascara"
import { isEffectivelyEmpty, isEmptyCoverage, measureCoverage } from "./png"

const SIDE = 20
const TOTAL = SIDE * SIDE

/** A raster where the first `opaque` pixels carry alpha and the rest do not. */
function raster(opaque: number): Buffer {
  const image = new PNG({ width: SIDE, height: SIDE })
  for (let pixel = 0; pixel < TOTAL; pixel += 1) {
    const offset = pixel * 4
    image.data[offset] = 90
    image.data[offset + 1] = 120
    image.data[offset + 2] = 70
    image.data[offset + 3] = pixel < opaque ? 255 : 0
  }
  return PNG.sync.write(image)
}

/** A mask selecting the top `filas` rows, standing in for a lote's footprint. */
const filasDeArriba = (filas: number, ancho = SIDE, alto = SIDE): Mascara => ({
  ancho,
  alto,
  dentro: (_columna, fila) => fila < filas,
})

const coverageOf = (opaqueRatio: number, mask?: Mascara) =>
  measureCoverage(raster(opaqueRatio * TOTAL), mask)

describe("measureCoverage", () => {
  it("reports the raster dimensions alongside the opaque share", () => {
    expect(measureCoverage(raster(TOTAL / 4))).toEqual({
      width: SIDE,
      height: SIDE,
      measured: TOTAL,
      opaqueRatio: 0.25,
    })
  })

  it("measures only the pixels the mask selects", () => {
    // The raster fills row by row, so the top half opaque and a mask over that
    // same half is a lote seen in full — whatever the rest of the frame did.
    expect(coverageOf(0.5, filasDeArriba(SIDE / 2)).opaqueRatio).toBe(1)
  })

  it("does not credit the lote for pixels outside it", () => {
    // Same raster, but the mask now sits on the transparent bottom half.
    const abajo: Mascara = {
      ancho: SIDE,
      alto: SIDE,
      dentro: (_columna, fila) => fila >= SIDE / 2,
    }
    expect(coverageOf(0.5, abajo).opaqueRatio).toBe(0)
  })

  it("reports how many pixels the mask selected", () => {
    const coverage = coverageOf(1, filasDeArriba(5))
    expect(coverage.measured).toBe(5 * SIDE)
  })

  it("refuses a mask cut for a different raster", () => {
    // A silent misalignment would publish a wrong "N % del lote" as evidence.
    // The route's catch turns this into SENTINEL_UNAVAILABLE, which is honest.
    expect(() => coverageOf(1, filasDeArriba(5, SIDE + 1, SIDE))).toThrow(
      /mask/i,
    )
  })

  it("falls back to the whole raster when the mask selects nothing", () => {
    const ninguno: Mascara = { ancho: SIDE, alto: SIDE, dentro: () => false }
    const coverage = coverageOf(0.25, ninguno)

    expect(coverage.measured).toBe(TOTAL)
    expect(coverage.opaqueRatio).toBe(0.25)
  })
})

describe("isEmptyCoverage", () => {
  it("fires below the tolerance and holds above it", () => {
    expect(isEmptyCoverage(coverageOf(0.2), 0.5)).toBe(true)
    expect(isEmptyCoverage(coverageOf(0.6), 0.5)).toBe(false)
  })

  it("treats a fully transparent raster as empty whatever the tolerance", () => {
    expect(isEmptyCoverage(coverageOf(0), 0.5)).toBe(true)
    expect(isEmptyCoverage(coverageOf(0), 0.01)).toBe(true)
  })

  it("judges the lote, not the frame around it", () => {
    // Half the frame is transparent, but all of the lote came back painted.
    // Before the mask this read as a coin-flip; now it is plainly not empty.
    expect(isEmptyCoverage(coverageOf(0.5, filasDeArriba(SIDE / 2)), 0.5)).toBe(
      false,
    )
  })
})

describe("isEffectivelyEmpty", () => {
  it("keeps calling a transparent response empty", () => {
    expect(isEffectivelyEmpty(raster(0))).toBe(true)
  })

  it("keeps calling a fully painted frame non-empty", () => {
    expect(isEffectivelyEmpty(raster(TOTAL))).toBe(false)
  })

  it("keeps its default tolerance at one fifth", () => {
    expect(isEffectivelyEmpty(raster(TOTAL * 0.19))).toBe(true)
    expect(isEffectivelyEmpty(raster(TOTAL * 0.21))).toBe(false)
  })

  it("does not call undecodable bytes an empty image", () => {
    expect(isEffectivelyEmpty(Buffer.from("not a png"))).toBe(false)
  })
})
