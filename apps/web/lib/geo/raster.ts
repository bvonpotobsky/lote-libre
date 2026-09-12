import type { Marco } from "./proyeccion"
import type { Bbox } from "./metrics"

/** Pixels on the longer side of an ordinary lote. */
export const RASTER_LONG_SIDE = 512
/** Below this a sliver is too coarse to read a clearing edge. */
export const RASTER_MIN_SHORT_SIDE = 128
/** Sentinel Hub charges by pixel count; this is the ceiling we will pay for. */
export const RASTER_MAX_LONG_SIDE = 2048

/** Close enough anywhere a lote is drawn; the ellipsoid varies by ~0.6%. */
export const METRES_PER_DEGREE_LAT = 111_320

/** How much neighbouring country enters the frame, as a share of the long side. */
export const FRAME_PADDING_RATIO = 0.12
/** Floor: 12% of a smallholding is a few metres, which shows the neighbours nothing. */
export const FRAME_PADDING_MIN_M = 200
/** Ceiling: a huge field does not need kilometres of filler around it. */
export const FRAME_PADDING_MAX_M = 1000

/** The corner tuple Turf and Sentinel Hub speak, as the named fields read here. */
export function marcoABbox(marco: Marco): Bbox {
  const [minLon, minLat, maxLon, maxLat] = marco
  return { minLon, minLat, maxLon, maxLat }
}

/**
 * The lote's own box opened up to let the neighbouring country in.
 *
 * A raster cut to the polygon answers "what does my field look like" and
 * nothing else, but the judgement the legend asks for — monte is mottled and
 * uneven, clearing leaves straight strips and a flat colour — is comparative.
 * Without the fields next door there is no scale to read the texture against,
 * and no landmark to confirm that the two halves of the wipe are the same
 * ground.
 *
 * The padding is metric and equal on all four sides. Padding each axis by a
 * share of its own span would hand an elongated lote a wide band along its long
 * side and a hairline along its short one, which reads as a framing mistake.
 *
 * It is close to free: `pixelSize` reads the aspect, not the size, so a frame
 * of nearly the same aspect asks Sentinel Hub for nearly the same pixel count.
 * What it spends is ground resolution, and at 512 px over a field of any normal
 * size the raster already oversamples Sentinel-2's native 10 m.
 */
export function paddedBbox(marco: Marco): Marco {
  const [minLon, minLat, maxLon, maxLat] = marco

  const midLat = ((minLat + maxLat) / 2) * (Math.PI / 180)
  // Guards the division below; no lote is drawn anywhere near a pole.
  const coseno = Math.max(Math.cos(midLat), 0.01)

  const altoM = (maxLat - minLat) * METRES_PER_DEGREE_LAT
  const anchoM = (maxLon - minLon) * METRES_PER_DEGREE_LAT * coseno
  const largoM = Math.max(altoM, anchoM)

  const padM = Math.min(
    Math.max(FRAME_PADDING_RATIO * largoM, FRAME_PADDING_MIN_M),
    FRAME_PADDING_MAX_M,
  )

  const padLat = padM / METRES_PER_DEGREE_LAT
  const padLon = padLat / coseno

  return [minLon - padLon, minLat - padLat, maxLon + padLon, maxLat + padLat]
}

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
