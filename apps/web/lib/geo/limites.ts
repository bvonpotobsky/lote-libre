/**
 * The provincial outline layer: a reference grid under the lotes, so a producer
 * can tell at a glance whether the shape on screen sits in Chaco or in Santiago
 * del Estero. The outline alone answers that for anyone who already knows the
 * silhouette; the label layers at the bottom of this file answer it for the rest.
 *
 * Deliberately a static file and not a service call. The map's style is inline
 * precisely so the app owns no API key and depends on no vector-tile vendor
 * (see `mapa-maplibre.tsx`); fetching boundaries from one would hand that
 * dependency back for a line drawing that never changes.
 *
 * Provenance: IGN (Instituto Geográfico Nacional), layer `ign:provincia`, via
 * its public WFS at `wms.ign.gob.ar/geoserver/ows`. The raw response is 112 MB
 * of survey-grade coordinates. What ships here was clipped to the continental
 * envelope, reduced to the `nombre` field, simplified with Visvalingam at 1%
 * and rounded to ~110 m — invisible at the zoom levels where a provincial
 * border is ever on screen, and two orders of magnitude smaller.
 *
 * To regenerate after an IGN update:
 *   curl -o crudo.json 'https://wms.ign.gob.ar/geoserver/ows?service=WFS&version=2.0.0&request=GetFeature&typeNames=ign:provincia&outputFormat=application/json&srsName=EPSG:4326'
 *   npx mapshaper crudo.json -clip bbox=-74,-56,-53,-21 -filter-fields nam \
 *     -rename-fields nombre=nam -simplify visvalingam 1% keep-shapes \
 *     -o precision=0.001 format=geojson provincias.json
 *
 * `limites.test.ts` pins the result, so a regeneration that flips coordinates,
 * drops a province or forgets to simplify fails the suite instead of the map.
 */

/** Where the asset lives, relative to `public/`. */
export const LIMITES_URL = "/geo/provincias.json"

export const FUENTE_LIMITES = "limites"
export const CAPA_LIMITES = "limites-borde"

/**
 * The same idea one level down: IGN layer `ign:departamento`, 529 features,
 * 141 MB raw, shipped at 392 kB — 92 kB over the wire once compressed.
 *
 * Simplified harder than the provinces (0.5% against 1%) for a reason that is
 * about use, not about bytes: a department border is only ever read at the zoom
 * where a producer is already looking at one region, and at that scale the
 * discarded vertices are sub-pixel. The clip drops exactly one feature,
 * `Antártida Argentina`.
 *
 * Departments keep a second field, `codigo` — the INDEC code, whose first two
 * digits are the province. That is the field a legality dossier needs to say
 * where a lote sits, so it is worth the few bytes it costs.
 *
 *   curl -o crudo.json 'https://wms.ign.gob.ar/geoserver/ows?service=WFS&version=2.0.0&request=GetFeature&typeNames=ign:departamento&outputFormat=application/json&srsName=EPSG:4326'
 *   npx mapshaper crudo.json -clip bbox=-74,-56,-53,-21 -filter-fields nam,in1 \
 *     -rename-fields nombre=nam,codigo=in1 -simplify visvalingam 0.5% keep-shapes \
 *     -o precision=0.001 format=geojson departamentos.json
 */
export const DEPARTAMENTOS_URL = "/geo/departamentos.json"

export const FUENTE_DEPARTAMENTOS = "departamentos"
export const CAPA_DEPARTAMENTOS = "departamentos-borde"

/**
 * `--color-field` from globals.css — not `--color-paper`.
 *
 * Paper already carries a meaning on this map: it is `NO_VERDICT_COLOR`, the
 * colour of a lote nobody has checked. A provincial border drawn in it would be
 * making a claim it has no business making. Field is the neighbouring token,
 * cool enough to sit under satellite imagery and quiet enough to stay in the background.
 */
export const COLOR_LIMITE = "#eff1ec"

/**
 * Dashed and hairline-thin, against the lotes' solid 3px.
 *
 * This is the cartographic convention for an administrative boundary, and here
 * it does a second job: nothing about this line can be mistaken for the outline
 * of a field, which is the only geometry on this map that means anything legal.
 */
export const ANCHO_LIMITE = 1
export const GUION_LIMITE = [2, 2]
export const OPACIDAD_LIMITE = 0.45

/**
 * Departments in the same ink, one step quieter: the dashes are sparser and the
 * line fainter, so the two layers read as a hierarchy rather than as a mesh.
 *
 * Where a department border coincides with a provincial one — and along every
 * province they do — the two draw on top of each other. That is not a defect to
 * clean up: the province is painted last and stronger, so the shared edge comes
 * out heavier than an internal department line, which is exactly what it is.
 */
export const ANCHO_DEPARTAMENTO = 1
export const GUION_DEPARTAMENTO = [1, 3]
export const OPACIDAD_DEPARTAMENTO = 0.35

/**
 * Below this, departments are not drawn at all.
 *
 * 528 of them across the country at zoom 5 is a mesh, not a reference: it buries
 * the lotes under the very grid meant to locate them. Zoom 7 is roughly "one
 * region on screen", which is the first point where knowing the department is
 * worth anything.
 *
 * Note this bounds the drawing, not the download — MapLibre fetches a GeoJSON
 * source when the layer is added, whatever its minzoom. At 92 kB compressed,
 * less than a single satellite tile, that is a fine trade for not having to
 * write and test a deferred-loading path.
 */
export const ZOOM_MINIMO_DEPARTAMENTO = 7

/**
 * Where the font lives, and which font it is.
 *
 * MapLibre draws no text at all without `glyphs` in the style, so labelling the
 * boundaries means the map needs a font — which is the one thing the inline
 * style was built to avoid. It avoids a *vendor*, though, not a file: this
 * fontstack is a static asset of this app, served from `public/` exactly like
 * the two GeoJSONs above. No API key, no glyph service, nothing to go down.
 *
 * Only the 0-255 range ships. Every character across all 552 names — `° á Á é í
 * ñ Ñ ó ú ü` — is Latin-1, uppercased included (Á U+00C1, Ñ U+00D1), so the
 * remaining 255 ranges would be 1.2 MB of dead weight. `limites.test.ts` pins
 * that assumption, because a name arriving from IGN with a character outside
 * this range renders as an empty box in silence.
 *
 * Medium rather than Regular: this sits on satellite imagery, where a thin stem
 * loses its contrast even inside a halo.
 *
 * To regenerate:
 *   curl -sLo Archivo-Medium.ttf \
 *     'https://github.com/Omnibus-Type/Archivo/raw/HEAD/fonts/ttf/Archivo-Medium.ttf'
 *   npx --package fontnik build-glyphs Archivo-Medium.ttf ./glifos
 *   cp ./glifos/0-255.pbf apps/web/public/geo/glifos/Archivo-Medium/
 *
 * The stack name carries no space on purpose: `{fontstack}` is interpolated
 * straight into the URL, and a `%20` is free friction against static serving
 * and against the proxy matcher. It must match the directory name exactly.
 */
export const GLIFOS_URL = "/geo/glifos/{fontstack}/{range}.pbf"

/** The font, and the one-element stack MapLibre wants it wrapped in. */
export const TIPOGRAFIA_NOMBRES = "Archivo-Medium"
export const PILA_TIPOGRAFICA = [TIPOGRAFIA_NOMBRES]

/**
 * One point per jurisdiction, and the reason the labels do not sit on the
 * polygons that already loaded.
 *
 * MapLibre anchors a symbol per *polygon*, not per feature. Twelve of these
 * jurisdictions are MultiPolygons — Buenos Aires holds 36 rings, Tierra del
 * Fuego 64, Corrientes 13 — so labelling the boundary sources directly printed
 * CORRIENTES twice on screen and would have scattered BUENOS AIRES across the
 * Delta islands. Pre-computing the anchor is the fix: `-points inner` puts one
 * well inside the largest ring, which is where a name belongs anyway.
 *
 * Cheap enough not to think about: 634 bytes and 10 kB over the wire. It also
 * spares the renderer from deriving anchors out of 528 simplified polygons on
 * every tile.
 *
 *   npx mapshaper provincias.json -points inner \
 *     -o precision=0.001 format=geojson provincias-anclas.json
 *   npx mapshaper departamentos.json -points inner \
 *     -o precision=0.001 format=geojson departamentos-anclas.json
 *
 * Regenerate these whenever the polygons are regenerated — `limites.test.ts`
 * checks the counts and names still line up, so a stale pair fails the suite.
 */
export const ANCLAS_LIMITES_URL = "/geo/provincias-anclas.json"
export const ANCLAS_DEPARTAMENTOS_URL = "/geo/departamentos-anclas.json"

export const FUENTE_ANCLAS_LIMITES = "limites-anclas"
export const FUENTE_ANCLAS_DEPARTAMENTOS = "departamentos-anclas"

export const CAPA_NOMBRES_LIMITES = "limites-nombre"
export const CAPA_NOMBRES_DEPARTAMENTOS = "departamentos-nombre"

/**
 * Light type in a dark halo, not the other way round.
 *
 * The basemap is satellite imagery, and its luminance runs from bright tilled
 * soil to near-black monte within a single screen. A dark halo holds the letter
 * shapes over both; dark type on a light halo disappears the moment a name
 * crosses cloud or bare ground.
 *
 * The ink is `COLOR_LIMITE` — the same token as the lines, because a name and
 * the border it names are one object, not two. `COLOR_HALO` restates
 * `--color-ink` by hand for the reason given in `map-style.ts`: paint
 * properties resolve on the GPU and cannot read a CSS custom property.
 */
export const COLOR_HALO = "#000000"
export const ANCHO_HALO = 1.2
export const DIFUMINADO_HALO = 0.4

/**
 * Zoom stops as `[zoom, value]` pairs, fed to `porZoom` below.
 *
 * Provinces fade out between 8 and 10; departments begin at 7. The two overlap
 * on purpose in that band, and where they collide the province wins: MapLibre
 * places symbols from the top of the layer list down, so the layer added last
 * is placed first and keeps the space. The province layer is added after the
 * department one for exactly that reason — the same hierarchy the two line
 * layers already carry, arbitrated the same way.
 *
 * Provinces are also set in caps with wide tracking, against the departments'
 * sentence case.
 */
export const TAMANIO_NOMBRE_LIMITE: readonly [number, number][] = [
  [4, 10],
  [8, 14],
]
export const OPACIDAD_NOMBRE_LIMITE: readonly [number, number][] = [
  [4, 0],
  [4.5, 1],
  [8, 1],
  [10, 0],
]
export const ESPACIADO_NOMBRE_LIMITE = 0.15
export const ANCHO_MAXIMO_NOMBRE_LIMITE = 7

/**
 * Above this the province layer stops being placed at all, not merely drawn.
 *
 * `OPACIDAD_NOMBRE_LIMITE` already reaches 0 here, so the cut is invisible — but
 * the two are not interchangeable. Opacity is read once, at draw time; the
 * placement pass never looks at it, and gates only on `minzoom`/`maxzoom`
 * (`pauseable_placement`). Without this, a fully transparent SANTIAGO DEL ESTERO
 * goes on holding a couple of hundred pixels of collision space at every zoom
 * above 10, deleting the department name underneath it — at precisely the zoom
 * where the department is the name worth having.
 */
export const ZOOM_MAXIMO_NOMBRE_LIMITE = 10

export const TAMANIO_NOMBRE_DEPARTAMENTO: readonly [number, number][] = [
  [7, 9],
  [11, 12],
]
export const OPACIDAD_NOMBRE_DEPARTAMENTO: readonly [number, number][] = [
  [7, 0],
  [8, 0.8],
]
export const ESPACIADO_NOMBRE_DEPARTAMENTO = 0.05
export const ANCHO_MAXIMO_NOMBRE_DEPARTAMENTO = 8

/**
 * Names shortened on screen only — the assets and their tests keep the official
 * strings.
 *
 * Tierra del Fuego is not a preference: the asset was clipped to the continental
 * envelope, so the Antarctic and South Atlantic portions of that jurisdiction
 * are not drawn at all. Printing their names over a shape that excludes them
 * would label the map with something it is not showing.
 *
 * CABA is the ordinary cartographic call. At the zooms where provinces are up,
 * the jurisdiction is a few pixels wide and its full name is longer than the
 * province it points at.
 *
 * `limites.test.ts` checks these keys still exist in the asset, so an IGN rename
 * surfaces as a failure rather than as the long name quietly coming back.
 */
export const NOMBRES_CORTOS: Record<string, string> = {
  "Tierra del Fuego, Antártida e Islas del Atlántico Sur": "Tierra del Fuego",
  "Ciudad Autónoma de Buenos Aires": "CABA",
}

/** A MapLibre `interpolate` expression over zoom, built from `[zoom, value]` pairs. */
export const porZoom = (paradas: readonly [number, number][]) => [
  "interpolate",
  ["linear"],
  ["zoom"],
  ...paradas.flat(),
]

/**
 * The label text: `nombre`, with the handful of names in `NOMBRES_CORTOS`
 * swapped out.
 *
 * Built from the record rather than restating the pairs, so the two cannot
 * drift — the same reason `verdictColorExpression` is built from
 * `VERDICT_COLOR`. The trailing element is the `match` fallback: any name not
 * listed passes through untouched.
 */
export const campoDeNombre = () => [
  "match",
  ["get", "nombre"],
  ...Object.entries(NOMBRES_CORTOS).flat(),
  ["get", "nombre"],
]
