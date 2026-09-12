import { normalizarTexto } from "@/lib/lotes/listado"
import {
  escribirCoordenadas,
  interpretarCoordenadas,
  type LecturaCoordenada,
} from "./coordenadas"

/**
 * The gazetteer the map's search box reads, and the ranking that decides which
 * row lands first.
 *
 * Deliberately a committed static asset and not a service call, for the same
 * reason `limites.ts` ships the IGN boundaries as a file: the app owns no API key
 * and depends on no vendor being up. Two more reasons are specific to this one.
 * A pure function over an array in memory is the only kind of unit this project's
 * vitest config can test — `environment: "node"`, no jsdom — so putting the
 * ranking here is what makes it testable at all. And a producer in the field on a
 * bad link gets an answer per keystroke instead of per round trip.
 *
 * To regenerate after Georef publishes a new locality:
 *   pnpm --filter web build:zonas
 *
 * That script is manual and its output is committed, never wired into `prebuild`:
 * a Georef outage must not fail the deploy of an unrelated change. `zonas.test.ts`
 * pins the committed file against this decoder, so a stale or truncated
 * regeneration fails the suite instead of the search box.
 */

export const ZONAS_VERSION = 1
export const ZONAS_URL = "/geo/zonas.json"

/**
 * Arrival zoom for a town, and the reason it is not 13.
 *
 * ~3.8 km across a 400 px viewport: the town plus two to four kilometres of campo
 * in every direction, which is where a lote adjoining a town actually sits. It is
 * also the first zoom where the Esri imagery resolves field boundaries, which is
 * the whole reason the basemap is satellite.
 */
export const ZOOM_LOCALIDAD = 12

/**
 * Arrival zoom for an explicit pair, and the one case where tight is right:
 * somebody stood in the field with a GPS, so the input carried metre-level
 * precision and the first drawing click should be immediately useful.
 */
export const ZOOM_PUNTO = 15

/** Never zoom out past the map's own initial view; never past usable imagery. */
const ZOOM_MINIMO = 5
const ZOOM_MAXIMO = 12

/**
 * Seven rows, because 36 San Josés is not resolvable by scrolling — it is
 * resolvable by typing the province, which the token pass below supports. The
 * eighth row would be clipped by the dropdown's own height anyway.
 */
export const TOPE_SUGERENCIAS = 7

const DETALLE_PUNTO = "Coordenadas"
const DETALLE_PUNTO_CORREGIDO = "Las leímos al revés"

/** One place, as five positional fields: name, lon, lat, zoom, context. */
export type FilaZona = readonly [string, number, number, number, string]

export type ZonasCrudas = {
  version: number
  /** ISO date of the last regeneration, printed by build-zonas.ts. */
  generado: string
  provincias: readonly FilaZona[]
  departamentos: readonly FilaZona[]
  localidades: readonly FilaZona[]
}

export type TipoZona = "provincia" | "departamento" | "localidad"

export type Zona = {
  nombre: string
  /** Lon, then lat — MapLibre's order, not a human's. */
  centro: [number, number]
  zoom: number
  /** The subtitle that tells 36 San Josés apart. Empty for a province. */
  contexto: string
  tipo: TipoZona
  /**
   * `nombre` folded once, here.
   *
   * Folding 4.500 names through NFD and a diacritic regex on every keystroke is
   * ~10 ms and stutters on a cheap Android. Folded at decode time a keystroke is
   * 4.500 `includes` calls, which is what buys the instant response the static
   * asset was chosen for.
   */
  clave: string
  /** `nombre` and `contexto` folded together, for the multi-word pass. */
  claveCompleta: string
}

export type Camara = { centro: [number, number]; zoom: number }

export type Sugerencia = {
  /** A place name, or the coordinates read back in Spanish. */
  titulo: string
  /** The quiet half: province and department, or what kind of point this is. */
  detalle: string
  /** Stable and unique across a list of identically-named places. */
  clave: string
  camara: Camara
}

export type Resultado = {
  sugerencias: Sugerencia[]
  /** How many matched before the cap, so the view can offer to narrow. */
  total: number
  /**
   * Why the list is empty, when a pasted point is the reason. The module decides
   * the reason and the view owns the words — the same split `ResultadoDibujo`
   * already uses for its `code`.
   */
  aviso: "ilegible" | "fuera_de_argentina" | "link_corto" | null
}

/**
 * How tight to sit once there, derived from the jurisdiction's own extent.
 *
 * Georef hands out a centroid and never a bounding box, but the IGN polygons this
 * repo already ships do have one — so the arrival zoom is computed at build time
 * from bytes that are already here.
 *
 * The cosine correction is not a nicety: cos(-34) ~ 0.83 against cos(-50) ~ 0.64,
 * so without it Santa Cruz arrives a whole level too loose. The -0.4 leaves the
 * jurisdiction filling roughly 70 % of a square viewport. `zonas.test.ts` pins
 * the results rather than recomputing them, so a change here has to fail the
 * suite instead of quietly moving where every search in the country lands.
 */
export function zoomParaTramo(tramo: {
  oeste: number
  sur: number
  este: number
  norte: number
}): number {
  const latMedia = (tramo.sur + tramo.norte) / 2
  const anchoCorregido =
    (tramo.este - tramo.oeste) * Math.cos((latMedia * Math.PI) / 180)
  const mayor = Math.max(anchoCorregido, tramo.norte - tramo.sur)
  const crudo = Math.log2(360 / mayor) - 0.4
  const acotado = Math.min(ZOOM_MAXIMO, Math.max(ZOOM_MINIMO, crudo))
  return Math.round(acotado * 10) / 10
}

function leerFila(fila: unknown, tipo: TipoZona): Zona {
  if (!Array.isArray(fila) || fila.length !== 5) {
    throw new Error(`zonas.json: una fila de ${tipo} no trae cinco campos`)
  }

  const [nombre, lon, lat, zoom, contexto] = fila as readonly unknown[]
  if (typeof nombre !== "string" || typeof contexto !== "string") {
    throw new Error(`zonas.json: una fila de ${tipo} no trae nombre y contexto`)
  }
  if (
    typeof lon !== "number" ||
    typeof lat !== "number" ||
    typeof zoom !== "number"
  ) {
    throw new Error(`zonas.json: «${nombre}» no trae lon, lat y zoom numéricos`)
  }

  return {
    nombre,
    centro: [lon, lat],
    zoom,
    contexto,
    tipo,
    clave: normalizarTexto(nombre),
    claveCompleta: normalizarTexto(`${nombre} ${contexto}`),
  }
}

/**
 * Throws rather than returning a result type, on purpose.
 *
 * The widget has exactly one user-visible failure — the gazetteer did not arrive
 * — with exactly one message. Two failure shapes would be two code paths for one
 * outcome, and the fetch's own `catch` already swallows both.
 */
export function decodificarZonas(crudo: unknown): Zona[] {
  if (typeof crudo !== "object" || crudo === null || Array.isArray(crudo)) {
    throw new Error("zonas.json no es un objeto")
  }

  const { version, provincias, departamentos, localidades } =
    crudo as Partial<ZonasCrudas>

  if (version !== ZONAS_VERSION) {
    throw new Error(
      `zonas.json trae la versión ${String(version)} y este código lee la ${ZONAS_VERSION}: regeneralo con pnpm --filter web build:zonas`
    )
  }

  const capas: readonly [TipoZona, unknown][] = [
    ["provincia", provincias],
    ["departamento", departamentos],
    ["localidad", localidades],
  ]

  const zonas: Zona[] = []
  for (const [tipo, filas] of capas) {
    if (!Array.isArray(filas)) {
      throw new Error(`zonas.json no trae la lista de ${tipo}`)
    }
    for (const fila of filas as readonly unknown[]) {
      zonas.push(leerFila(fila, tipo))
    }
  }

  return zonas
}

/**
 * Bigger container first when the score ties.
 *
 * 4.037 localidades against 552 areas means specificity-first buries Santa Fe
 * under eighty towns the moment someone types «sant». Arriving one level too wide
 * costs a pinch; arriving at the wrong San José of 36 is a navigation failure.
 * And for this feature the department is often the better arrival anyway, since
 * the lote is outside town.
 */
const ORDEN_TIPO: Record<TipoZona, number> = {
  provincia: 0,
  departamento: 1,
  localidad: 2,
}

type Hallazgo = { zona: Zona; puntaje: number }

/**
 * Lower is better, and `null` means this place does not match at all.
 *
 * Rank 4 is what answers the 36-way «san jose»: it is order-free, so «san jose
 * entre rios» and «entre rios san jose» narrow the same way. The whole query is
 * scored against the name first, so «villa maria» stays an exact match on Villa
 * María and never falls through to the token pass.
 */
function puntaje(
  zona: Zona,
  consulta: string,
  tokens: string[]
): number | null {
  const nombre = zona.clave
  if (nombre === consulta) return 0
  if (nombre.startsWith(consulta)) return 1
  if (` ${nombre}`.includes(` ${consulta}`)) return 2
  if (nombre.includes(consulta)) return 3
  if (
    tokens.length > 1 &&
    tokens.every((token) => ` ${zona.claveCompleta}`.includes(` ${token}`))
  ) {
    return 4
  }
  return null
}

/**
 * A total order, and the last two steps are not cosmetic: without them the output
 * depends on the asset's own row order, and every ranking test goes flaky the
 * first time the gazetteer is regenerated.
 */
function comparar(a: Hallazgo, b: Hallazgo): number {
  if (a.puntaje !== b.puntaje) return a.puntaje - b.puntaje

  const porTipo = ORDEN_TIPO[a.zona.tipo] - ORDEN_TIPO[b.zona.tipo]
  if (porTipo !== 0) return porTipo

  // San José before San José de la Dormida.
  const porLargo = a.zona.nombre.length - b.zona.nombre.length
  if (porLargo !== 0) return porLargo

  const porNombre = a.zona.nombre.localeCompare(b.zona.nombre, "es-AR")
  if (porNombre !== 0) return porNombre

  return a.zona.contexto.localeCompare(b.zona.contexto, "es-AR")
}

function sugerenciaDeZona(zona: Zona): Sugerencia {
  return {
    titulo: zona.nombre,
    detalle: zona.contexto,
    clave: `${zona.tipo}:${zona.nombre}:${zona.contexto}`,
    camara: { centro: [zona.centro[0], zona.centro[1]], zoom: zona.zoom },
  }
}

function sugerenciaDePunto(
  lectura: Extract<LecturaCoordenada, { ok: true }>
): Sugerencia {
  const { lat, lon, corregido } = lectura
  return {
    titulo: escribirCoordenadas(lat, lon),
    detalle: corregido ? DETALLE_PUNTO_CORREGIDO : DETALLE_PUNTO,
    clave: `punto:${lat}:${lon}`,
    camara: { centro: [lon, lat], zoom: ZOOM_PUNTO },
  }
}

export function buscarSugerencias(
  consulta: string,
  zonas: readonly Zona[],
  tope: number = TOPE_SUGERENCIAS
): Resultado {
  const texto = consulta.trim()
  if (texto === "") return { sugerencias: [], total: 0, aviso: null }

  /*
   * Coordinates short-circuit the gazetteer entirely. Two consequences worth
   * keeping: a pasted point is never ranked against place names, and it works
   * before the asset has loaded — and even if it never does.
   */
  const punto = interpretarCoordenadas(texto)
  if (punto.ok) {
    return { sugerencias: [sugerenciaDePunto(punto)], total: 1, aviso: null }
  }
  if (punto.motivo !== "sin_formato") {
    return { sugerencias: [], total: 0, aviso: punto.motivo }
  }

  const plegada = normalizarTexto(texto)
  const tokens = plegada.split(/\s+/).filter((token) => token !== "")

  const hallazgos: Hallazgo[] = []
  for (const zona of zonas) {
    const valor = puntaje(zona, plegada, tokens)
    if (valor !== null) hallazgos.push({ zona, puntaje: valor })
  }
  hallazgos.sort(comparar)

  return {
    sugerencias: hallazgos
      .slice(0, tope)
      .map(({ zona }) => sugerenciaDeZona(zona)),
    total: hallazgos.length,
    aviso: null,
  }
}
