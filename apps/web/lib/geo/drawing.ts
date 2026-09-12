/**
 * The decisions the map makes while someone is drawing, as pure functions.
 *
 * Runtime-free on purpose, exactly like map-style.ts: no maplibre, no terra-draw,
 * no node built-ins. That is what lets the trickiest rules in the component —
 * which polygon is on screen, and when an incoming prop is merely our own edit
 * coming back — be tested under the node-only vitest config, instead of being
 * untestable wiring inside a WebGL component.
 */

import type { MapLote } from "./map-style"

export type ModoMapa = "ver" | "dibujar" | "editar"

/**
 * What the app's own source is allowed to paint.
 *
 * While Terra Draw holds a polygon it renders that polygon itself, so leaving
 * it in the app's source too would paint the same field twice, in two different
 * styles, one of them not following the drag. One owner at a time is the whole
 * rule.
 */
export function lotesVisibles(
  lotes: MapLote[],
  ocultarId: string | null
): MapLote[] {
  if (ocultarId === null) return lotes
  return lotes.filter((lote) => lote.id !== ocultarId)
}

/**
 * A stable string for one polygon's coordinates.
 *
 * Used to recognise our own edit arriving back as a prop. The parent stores
 * whatever the map reports and feeds it straight back through `lotes`; without
 * this check the component would answer that by re-loading the feature into
 * Terra Draw mid-drag, which either duplicates the polygon or snaps it back to
 * where the pointer no longer is.
 */
export function firmaDeGeometria(geometry: GeoJSON.Polygon): string {
  return JSON.stringify(geometry.coordinates)
}

/**
 * A lote in the shape Terra Draw's store accepts.
 *
 * `properties.mode` is mandatory and easy to miss: without it `addFeatures`
 * rejects the feature with "Mode property does not exist" — and it reports that
 * in its return value rather than throwing, so the polygon simply never appears
 * and nothing is logged.
 */
export function aFeatureDeDibujo(lote: MapLote): {
  type: "Feature"
  geometry: GeoJSON.Polygon
  properties: { mode: string }
} {
  return {
    type: "Feature",
    geometry: lote.geometry,
    properties: { mode: "polygon" },
  }
}
