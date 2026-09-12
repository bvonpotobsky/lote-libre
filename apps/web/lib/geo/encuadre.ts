import turfBbox from "@turf/bbox"

import { type Marco, type Vista, geometriaAPath } from "./proyeccion"
import { marcoABbox, paddedBbox, pixelSize } from "./raster"

export type Encuadre = {
  /** The box Copernicus is asked for, in WGS84 lon/lat order. */
  marco: Marco
  /** The pixel grid that box is rendered onto, and the SVG viewBox over it. */
  vista: Vista
}

/**
 * The frame a lote is photographed in.
 *
 * Called on the server by `getLoteImage` to build the Sentinel Hub request, and
 * on the client by the comparador to build the outline drawn over the result.
 * That shared call is the whole guarantee: the same box and the same integers
 * on both sides is what makes the outline land on the lote instead of near it.
 * DESIGN.md calls this "La Regla de una Sola Proyección".
 *
 * Do not send the frame over the wire alongside the image. A second copy is a
 * second thing that can disagree with the box Copernicus was actually billed
 * for; deriving it twice from the geometry cannot.
 *
 * `turfBbox` reads the geometry directly, so a MultiPolygon is measured as a
 * MultiPolygon rather than cast to a Polygon's coordinate depth.
 */
export function encuadreDeLote(
  geometria: GeoJSON.Polygon | GeoJSON.MultiPolygon,
): Encuadre {
  const [minLon, minLat, maxLon, maxLat] = turfBbox(geometria)
  const marco = paddedBbox([minLon!, minLat!, maxLon!, maxLat!])
  const { width, height } = pixelSize(marcoABbox(marco))

  return { marco, vista: { ancho: width, alto: height } }
}

/** The lote's own edge inside that frame, as one SVG path. */
export function contornoDeLote(
  { marco, vista }: Encuadre,
  geometria: GeoJSON.Polygon | GeoJSON.MultiPolygon,
): string {
  return geometriaAPath(marco, vista, geometria)
}
