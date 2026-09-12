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
 * The verdict palette **as painted over satellite imagery**, which is not the
 * same palette the chrome uses. MapLibre paint properties resolve on the GPU and
 * cannot read a CSS custom property, so these hexes have always been restated
 * here; what changed is that one of them is now deliberately a different colour
 * from its token rather than a copy of it.
 *
 * `verde` is the one that diverges. `--color-verde` (#17663a) has a relative
 * luminance of 0.100, and ESRI World Imagery over the Chaco runs from 0.017
 * (closed monte) to 0.457 (tilled soil) — the token sits inside that band and
 * shares the basemap's own hue, so a clean lote scored 1.23:1 against a green
 * field and 1.49:1 against mid forest. It was camouflage, not a weak colour.
 *
 * #49de78 — oklch(0.80 0.19 150) — clears the top of that band: 9.0:1 over
 * monte, 6.0:1 over forest, 3.3:1 over cropland, while staying far from the
 * near-white of the boundary lines and of an unverified lote. It is map-only:
 * white type on it is 1.75:1, so the chip, the list row and the verdict panel
 * keep #17663a, where white type is 7.4:1.
 *
 * `amarillo` and `rojo` keep their tokens. Neither hue occurs in the basemap, so
 * both announce themselves; what they were missing is the casing below, which
 * every polygon now gets.
 *
 * `map-style.test.ts` pins all four values, so a change on either side of the
 * split surfaces as a failure instead of a wrong colour on a map.
 */
export const VERDICT_COLOR: Record<Verdict, string> = {
  verde: "#49de78",
  amarillo: "#e0a106",
  rojo: "#b3161c",
}

/**
 * The dark casing drawn underneath the lote outline, and the reason the outline
 * survives at all.
 *
 * No flat colour can carry an outline over this basemap on its own: every green
 * from oklch L 0.62 to 0.86 bottoms out at 1.27:1 or worse somewhere in the
 * imagery, because the imagery covers the whole luminance ramp. Bright strokes
 * win over monte and lose over tilled soil; dark strokes do the inverse.
 *
 * A casing removes the question. The bright stroke's neighbour stops being
 * unpredictable photography and becomes the casing (12.0:1), and at the other
 * end of the ramp the black casing is 10.1:1 against bare soil. One of the two
 * is always doing the work.
 *
 * This is the same argument `limites.ts` already makes for the province and
 * department labels (see COLOR_HALO there), down to the same numbers — 1.2 px of
 * halo either side of the mark, blurred 0.4 — applied to a line instead of a
 * glyph. It is stated again rather than imported because that module owns
 * administrative boundaries, not lotes.
 */
export const COLOR_CASING_LOTE = "#000000"

/** The verdict-coloured stroke itself. */
export const ANCHO_BORDE_LOTE = 3

/** `ANCHO_BORDE_LOTE` plus 1.2 px of casing on each side. */
export const ANCHO_CASING_LOTE = 5.4

/** Softens the casing's outer edge, exactly as the label halo does. */
export const DIFUMINADO_CASING_LOTE = 0.4

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
