/**
 * The provincial outline layer: a reference grid under the lotes, so a producer
 * can tell at a glance whether the shape on screen sits in Chaco or in Santiago
 * del Estero without reading a single label.
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
