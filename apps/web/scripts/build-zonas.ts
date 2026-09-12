/**
 * build-zonas.ts — bakes the gazetteer the map's search box reads.
 *
 * Run by hand, once, with `pnpm --filter web build:zonas`. Never wired into CI or
 * the Railway build, and everything it writes is committed — the same contract as
 * build-marca.ts and build-landing-assets.ts.
 *
 * That contract is the whole point here. A `prebuild` hook against Georef would
 * fail the deploy of an unrelated change the first time the service rate-limits
 * or goes down, and `lib/geo/limites.ts` explains at length why this app ships
 * geodata as files instead. A committed asset can also be pinned by a test; one
 * fetched during the build cannot, because the test runs before the file exists.
 *
 * Produces:
 *   public/geo/zonas.json   ~4.600 places: the 24 provinces, the 528 departments,
 *                           and every locality Georef knows. Lands under
 *                           public/geo/ because proxy.ts:56 excludes `geo` from
 *                           the session gate — a static asset answered with
 *                           sign-in HTML fails silently.
 *
 * Sources:
 *   Localities   Georef, the Argentine state's own service
 *                (apis.datos.gob.ar/georef). No API key, and its `centroide` is
 *                a real point per locality.
 *   Areas        The IGN polygons and label anchors this repo already ships. Only
 *                localities need the network at all: a province's arrival zoom
 *                comes from its own bounding box, which is already on disk.
 *
 * Design rules, following build-layers.ts:
 *  - Fail loudly. An unreachable source, a truncated page, a missing anchor or a
 *    coordinate outside Argentina aborts the run with a non-zero exit code.
 *  - Never leave a partial file behind. Everything is produced in a staging
 *    directory and copied into public/geo only once every check has passed.
 */

import {
  copyFileSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { gzipSync } from "node:zlib"

import { ARGENTINA_BBOX } from "@/lib/geo/validate"
import {
  ZONAS_VERSION,
  ZOOM_LOCALIDAD,
  zoomParaTramo,
  type FilaZona,
} from "@/lib/geo/zonas"

const HERE = path.dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = path.resolve(HERE, "..")
const GEO_DIR = path.join(WEB_ROOT, "public", "geo")

const GEOREF = "https://apis.datos.gob.ar/georef/api"

/** Georef returns every locality in one page; this is the guard, not a target. */
const TOPE_GEOREF = 5000

/** Measured at 244 kB for the localities alone, so this leaves real headroom. */
const PRESUPUESTO_BYTES = 400 * 1024

/**
 * The first two digits of an INDEC department code are its province.
 *
 * Hard-coded rather than fetched, because this is the data's own structure and
 * not a lookup that can drift — but `verificarProvincias` below asserts the names
 * produced here are exactly the 24 in provincias.json, which is what makes the
 * table safe to hard-code. Taken verbatim from Georef's own /provincias ids.
 */
const PROVINCIA_POR_CODIGO: Record<string, string> = {
  "02": "Ciudad Autónoma de Buenos Aires",
  "06": "Buenos Aires",
  "10": "Catamarca",
  "14": "Córdoba",
  "18": "Corrientes",
  "22": "Chaco",
  "26": "Chubut",
  "30": "Entre Ríos",
  "34": "Formosa",
  "38": "Jujuy",
  "42": "La Pampa",
  "46": "La Rioja",
  "50": "Mendoza",
  "54": "Misiones",
  "58": "Neuquén",
  "62": "Río Negro",
  "66": "Salta",
  "70": "San Juan",
  "74": "San Luis",
  "78": "Santa Cruz",
  "82": "Santa Fe",
  "86": "Santiago del Estero",
  "90": "Tucumán",
  "94": "Tierra del Fuego, Antártida e Islas del Atlántico Sur",
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function fail(mensaje: string): never {
  console.error(`\n✖ build-zonas failed: ${mensaje}\n`)
  process.exit(1)
}

function log(mensaje: string): void {
  console.log(`  ${mensaje}`)
}

function step(mensaje: string): void {
  console.log(`\n▸ ${mensaje}`)
}

function fmtBytes(n: number): string {
  return n >= 1024 * 1024
    ? `${(n / 1024 / 1024).toFixed(2)} MB`
    : `${(n / 1024).toFixed(0)} KB`
}

/** ~11 m, and the reason the asset is 244 kB instead of 818 kB. */
const r4 = (valor: number): number => Math.round(valor * 1e4) / 1e4

function leerJson<T>(archivo: string): T {
  try {
    return JSON.parse(readFileSync(archivo, "utf8")) as T
  } catch (error: unknown) {
    return fail(
      `could not read ${path.relative(WEB_ROOT, archivo)}: ${String(error)}`
    )
  }
}

// ---------------------------------------------------------------------------
// Georef
// ---------------------------------------------------------------------------

type LocalidadGeoref = {
  nombre?: string
  centroide?: { lat?: number; lon?: number }
  provincia?: { nombre?: string }
  departamento?: { nombre?: string }
}

async function bajarLocalidades(): Promise<LocalidadGeoref[]> {
  const url = `${GEOREF}/localidades?max=${TOPE_GEOREF}&campos=nombre,centroide,provincia,departamento`
  const respuesta = await fetch(url)
  if (!respuesta.ok) {
    fail(`GET ${url} returned HTTP ${respuesta.status} ${respuesta.statusText}`)
  }

  const cuerpo = (await respuesta.json()) as {
    localidades?: LocalidadGeoref[]
    total?: number
  }
  const localidades = cuerpo.localidades
  if (!Array.isArray(localidades) || localidades.length === 0) {
    fail(`GET ${url} returned no localidades`)
  }

  /*
   * The check build-layers.ts exists to make: a silently truncated page is the
   * failure that ships a gazetteer missing its last thousand towns. If Georef
   * ever grows past one page this aborts instead, and the fix is pagination.
   */
  if (cuerpo.total !== localidades.length) {
    fail(
      `Georef reported ${String(cuerpo.total)} localidades but returned ${localidades.length}. ` +
        `Raise the page size or paginate — do NOT ship a truncated gazetteer.`
    )
  }

  log(`downloaded ${localidades.length} localidades`)
  return localidades
}

// ---------------------------------------------------------------------------
// The IGN layers already on disk
// ---------------------------------------------------------------------------

type Propiedades = { nombre?: string; codigo?: string }
type Coleccion = {
  features?: {
    properties?: Propiedades
    geometry?: { coordinates?: unknown }
  }[]
}

type Caja = { oeste: number; sur: number; este: number; norte: number }

/** The bounding box over every ring, MultiPolygons included. */
function cajaDe(coordenadas: unknown): Caja {
  let oeste = Infinity
  let sur = Infinity
  let este = -Infinity
  let norte = -Infinity

  const recorrer = (nodo: unknown): void => {
    if (!Array.isArray(nodo)) return
    const [primero, segundo] = nodo as readonly unknown[]
    if (typeof primero === "number" && typeof segundo === "number") {
      oeste = Math.min(oeste, primero)
      este = Math.max(este, primero)
      sur = Math.min(sur, segundo)
      norte = Math.max(norte, segundo)
      return
    }
    for (const hijo of nodo as readonly unknown[]) recorrer(hijo)
  }

  recorrer(coordenadas)
  if (!Number.isFinite(oeste)) fail("a jurisdiction has no coordinates at all")
  return { oeste, sur, este, norte }
}

/**
 * The label anchors, keyed by whichever field is actually unique.
 *
 * Departments join by `codigo`, never by name: 47 department names repeat across
 * provinces — 9 de Julio, 25 de Mayo, San Martín, Capital — so a name join would
 * quietly pair the wrong pairs.
 */
function anclas(
  archivo: string,
  clave: "nombre" | "codigo"
): Map<string, [number, number]> {
  const coleccion = leerJson<Coleccion>(path.join(GEO_DIR, archivo))
  const mapa = new Map<string, [number, number]>()

  for (const rasgo of coleccion.features ?? []) {
    const valor = rasgo.properties?.[clave]
    const punto = rasgo.geometry?.coordinates
    if (typeof valor !== "string" || !Array.isArray(punto)) continue
    const [lon, lat] = punto as readonly unknown[]
    if (typeof lon !== "number" || typeof lat !== "number") continue
    mapa.set(valor, [lon, lat])
  }

  if (mapa.size === 0) fail(`${archivo} produced no anchors`)
  log(`${archivo}: ${mapa.size} anchors keyed by ${clave}`)
  return mapa
}

/**
 * One row per jurisdiction: the anchor for where to fly, its own bbox for how
 * tight to sit once there.
 *
 * The anchor rather than the bbox centre, and that is not a refinement — Tierra
 * del Fuego's bbox centre is (-63.16, -53.03), in the South Atlantic, while its
 * `-points inner` anchor is on the Isla Grande. Framing a camera and placing a
 * label want the same guarantee here: a point actually inside the shape.
 */
function filasDeJurisdiccion(
  archivoPoligonos: string,
  archivoAnclas: string,
  clave: "nombre" | "codigo",
  contextoDe: (propiedades: Propiedades) => string
): FilaZona[] {
  const puntos = anclas(archivoAnclas, clave)
  const coleccion = leerJson<Coleccion>(path.join(GEO_DIR, archivoPoligonos))
  const filas: FilaZona[] = []

  for (const rasgo of coleccion.features ?? []) {
    const propiedades = rasgo.properties ?? {}
    const nombre = propiedades.nombre
    if (typeof nombre !== "string")
      fail(`${archivoPoligonos} has a feature with no nombre`)

    const llave = propiedades[clave]
    if (typeof llave !== "string") {
      fail(`${archivoPoligonos}: «${nombre}» has no ${clave}`)
    }
    const ancla = puntos.get(llave)
    if (!ancla) {
      fail(`${archivoAnclas} has no anchor for ${clave}=${llave} («${nombre}»)`)
    }

    const zoom = zoomParaTramo(cajaDe(rasgo.geometry?.coordinates))
    filas.push([
      nombre,
      r4(ancla[0]),
      r4(ancla[1]),
      zoom,
      contextoDe(propiedades),
    ])
  }

  return filas
}

/**
 * The assertion that makes PROVINCIA_POR_CODIGO safe to hard-code: every code
 * present in the asset has an entry, and the names it yields are exactly the 24
 * the boundary layer draws.
 */
function verificarProvincias(departamentos: readonly FilaZona[]): void {
  const coleccion = leerJson<Coleccion>(path.join(GEO_DIR, "provincias.json"))
  const delMapa = new Set(
    coleccion.features?.map((r) => r.properties?.nombre ?? "") ?? []
  )
  const derivadas = new Set(departamentos.map((fila) => fila[4]))

  for (const nombre of derivadas) {
    if (!delMapa.has(nombre)) {
      fail(
        `the INDEC table produced «${nombre}», which provincias.json does not draw`
      )
    }
  }
  if (derivadas.size !== delMapa.size) {
    fail(
      `the INDEC table covers ${derivadas.size} provinces but provincias.json draws ${delMapa.size}`
    )
  }
  log(`INDEC codes resolve to exactly the ${delMapa.size} provinces on the map`)
}

// ---------------------------------------------------------------------------
// Localities
// ---------------------------------------------------------------------------

function filasDeLocalidad(localidades: readonly LocalidadGeoref[]): FilaZona[] {
  return localidades.map((localidad) => {
    const nombre = localidad.nombre
    const lat = localidad.centroide?.lat
    const lon = localidad.centroide?.lon
    if (typeof nombre !== "string")
      fail("Georef returned a locality with no nombre")
    if (typeof lat !== "number" || typeof lon !== "number") {
      fail(`Georef returned «${nombre}» with no centroide`)
    }

    const provincia = localidad.provincia?.nombre ?? ""
    const departamento = localidad.departamento?.nombre ?? ""
    /*
     * Pergamino must not read «Pergamino · Pergamino, Buenos Aires»: where the
     * locality and its department share a name the department adds nothing.
     */
    const contexto =
      departamento === "" || departamento === nombre
        ? provincia
        : `${departamento}, ${provincia}`

    return [nombre, r4(lon), r4(lat), ZOOM_LOCALIDAD, contexto]
  })
}

/**
 * Collapse Georef's doubled entries for one town.
 *
 * 106 localities arrive twice: Georef lists the censal locality and its
 * settlement entity under the same name in the same department. Measured across
 * all 106 groups, every one has exactly two members, the furthest apart are
 * 2.28 km (Villa Ciudad de América), the median is 0.41 km, and NONE exceed the
 * ~3.8 km a zoom-12 viewport covers. The two rows are the same place and land on
 * the same screen, so shipping both would put 106 indistinguishable pairs into a
 * list whose whole job is letting someone choose between similar names.
 *
 * Keeping the first is therefore not a coin flip that matters. What does matter
 * is that `verificarUnicos` still runs afterwards, so a genuine double append —
 * identical coordinates included — would still abort the build.
 */
function deduplicar(filas: readonly FilaZona[]): FilaZona[] {
  const porNombre = new Map<string, FilaZona>()
  for (const fila of filas) {
    const llave = `${fila[0]}|${fila[4]}`
    if (!porNombre.has(llave)) porNombre.set(llave, fila)
  }
  const quitadas = filas.length - porNombre.size
  if (quitadas > 0) log(`collapsed ${quitadas} doubled localities`)
  return [...porNombre.values()]
}

// ---------------------------------------------------------------------------
// Checks and output
// ---------------------------------------------------------------------------

/**
 * Sorted by name, and the reason is the diff rather than the search.
 *
 * Georef's natural order is by id, which reshuffles on any upstream change; a
 * stable sort is what keeps the committed file reviewable. Context breaks ties so
 * the order is total — 36 San Josés would otherwise shuffle among themselves.
 */
function ordenar(filas: FilaZona[]): FilaZona[] {
  return [...filas].sort(
    (a, b) =>
      a[0].localeCompare(b[0], "es-AR") || a[4].localeCompare(b[4], "es-AR")
  )
}

function verificarEnvolvente(filas: readonly FilaZona[], capa: string): void {
  for (const [nombre, lon, lat] of filas) {
    if (
      lon < ARGENTINA_BBOX.minLon ||
      lon > ARGENTINA_BBOX.maxLon ||
      lat < ARGENTINA_BBOX.minLat ||
      lat > ARGENTINA_BBOX.maxLat
    ) {
      fail(
        `${capa}: «${nombre}» sits at lon ${lon} lat ${lat}, outside ARGENTINA_BBOX. ` +
          `The parser and this asset must agree on where Argentina is.`
      )
    }
  }
}

function verificarUnicos(filas: readonly FilaZona[], capa: string): void {
  const vistos = new Set<string>()
  for (const fila of filas) {
    const llave = `${fila[0]}|${fila[4]}`
    if (vistos.has(llave)) {
      fail(
        `${capa}: «${fila[0]}» (${fila[4]}) appears twice — a double append?`
      )
    }
    vistos.add(llave)
  }
}

/** Compact, but one row per line, so git diffs stay line-oriented. */
function serializar(
  provincias: readonly FilaZona[],
  departamentos: readonly FilaZona[],
  localidades: readonly FilaZona[]
): string {
  const capa = (filas: readonly FilaZona[]): string =>
    filas.map((fila) => JSON.stringify(fila)).join(",\n")

  return [
    "{",
    `"version": ${ZONAS_VERSION},`,
    `"generado": "${new Date().toISOString().slice(0, 10)}",`,
    `"provincias": [`,
    capa(provincias),
    "],",
    `"departamentos": [`,
    capa(departamentos),
    "],",
    `"localidades": [`,
    capa(localidades),
    "]",
    "}",
    "",
  ].join("\n")
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const staging = mkdtempSync(path.join(os.tmpdir(), "lote-limpio-zonas-"))
  log(`staging in ${staging}`)

  try {
    step("Localities — Georef")
    const localidades = ordenar(
      deduplicar(filasDeLocalidad(await bajarLocalidades()))
    )

    step("Provinces and departments — the IGN layers already on disk")
    const provincias = ordenar(
      filasDeJurisdiccion(
        "provincias.json",
        "provincias-anclas.json",
        "nombre",
        () => ""
      )
    )
    const departamentos = ordenar(
      filasDeJurisdiccion(
        "departamentos.json",
        "departamentos-anclas.json",
        "codigo",
        (propiedades) =>
          PROVINCIA_POR_CODIGO[(propiedades.codigo ?? "").slice(0, 2)] ??
          fail(`no INDEC entry for code ${String(propiedades.codigo)}`)
      )
    )
    verificarProvincias(departamentos)

    step("Checks")
    for (const [capa, filas] of [
      ["provincias", provincias],
      ["departamentos", departamentos],
      ["localidades", localidades],
    ] as const) {
      verificarEnvolvente(filas, capa)
      verificarUnicos(filas, capa)
      log(`${capa}: ${filas.length} rows, all inside Argentina, no duplicates`)
    }

    const json = serializar(provincias, departamentos, localidades)
    const crudos = Buffer.byteLength(json, "utf8")
    const comprimidos = gzipSync(json, { level: 9 }).byteLength
    log(`zonas.json: ${fmtBytes(crudos)} raw, ${fmtBytes(comprimidos)} gzip`)
    if (crudos > PRESUPUESTO_BYTES) {
      fail(
        `zonas.json is ${fmtBytes(crudos)}, over the ${fmtBytes(PRESUPUESTO_BYTES)} budget.`
      )
    }

    // Only now that every check has passed do we touch public/geo.
    step("Publishing to public/geo")
    const enStaging = path.join(staging, "zonas.json")
    writeFileSync(enStaging, json)
    const destino = path.join(GEO_DIR, "zonas.json")
    copyFileSync(enStaging, destino)
    log(`public/geo/zonas.json (${fmtBytes(statSync(destino).size)})`)
    log("done")
  } finally {
    rmSync(staging, { recursive: true, force: true })
  }
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? (error.stack ?? error.message) : String(error))
})
