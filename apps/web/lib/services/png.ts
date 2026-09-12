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

/** Guards against dividing by a footprint rounded down to nothing. */
const MIN_EXPECTED_RATIO = 0.01

/**
 * How much of the lote itself came back painted, 0-1.
 *
 * Raw opacity is not the measure. The raster covers the polygon's bounding box
 * and masks everything outside the polygon, so a perfectly good image of an
 * L-shaped lote is mostly transparent by design. Dividing by the coverage that
 * shape should produce turns the alpha channel into a statement about the lote.
 *
 * Since the evalscripts leave a pixel transparent when no orbit in the window
 * resolved it, this is a measurement on the Sentinel scene: the share of the
 * field that was actually seen through the clouds. That is a different and
 * stronger claim than the Xweather figure beside it, which is surface weather
 * at the centroid and knows nothing about the image.
 *
 * @param expectedRatio polygon area divided by its bounding box area, 0-1.
 */
export function clearRatio(
  coverage: PngCoverage,
  expectedRatio: number,
): number {
  const expected = Math.max(expectedRatio, MIN_EXPECTED_RATIO)
  return Math.min(1, coverage.opaqueRatio / expected)
}

/** Whether a measured raster carries too little of the lote to be evidence. */
export function isEmptyCoverage(
  coverage: PngCoverage,
  expectedRatio: number,
  tolerance = 0.2,
): boolean {
  if (coverage.opaqueRatio === 0) return true
  return clearRatio(coverage, expectedRatio) < tolerance
}

/**
 * Whether the returned image carries no usable imagery.
 *
 * @param expectedRatio polygon area divided by its bounding box area, 0-1.
 */
export function isEffectivelyEmpty(
  buffer: Buffer,
  expectedRatio: number,
  tolerance = 0.2,
): boolean {
  try {
    return isEmptyCoverage(measureCoverage(buffer), expectedRatio, tolerance)
  } catch {
    // Undecodable bytes are not an empty image; let the caller surface the
    // transport problem rather than reporting "no clear imagery".
    return false
  }
}
