import { PNG } from "pngjs"

import type { Mascara } from "@/lib/geo/mascara"

export type PngCoverage = {
  width: number
  height: number
  /** Pixels the reading covered: the denominator of `opaqueRatio`. */
  measured: number
  /** Share of the measured pixels carrying alpha, 0-1. */
  opaqueRatio: number
}

/**
 * How much of the lote came back painted, 0-1.
 *
 * Sentinel Hub answers 200 with a fully transparent PNG when nothing in the
 * requested range clears its cloud filter, and the evalscripts leave a single
 * pixel transparent when no orbit in the window resolved it. There is no error
 * to catch — the only evidence is the alpha channel.
 *
 * @param mask restricts the reading to the lote's own pixels. The raster frames
 * the lote together with the country around it, so without this the number
 * would be about the picture rather than about the field, and `clearLine`
 * promises the field: "Imagen limpia en el N % del lote". That is a measurement
 * on the Sentinel scene, and a different and stronger claim than the Xweather
 * figure beside it, which is surface weather at the centroid and knows nothing
 * about the image. Omit it to read the whole frame, which is what the landing
 * bake wants.
 *
 * @throws if the mask was cut for a raster of another size. Publishing a
 * misaligned percentage as evidence is worse than failing: the route's catch
 * turns this into SENTINEL_UNAVAILABLE, which says what is true.
 */
export function measureCoverage(buffer: Buffer, mask?: Mascara): PngCoverage {
  const png = PNG.sync.read(buffer)

  if (mask && (mask.ancho !== png.width || mask.alto !== png.height)) {
    throw new Error(
      `mask is ${mask.ancho}x${mask.alto} but the raster is ${png.width}x${png.height}`,
    )
  }

  let measured = 0
  let opaque = 0

  for (let fila = 0; fila < png.height; fila += 1) {
    for (let columna = 0; columna < png.width; columna += 1) {
      if (mask && !mask.dentro(columna, fila)) continue
      measured += 1
      if (png.data[(fila * png.width + columna) * 4 + 3]! > 0) opaque += 1
    }
  }

  // A polygon too small to cover one pixel centre would otherwise divide by
  // zero and report the lote as entirely clouded. Unreachable given the frame's
  // padding floor, but the fallback costs nothing.
  if (measured === 0) return measureCoverage(buffer)

  return {
    width: png.width,
    height: png.height,
    measured,
    opaqueRatio: opaque / measured,
  }
}

/** Whether a measured raster carries too little of the lote to be evidence. */
export function isEmptyCoverage(
  coverage: PngCoverage,
  tolerance = 0.2,
): boolean {
  return coverage.opaqueRatio < tolerance
}

/** Whether the returned image carries no usable imagery. */
export function isEffectivelyEmpty(
  buffer: Buffer,
  mask?: Mascara,
  tolerance = 0.2,
): boolean {
  try {
    return isEmptyCoverage(measureCoverage(buffer, mask), tolerance)
  } catch (error) {
    // A mask that does not fit the raster is a real fault and must not be
    // swallowed here; undecodable bytes are not an empty image either, and the
    // caller should surface the transport problem instead.
    if (error instanceof Error && error.message.startsWith("mask is")) throw error
    return false
  }
}
