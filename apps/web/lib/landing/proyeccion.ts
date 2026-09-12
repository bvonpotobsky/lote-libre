/**
 * The one projection every landing figure shares.
 *
 * The example frame is a plain equirectangular window: longitude maps
 * linearly to x, latitude linearly to y, and the aspect is corrected once by
 * cos(latitude) so a kilometre reads the same in both directions. The same
 * MARCO literal goes to Sentinel Hub as `bounds.bbox` with
 * `output.width/height = VISTA`, which is exactly the mapping this module
 * computes — so the raster and the SVG vectors register pixel for pixel
 * without a second coordinate system in between.
 */
import type { MultiPolygon, Polygon } from "geojson"

export type Bbox = readonly [
  minLon: number,
  minLat: number,
  maxLon: number,
  maxLat: number,
]
export type Punto = readonly [lon: number, lat: number]
export type Vista = { readonly ancho: number; readonly alto: number }

export const VISTA: Vista = { ancho: 1440, alto: 1080 }

/**
 * Dpto. Pellegrini, Santiago del Estero. Centred on the seed lote in
 * lib/db/seed.ts, 0.072° tall, widened so the equirectangular aspect matches
 * VISTA. Roughly 10.7 × 8.0 km.
 */
export const MARCO: Bbox = [-64.042873, -25.88753, -63.936197, -25.81553]

/** Ring of the seed lote, closed, as it appears in lib/db/seed.ts. */
export const ANILLO_LOTE: readonly Punto[] = [
  [-64.00069, -25.86162],
  [-63.97838, -25.86162],
  [-63.97838, -25.84144],
  [-64.00069, -25.84144],
  [-64.00069, -25.86162],
]

const RADIANES = Math.PI / 180

/** (Δlon · cos(latMedia)) / Δlat — the equirectangular aspect of a bbox. */
export function relacionDeAspecto(marco: Bbox): number {
  const [minLon, minLat, maxLon, maxLat] = marco
  const latMedia = (minLat + maxLat) / 2
  return ((maxLon - minLon) * Math.cos(latMedia * RADIANES)) / (maxLat - minLat)
}

/** lon/lat → viewBox px. x grows east, y grows SOUTH (SVG convention). */
export function aPixel(
  marco: Bbox,
  vista: Vista,
  punto: Punto
): readonly [number, number] {
  const [minLon, minLat, maxLon, maxLat] = marco
  const [lon, lat] = punto
  const x = ((lon - minLon) / (maxLon - minLon)) * vista.ancho
  const y = ((maxLat - lat) / (maxLat - minLat)) * vista.alto
  return [x, y]
}

function redondear(valor: number, decimales: number): string {
  return valor.toFixed(decimales)
}

/** Closed ring → "M… L… Z". The closing point is left to Z. */
export function anilloAPath(
  marco: Bbox,
  vista: Vista,
  anillo: readonly Punto[],
  decimales = 1
): string {
  const puntos = cerrado(anillo) ? anillo.slice(0, -1) : anillo
  const partes = puntos.map((punto, i) => {
    const [x, y] = aPixel(marco, vista, punto)
    return `${i === 0 ? "M" : "L"}${redondear(x, decimales)} ${redondear(y, decimales)}`
  })
  return `${partes.join("")}Z`
}

/** Polygon/MultiPolygon → one "d" with a subpath per ring (nonzero fill handles holes). */
export function geometriaAPath(
  marco: Bbox,
  vista: Vista,
  geometria: Polygon | MultiPolygon,
  decimales = 1
): string {
  const poligonos =
    geometria.type === "Polygon"
      ? [geometria.coordinates]
      : geometria.coordinates
  return poligonos
    .flatMap((anillos) => anillos)
    .map((anillo) =>
      anilloAPath(
        marco,
        vista,
        anillo.map(([lon, lat]) => [lon!, lat!] as const),
        decimales
      )
    )
    .join("")
}

function cerrado(anillo: readonly Punto[]): boolean {
  if (anillo.length < 2) return false
  const primero = anillo[0]!
  const ultimo = anillo[anillo.length - 1]!
  return primero[0] === ultimo[0] && primero[1] === ultimo[1]
}
