import { PNG } from "pngjs"

export type PngCoverage = {
  width: number
  height: number
  /** Share of pixels with a non-zero alpha channel, 0-1. */
  opaqueRatio: number
}

/**
 * Sentinel Hub answers 200 with a fully transparent PNG when nothing in the
 * requested range clears its cloud filter. There is no error to catch — the
 * only evidence is the alpha channel.
 */
export function measureCoverage(buffer: Buffer): PngCoverage {
  const png = PNG.sync.read(buffer)

  let opaque = 0
  for (let index = 3; index < png.data.length; index += 4) {
    if (png.data[index]! > 0) opaque += 1
  }

  const total = png.width * png.height
  return {
    width: png.width,
    height: png.height,
    opaqueRatio: total === 0 ? 0 : opaque / total,
  }
}

/**
 * Whether the returned image carries no usable imagery.
 *
 * Raw opacity is not the test. The raster covers the polygon's bounding box and
 * masks everything outside the polygon, so a perfectly good image of an
 * L-shaped lote is mostly transparent by design. What matters is how the actual
 * coverage compares to the coverage that shape should produce.
 *
 * @param expectedRatio polygon area divided by its bounding box area, 0-1.
 */
export function isEffectivelyEmpty(
  buffer: Buffer,
  expectedRatio: number,
  tolerance = 0.2,
): boolean {
  let coverage: PngCoverage
  try {
    coverage = measureCoverage(buffer)
  } catch {
    // Undecodable bytes are not an empty image; let the caller surface the
    // transport problem rather than reporting "no clear imagery".
    return false
  }

  if (coverage.opaqueRatio === 0) return true
  return coverage.opaqueRatio < Math.max(expectedRatio, 0.01) * tolerance
}
