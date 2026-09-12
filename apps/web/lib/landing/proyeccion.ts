/**
 * The frame every landing figure shares.
 *
 * The projection itself lives in @/lib/geo/proyeccion, where the lote
 * comparador reads it too; what is landing-specific is this one window over the
 * Chaco and the viewBox baked against it. They are re-exported here so the
 * figures keep importing a single module.
 */
import type { Marco, Vista } from "@/lib/geo/proyeccion"

export type { Marco, Marco as Bbox, Punto, Vista } from "@/lib/geo/proyeccion"
export {
  aLonLat,
  aPixel,
  anilloAPath,
  geometriaAPath,
} from "@/lib/geo/proyeccion"

export const VISTA: Vista = { ancho: 1440, alto: 1080 }

/**
 * Dpto. Pellegrini, Santiago del Estero. Centred on the seed lote in
 * lib/db/seed.ts, 0.072° tall, widened so the equirectangular aspect matches
 * VISTA. Roughly 10.7 × 8.0 km.
 */
export const MARCO: Marco = [-64.042873, -25.88753, -63.936197, -25.81553]

/** Ring of the seed lote, closed, as it appears in lib/db/seed.ts. */
export const ANILLO_LOTE: readonly (readonly [number, number])[] = [
  [-64.00069, -25.86162],
  [-63.97838, -25.86162],
  [-63.97838, -25.84144],
  [-64.00069, -25.84144],
  [-64.00069, -25.86162],
]
