import type { Bbox } from "./metrics"

/** Pixels on the longer side of an ordinary lote. */
export const RASTER_LONG_SIDE = 512
/** Below this a sliver is too coarse to read a clearing edge. */
export const RASTER_MIN_SHORT_SIDE = 128
/** Sentinel Hub charges by pixel count; this is the ceiling we will pay for. */
export const RASTER_MAX_LONG_SIDE = 2048

/**
 * Bounding box width over height, measured in metres rather than degrees.
 *
 * A degree of longitude is a degree of latitude times the cosine of the
 * latitude, so at 26° south a box that is square in degrees is about 100 km
 * across and 111 km tall. Asking for a square raster of a box like that hands
 * Sentinel Hub a pixel grid the ground does not match, and it stretches the
 * image to fit.
 */
export function metricAspect(box: Bbox): number {
  const spanLat = box.maxLat - box.minLat
  const spanLon = box.maxLon - box.minLon
  if (spanLat <= 0 || spanLon <= 0) return 1

  const midLat = ((box.minLat + box.maxLat) / 2) * (Math.PI / 180)
  return (spanLon * Math.cos(midLat)) / spanLat
}

/**
 * The raster dimensions that show a lote in its own shape.
 *
 * The long side sets the resolution. A very elongated lote is then scaled up
 * rather than left flat — both sides together, so the shape survives — because
 * a 1280x128 strip carries more usable detail than a 512x512 square of the same
 * field and costs less than half as many processing units. The long-side cap is
 * the hard limit and wins over the short-side floor when they disagree, which
 * only happens past about 16:1.
 */
export function pixelSize(box: Bbox): { width: number; height: number } {
  const aspect = metricAspect(box)

  let width = aspect >= 1 ? RASTER_LONG_SIDE : RASTER_LONG_SIDE * aspect
  let height = aspect >= 1 ? RASTER_LONG_SIDE / aspect : RASTER_LONG_SIDE

  const short = Math.min(width, height)
  if (short < RASTER_MIN_SHORT_SIDE) {
    const scale = RASTER_MIN_SHORT_SIDE / short
    width *= scale
    height *= scale
  }

  const long = Math.max(width, height)
  if (long > RASTER_MAX_LONG_SIDE) {
    const scale = RASTER_MAX_LONG_SIDE / long
    width *= scale
    height *= scale
  }

  return {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
  }
}
