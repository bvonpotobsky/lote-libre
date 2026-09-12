import { describe, expect, it } from "vitest"

import type { Bbox } from "./metrics"
import type { Marco } from "./proyeccion"
import {
  FRAME_PADDING_MAX_M,
  FRAME_PADDING_MIN_M,
  FRAME_PADDING_RATIO,
  METRES_PER_DEGREE_LAT,
  RASTER_LONG_SIDE,
  RASTER_MAX_LONG_SIDE,
  RASTER_MIN_SHORT_SIDE,
  marcoABbox,
  metricAspect,
  paddedBbox,
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

describe("paddedBbox", () => {
  /** A frame `spanLon` by `spanLat` degrees as the corner tuple Turf returns. */
  const marco = (spanLon: number, spanLat: number, lat = -26): Marco => [
    -61,
    lat - spanLat / 2,
    -61 + spanLon,
    lat + spanLat / 2,
  ]

  /** Metres of padding this frame grew on each axis. */
  function crecimiento(original: Marco, padded: Marco) {
    const midLat = ((original[1] + original[3]) / 2) * (Math.PI / 180)
    return {
      lon: (padded[2] - original[2]) * METRES_PER_DEGREE_LAT * Math.cos(midLat),
      lat: (padded[3] - original[3]) * METRES_PER_DEGREE_LAT,
    }
  }

  it("puts the same number of metres on every side", () => {
    // Proportional-per-axis padding would give an elongated lote a fat band on
    // its long side and a hairline on its short one.
    const original = marco(0.05, 0.01)
    const padded = paddedBbox(original)
    const { lon, lat } = crecimiento(original, padded)

    expect(Math.abs(lon - lat)).toBeLessThan(1)
    expect(padded[0] - original[0]).toBeCloseTo(original[2] - padded[2], 9)
    expect(original[1] - padded[1]).toBeCloseTo(padded[3] - original[3], 9)
  })

  it("pads an ordinary lote by a share of its long side", () => {
    // 0.05° of longitude at 26° south is about 5.0 km.
    const original = marco(0.05, 0.02)
    const largo = 0.05 * METRES_PER_DEGREE_LAT * Math.cos((26 * Math.PI) / 180)
    const { lat } = crecimiento(original, paddedBbox(original))

    expect(lat).toBeCloseTo(FRAME_PADDING_RATIO * largo, 0)
    expect(lat).toBeGreaterThan(FRAME_PADDING_MIN_M)
    expect(lat).toBeLessThan(FRAME_PADDING_MAX_M)
  })

  it("holds the floor for a lote too small to gain context from a share", () => {
    // 0.001° is about 110 m; 12% of that is 13 m, which shows the neighbours
    // nothing.
    const { lat } = crecimiento(marco(0.001, 0.001), paddedBbox(marco(0.001, 0.001)))
    expect(lat).toBeCloseTo(FRAME_PADDING_MIN_M, 0)
  })

  it("holds the ceiling for a field that needs no kilometres of filler", () => {
    const { lat } = crecimiento(marco(0.5, 0.3), paddedBbox(marco(0.5, 0.3)))
    expect(lat).toBeCloseTo(FRAME_PADDING_MAX_M, 0)
  })

  it("opens longitude wider in degrees than latitude, by the cosine", () => {
    const original = marco(0.05, 0.02)
    const padded = paddedBbox(original)
    const grados = {
      lon: padded[2] - original[2],
      lat: padded[3] - original[3],
    }

    expect(grados.lon).toBeGreaterThan(grados.lat)
    expect(grados.lon * Math.cos((26 * Math.PI) / 180)).toBeCloseTo(grados.lat, 6)
  })

  it("strictly contains the frame it was given", () => {
    const original = marco(0.05, 0.02)
    const padded = paddedBbox(original)

    expect(padded[0]).toBeLessThan(original[0])
    expect(padded[1]).toBeLessThan(original[1])
    expect(padded[2]).toBeGreaterThan(original[2])
    expect(padded[3]).toBeGreaterThan(original[3])
  })

  it("still frames a lote drawn as a single point", () => {
    const { lat } = crecimiento(marco(0, 0), paddedBbox(marco(0, 0)))
    expect(lat).toBeCloseTo(FRAME_PADDING_MIN_M, 0)
  })

  /** Output pixels, which is what Sentinel Hub bills for. */
  const costo = (m: Marco) => {
    const { width, height } = pixelSize(marcoABbox(m))
    return width * height
  }

  it("costs a square lote nothing: the long side is pinned either way", () => {
    const cuadrado = marco(0.02 / Math.cos((26 * Math.PI) / 180), 0.02)
    expect(costo(paddedBbox(cuadrado))).toBe(costo(cuadrado))
  })

  it("costs an elongated lote something, because the frame squares up", () => {
    // pixelSize pins the long side at RASTER_LONG_SIDE and derives the short
    // one from the aspect. Uniform padding moves a 2:1 box towards 1:1, so the
    // short side — and only the short side — grows. Pinned so a future change
    // to the padding cannot quietly multiply the Copernicus bill.
    const alargado = marco(0.05, 0.02)
    const factor = costo(paddedBbox(alargado)) / costo(alargado)

    expect(factor).toBeGreaterThan(1)
    expect(factor).toBeLessThan(1.5)
  })

  it("makes a sliver cheaper, by lifting it off the short-side floor", () => {
    // A 10:1 strip is scaled up on both sides today to clear
    // RASTER_MIN_SHORT_SIDE. Padding moderates the aspect enough that the floor
    // stops binding, so the frame with more ground in it costs roughly half.
    const sliver = marco(0.1, 0.01)
    expect(costo(paddedBbox(sliver))).toBeLessThan(costo(sliver))
  })
})
