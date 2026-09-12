import { describe, expect, it } from "vitest"

import type { Bbox } from "./metrics"
import {
  RASTER_LONG_SIDE,
  RASTER_MAX_LONG_SIDE,
  RASTER_MIN_SHORT_SIDE,
  metricAspect,
  pixelSize,
} from "./raster"

/** A box `spanLon` by `spanLat` degrees, centred on the Chaco. */
function box(spanLon: number, spanLat: number, lat = -26): Bbox {
  return {
    minLon: -61,
    maxLon: -61 + spanLon,
    minLat: lat - spanLat / 2,
    maxLat: lat + spanLat / 2,
  }
}

describe("metricAspect", () => {
  it("shrinks longitude by the cosine of the latitude", () => {
    // At 26° a degree of longitude is about 100 km against 111 km for a degree
    // of latitude, so a box that is square in degrees is taller on the ground.
    expect(metricAspect(box(1, 1))).toBeCloseTo(Math.cos((26 * Math.PI) / 180), 4)
  })

  it("approaches one at the equator", () => {
    expect(metricAspect(box(1, 1, 0))).toBeCloseTo(1, 4)
  })
})

describe("pixelSize", () => {
  it("renders a degree-square lote taller than it is wide", () => {
    // This is the distortion being fixed: the old code asked for 512x512 no
    // matter the shape, so Sentinel Hub stretched this box 11% across.
    const { width, height } = pixelSize(box(1, 1))

    expect(height).toBe(RASTER_LONG_SIDE)
    expect(width).toBeLessThan(height)
    expect(width).toBe(460)
  })

  it("puts the long side at 512 for an ordinary wide lote", () => {
    const { width, height } = pixelSize(box(0.04, 0.02))

    expect(width).toBe(RASTER_LONG_SIDE)
    expect(width / height).toBeCloseTo(metricAspect(box(0.04, 0.02)), 2)
  })

  it("matches the metric aspect within a pixel", () => {
    for (const [lon, lat] of [
      [0.03, 0.02],
      [0.01, 0.05],
      [0.2, 0.2],
    ] as const) {
      const b = box(lon, lat)
      const { width, height } = pixelSize(b)
      expect(Math.abs(width - height * metricAspect(b))).toBeLessThanOrEqual(1)
    }
  })

  it("scales a sliver up instead of flattening it", () => {
    // A 10:1 strip at 512 on the long side would be 51 px tall, too coarse to
    // read a clearing edge. Scaling both sides keeps the shape and stays
    // cheaper in processing units than a 512x512 square.
    const { width, height } = pixelSize(box(10 / Math.cos((26 * Math.PI) / 180), 1))

    expect(height).toBe(RASTER_MIN_SHORT_SIDE)
    expect(width).toBe(1280)
  })

  it("lets the long-side cap win on an extreme sliver", () => {
    const { width, height } = pixelSize(box(40 / Math.cos((26 * Math.PI) / 180), 1))

    expect(width).toBe(RASTER_MAX_LONG_SIDE)
    expect(height).toBeLessThan(RASTER_MIN_SHORT_SIDE)
  })

  it("falls back to a square on a degenerate box", () => {
    expect(pixelSize(box(0, 0))).toEqual({
      width: RASTER_LONG_SIDE,
      height: RASTER_LONG_SIDE,
    })
  })

  it("always returns whole pixels of at least one", () => {
    for (const [lon, lat] of [
      [1, 1],
      [0.001, 0.4],
      [0.4, 0.001],
    ] as const) {
      const { width, height } = pixelSize(box(lon, lat))
      expect(Number.isInteger(width)).toBe(true)
      expect(Number.isInteger(height)).toBe(true)
      expect(Math.min(width, height)).toBeGreaterThanOrEqual(1)
    }
  })
})
