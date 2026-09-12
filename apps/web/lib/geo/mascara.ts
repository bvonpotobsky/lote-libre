import booleanPointInPolygon from "@turf/boolean-point-in-polygon"
import turfBbox from "@turf/bbox"

import type { Encuadre } from "./encuadre"
import { aLonLat, aPixel } from "./proyeccion"

export type Mascara = {
  readonly ancho: number
  readonly alto: number
  /** Whether the centre of this pixel falls on the lote. */
  dentro(columna: number, fila: number): boolean
}

/**
 * Which pixels of a frame belong to the lote rather than to its neighbours.
 *
 * Once the raster carries the country around the lote, "how much of the image
 * came back unclouded" and "how much of the LOTE came back unclouded" are
 * different numbers, and only the second one is the claim the UI makes. This is
 * what separates them.
 *
 * It is also more honest than what it replaces. The old reading divided the
 * opaque share of a clipped raster by the polygon's share of its own bounding
 * box — an estimate that assumed the mask and the shape agreed. This asks the
 * polygon directly, pixel by pixel.
 *
 * The lote's own box is projected once so the ~60% of a padded frame that lies
 * outside it is rejected by two comparisons instead of a ray cast.
 */
export function mascaraDeLote(
  { marco, vista }: Encuadre,
  geometria: GeoJSON.Polygon | GeoJSON.MultiPolygon,
): Mascara {
  const [minLon, minLat, maxLon, maxLat] = turfBbox(geometria)
  const [x0, y1] = aPixel(marco, vista, [minLon!, minLat!])
  const [x1, y0] = aPixel(marco, vista, [maxLon!, maxLat!])

  return {
    ancho: vista.ancho,
    alto: vista.alto,
    dentro(columna, fila) {
      if (columna < 0 || fila < 0) return false
      if (columna >= vista.ancho || fila >= vista.alto) return false

      const x = columna + 0.5
      const y = fila + 0.5
      if (x < x0 || x > x1 || y < y0 || y > y1) return false

      return booleanPointInPolygon(
        aLonLat(marco, vista, columna, fila) as [number, number],
        geometria,
      )
    },
  }
}
