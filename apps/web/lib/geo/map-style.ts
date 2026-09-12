import bbox from "@turf/bbox"
import { featureCollection, polygon as turfPolygon } from "@turf/helpers"

import type { Verdict } from "@/lib/db/schema"

/**
 * What the map needs to know about a lote. Deliberately smaller than `Lote` and
 * wider than `LoteSummary`: the summary omits `geometry` on purpose, because the
 * text list has no use for it and it is the heaviest column in the row.
 */
export type MapLote = {
  id: string
  nombre: string
  geometry: GeoJSON.Polygon
  /** null when the lote has never been verified. */
  verdict: Verdict | null
  areaHa: number
}

/** Every property the click handler and the HTML labels read off a feature. */
export type MapLoteProps = {
  id: string
  nombre: string
  verdict: Verdict | null
  areaHa: number
}

/**
 * A MapLibre paint expression. Typed structurally rather than imported from
 * `maplibre-gl` so this module stays runtime-free and keeps passing under the
 * node test environment — `lib/` has no map engine in it, and should not gain one.
 */
export type ColorExpression = [string, ...unknown[]]

/**
 * The verdict palette, duplicated from `packages/ui/src/styles/globals.css`
 * (`--color-verde`, `--color-amarillo`, `--color-rojo`).
 *
 * The duplication is forced, not sloppy: MapLibre paint properties are resolved
 * on the GPU and cannot read a CSS custom property. If those tokens ever move,
 * these move with them — the test in `map-style.test.ts` pins the exact values so
 * the divergence surfaces as a failure instead of a wrong colour on a map.
 */
export const VERDICT_COLOR: Record<Verdict, string> = {
  verde: "#17663a",
  amarillo: "#e0a106",
  rojo: "#b3161c",
}

/**
 * An unverified lote is drawn in `--color-paper` — the same near-white the lote
 * outline already used under Leaflet, which reads cleanly over satellite imagery
 * at every zoom. It says "no answer yet", not "answer is fine".
 */
export const NO_VERDICT_COLOR = "#fafaf8"

/** The colour a single lote is drawn in. */
export const verdictColor = (verdict: Verdict | null): string =>
  verdict === null ? NO_VERDICT_COLOR : VERDICT_COLOR[verdict]

/**
 * The same decision as `verdictColor`, expressed for the GPU so one layer can
 * paint every lote instead of one layer per lote.
 *
 * Built from `VERDICT_COLOR` rather than restating the hexes, so the two cannot
 * drift. The trailing element is the `match` fallback, which catches both a null
 * verdict and any value a future migration adds before this file learns about it.
 */
export const verdictColorExpression = (): ColorExpression => [
  "match",
  ["get", "verdict"],
  "verde",
  VERDICT_COLOR.verde,
  "amarillo",
  VERDICT_COLOR.amarillo,
  "rojo",
  VERDICT_COLOR.rojo,
  NO_VERDICT_COLOR,
]

/** Every lote as one GeoJSON source, ready to hand to `map.addSource`. */
export const toFeatureCollection = (
  lotes: MapLote[],
): GeoJSON.FeatureCollection<GeoJSON.Polygon, MapLoteProps> => ({
  type: "FeatureCollection",
  features: lotes.map((lote) => ({
    type: "Feature",
    geometry: lote.geometry,
    properties: {
      id: lote.id,
      nombre: lote.nombre,
      verdict: lote.verdict,
      areaHa: lote.areaHa,
    },
  })),
})

/**
 * The bounding box that frames every lote, as `[minLon, minLat, maxLon, maxLat]`
 * — MapLibre's order, which is the opposite of Leaflet's.
 *
 * Returns null for an empty list rather than an empty or infinite box, so the
 * caller keeps whatever default view it had instead of flying to nowhere.
 */
export const boundsOf = (
  lotes: MapLote[],
): [number, number, number, number] | null => {
  if (lotes.length === 0) return null

  const collection = featureCollection(
    lotes.map((lote) => turfPolygon(lote.geometry.coordinates)),
  )
  const [minLon, minLat, maxLon, maxLat] = bbox(collection)

  return [minLon, minLat, maxLon, maxLat]
}
