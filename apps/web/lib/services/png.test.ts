import { PNG } from "pngjs"
import { describe, expect, it } from "vitest"

import {
  clearRatio,
  isEffectivelyEmpty,
  isEmptyCoverage,
  measureCoverage,
} from "./png"

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

const coverageOf = (opaqueRatio: number) => measureCoverage(raster(opaqueRatio * TOTAL))

describe("measureCoverage", () => {
  it("reports the raster dimensions alongside the opaque share", () => {
    expect(measureCoverage(raster(TOTAL / 4))).toEqual({
      width: SIDE,
      height: SIDE,
      opaqueRatio: 0.25,
    })
  })
})

describe("clearRatio", () => {
  it("is one when a square lote came back fully painted", () => {
    expect(clearRatio(coverageOf(1), 1)).toBe(1)
  })

  it("is one for a clean L-shaped lote that only half fills its bounding box", () => {
    // The number has to be about the lote, not about the bounding box. An
    // L-shaped field is transparent outside the polygon by design, and that is
    // not cloud.
    expect(clearRatio(coverageOf(0.5), 0.5)).toBe(1)
  })

  it("reports the share of the lote that was actually seen", () => {
    // Same L-shaped field, but 60% of its pixels were clouded in every pass.
    expect(clearRatio(coverageOf(0.2), 0.5)).toBeCloseTo(0.4, 6)
  })

  it("never exceeds one when the polygon overfills its estimate", () => {
    expect(clearRatio(coverageOf(0.6), 0.5)).toBe(1)
  })

  it("is zero for a raster that came back entirely transparent", () => {
    expect(clearRatio(coverageOf(0), 0.5)).toBe(0)
  })
})

describe("isEmptyCoverage", () => {
  it("fires below the tolerance and holds above it", () => {
    expect(isEmptyCoverage(coverageOf(0.2), 0.5, 0.5)).toBe(true)
    expect(isEmptyCoverage(coverageOf(0.3), 0.5, 0.5)).toBe(false)
  })

  it("treats a fully transparent raster as empty whatever the tolerance", () => {
    expect(isEmptyCoverage(coverageOf(0), 0.5, 0.5)).toBe(true)
    expect(isEmptyCoverage(coverageOf(0), 0.01, 0.01)).toBe(true)
  })
})

describe("isEffectivelyEmpty", () => {
  it("keeps calling a transparent response empty", () => {
    expect(isEffectivelyEmpty(raster(0), 1)).toBe(true)
  })

  it("keeps calling a legitimate L-shaped lote non-empty", () => {
    expect(isEffectivelyEmpty(raster(TOTAL / 2), 0.5)).toBe(false)
  })

  it("keeps its default tolerance at one fifth of the expected coverage", () => {
    expect(isEffectivelyEmpty(raster(TOTAL * 0.09), 0.5)).toBe(true)
    expect(isEffectivelyEmpty(raster(TOTAL * 0.11), 0.5)).toBe(false)
  })

  it("does not call undecodable bytes an empty image", () => {
    expect(isEffectivelyEmpty(Buffer.from("not a png"), 1)).toBe(false)
  })
})
