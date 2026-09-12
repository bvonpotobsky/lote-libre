/**
 * The one projection the rasters and the SVG vectors share.
 *
 * A frame is a plain equirectangular window: longitude maps linearly to x,
 * latitude linearly to y. The very same numbers go to Sentinel Hub as
 * `bounds.bbox` with `output.width/height` equal to the viewBox, so the raster
 * and the vectors drawn over it register pixel for pixel without a second
 * coordinate system in between. DESIGN.md calls this "La Regla de una Sola
 * Proyección"; it governs the landing figures and the lote comparador alike.
 *
 * The cosine of the latitude belongs to `metricAspect` in ./raster, which
 * decides how many pixels to ask for. It has no place here: once the frame and
 * the grid are fixed, the mapping between them is linear in degrees.
 *
 * `Marco` is the corner tuple a bbox arrives in from Turf and leaves in towards
 * Sentinel Hub. It is deliberately not the named-field `Bbox` of ./metrics,
 * which is the shape `metricAspect` and `pixelSize` read.
 */
import type { MultiPolygon, Polygon } from "geojson"

export type Marco = readonly [
  minLon: number,
  minLat: number,
  maxLon: number,
  maxLat: number,
]
export type Punto = readonly [lon: number, lat: number]
export type Vista = { readonly ancho: number; readonly alto: number }

/** lon/lat → viewBox px. x grows east, y grows SOUTH (SVG convention). */
export function aPixel(
  marco: Marco,
  vista: Vista,
  punto: Punto
): readonly [number, number] {
  const [minLon, minLat, maxLon, maxLat] = marco
  const [lon, lat] = punto
  const x = ((lon - minLon) / (maxLon - minLon)) * vista.ancho
  const y = ((maxLat - lat) / (maxLat - minLat)) * vista.alto
  return [x, y]
}

/**
 * The centre of raster pixel (columna, fila) in lon/lat.
 *
 * The inverse of `aPixel`, offset by half a pixel: a pixel covers a cell, and
 * asking whether it belongs to a lote is a question about the middle of that
 * cell rather than about its north-west corner, which sits on the boundary.
 */
export function aLonLat(
  marco: Marco,
  vista: Vista,
  columna: number,
  fila: number
): Punto {
  const [minLon, minLat, maxLon, maxLat] = marco
  const lon = minLon + ((columna + 0.5) / vista.ancho) * (maxLon - minLon)
  const lat = maxLat - ((fila + 0.5) / vista.alto) * (maxLat - minLat)
  return [lon, lat]
}

function redondear(valor: number, decimales: number): string {
  return valor.toFixed(decimales)
}

/** Closed ring → "M… L… Z". The closing point is left to Z. */
export function anilloAPath(
  marco: Marco,
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
  marco: Marco,
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
