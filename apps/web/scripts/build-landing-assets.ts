/**
 * build-landing-assets.ts — bakes the static artwork of the public landing.
 *
 * Run by hand, once, with `pnpm --filter web build:landing`. Never wired into
 * CI or the Railway build: the raster step spends a Copernicus call and needs
 * SH_CLIENT_ID / SH_CLIENT_SECRET, and everything it writes is committed.
 *
 * Produces:
 *   public/landing/hero.jpg               Sentinel-2 L2A true colour of the
 *                                         example frame (lib/landing/proyeccion
 *                                         MARCO at VISTA pixels). next/image
 *                                         derives the responsive AVIF/WebP.
 *   public/landing/evidencia-2020.jpg     The same frame, same months, six
 *                                         years earlier: the "before" half of
 *                                         the landing's wipe. The "after" half
 *                                         is hero.jpg itself.
 *   lib/landing/ejemplo-capas.generated.ts  The official layers (OTBN, UMSEF)
 *                                         clipped to the frame and projected to
 *                                         SVG paths, plus the lote outline and
 *                                         the imagery window / attribution.
 *   public/landing/grano.png              A 64×64 greyscale grain tile, seeded
 *                                         so two runs are byte-identical.
 *
 * `--solo=raster|referencia|capas|grano` runs one step. The vector and grain
 * steps work offline without credentials; the raster and evidence steps
 * validate the environment. The generated module is rewritten whenever any of
 * them runs, and any step it did not produce keeps the provenance already
 * recorded in the file.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import type { FeatureCollection } from "geojson"
import { PNG } from "pngjs"
import sharp from "sharp"

import { assertEnvironment } from "@/lib/config/env"
import {
  ANILLO_LOTE,
  MARCO,
  VISTA,
  anilloAPath,
} from "@/lib/landing/proyeccion"
import { recortarYProyectar } from "@/lib/landing/recorte-capas"
import { isEffectivelyEmpty } from "@/lib/services/png"
import { getFrameImage } from "@/lib/services/sentinel"

const HERE = path.dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = path.resolve(HERE, "..")
const PUBLIC_DIR = path.join(WEB_ROOT, "public", "landing")
const GENERADO = path.join(
  WEB_ROOT,
  "lib",
  "landing",
  "ejemplo-capas.generated.ts"
)
const OTBN_SRC = path.join(
  WEB_ROOT,
  "data",
  "otbn",
  "santiago-del-estero.geojson"
)
const UMSEF_SRC = path.join(
  WEB_ROOT,
  "data",
  "forest-loss",
  "santiago-del-estero.geojson"
)

/** Dry season in the Chaco: bare soil and canopy read as different textures. */
const VENTANA_PRINCIPAL = { desde: "2026-06-15", hasta: "2026-09-10" } as const
const VENTANA_RESPALDO = { desde: "2025-07-01", hasta: "2025-09-30" } as const

/**
 * The "before" half of the landing's wipe: the same months as the hero, six
 * years earlier.
 *
 * Matching the months is the whole argument. The app's comparator has to warn
 * that its two windows may fall in different seasons; here the only thing that
 * changed between the passes is the ground.
 *
 * True colour, not NDVI. In the dry Chaco the index does not separate them —
 * standing forest and a worked field both sit near 0.4, which the evalscript's
 * ramp renders as the same yellow-green. In true colour the difference is
 * obvious without a legend: continuous mottled canopy against the straight
 * strips of a clearing.
 */
const REFERENCIA_PRINCIPAL = { desde: "2020-06-15", hasta: "2020-09-10" } as const
const REFERENCIA_RESPALDO = { desde: "2020-05-01", hasta: "2020-10-31" } as const

const HERO_MAX_BYTES = 400 * 1024
/** The reference frame is the same scene through the same pipeline. */
const REFERENCIA_MAX_BYTES = HERO_MAX_BYTES
/** sharp `.linear(a, b)`: output = a · input + b, in 0–255 terms. */
const HERO_GANANCIA = 1.6
const HERO_DESPLAZAMIENTO = -8
const GENERADO_MAX_BYTES = 120 * 1024
const OTBN_TOLERANCIA = 0.00012
const OTBN_TOLERANCIA_GRUESA = 0.0002
const UMSEF_TOLERANCIA = 0.00008
const AREA_MINIMA_M2 = 5_000

type Ventana = { readonly desde: string; readonly hasta: string }
type Paso = "raster" | "referencia" | "capas" | "grano"

const PASOS: readonly Paso[] = ["raster", "referencia", "capas", "grano"]

function esPaso(valor: string): valor is Paso {
  return (PASOS as readonly string[]).includes(valor)
}

function pasosPedidos(): Set<Paso> {
  const solo = process.argv.find((arg) => arg.startsWith("--solo="))
  if (!solo) return new Set<Paso>(PASOS)
  const valor = solo.slice("--solo=".length)
  if (!esPaso(valor)) {
    throw new Error(`--solo debe ser ${PASOS.join(", ")}; llegó "${valor}"`)
  }
  return new Set<Paso>([valor])
}

function kb(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`
}

// ---------------------------------------------------------------- raster

/**
 * One true-colour pass over the frame, encoded the way the hero is.
 *
 * Both halves of the landing's wipe come through here, with the same gain and
 * the same offset. They have to be the same rendering of the same place, or a
 * difference in processing reads as a difference on the ground.
 */
async function bajarPasada(
  principal: Ventana,
  respaldo: Ventana,
  archivo: string,
  techo: number
): Promise<Ventana> {
  assertEnvironment()

  let ventana = principal
  let png = await getFrameImage(
    MARCO,
    ventana.desde,
    ventana.hasta,
    "trueColor",
    VISTA.ancho,
    VISTA.alto,
    15
  )
  // A frame is a full rectangle, so the expected opaque ratio is 1.
  if (isEffectivelyEmpty(png, 1)) {
    console.warn(
      `Sin pasada limpia entre ${ventana.desde} y ${ventana.hasta}; probando la ventana de respaldo.`
    )
    ventana = respaldo
    png = await getFrameImage(
      MARCO,
      ventana.desde,
      ventana.hasta,
      "trueColor",
      VISTA.ancho,
      VISTA.alto,
      15
    )
    if (isEffectivelyEmpty(png, 1)) {
      throw new Error(
        `Copernicus no devolvió imagen utilizable ni en ${principal.desde}–${principal.hasta} ni en ${respaldo.desde}–${respaldo.hasta}.`
      )
    }
  }

  mkdirSync(PUBLIC_DIR, { recursive: true })
  const destino = path.join(PUBLIC_DIR, archivo)
  // The evalscript's 2.5× gain still leaves the dry Chaco canopy near black.
  // One linear lift (a·x + b, per channel, before encoding) brings it to a
  // daylight olive/brown without a colour cast; the strips keep their edges.
  await sharp(png)
    .flatten({ background: "#000000" })
    .linear(HERO_GANANCIA, HERO_DESPLAZAMIENTO)
    .jpeg({ quality: 82, chromaSubsampling: "4:4:4", mozjpeg: true })
    .toFile(destino)

  const bytes = statSync(destino).size
  console.log(`${archivo}: ${kb(bytes)} (${ventana.desde} → ${ventana.hasta})`)
  if (bytes > techo) {
    throw new Error(
      `${archivo} pesa ${kb(bytes)}, por encima del techo de ${kb(techo)}.`
    )
  }
  return ventana
}

const bajarRaster = (): Promise<Ventana> =>
  bajarPasada(VENTANA_PRINCIPAL, VENTANA_RESPALDO, "hero.jpg", HERO_MAX_BYTES)

const bajarReferencia = (): Promise<Ventana> =>
  bajarPasada(
    REFERENCIA_PRINCIPAL,
    REFERENCIA_RESPALDO,
    "evidencia-2020.jpg",
    REFERENCIA_MAX_BYTES
  )

// ----------------------------------------------------------------- capas

type Categoria = "rojo" | "amarillo" | "verde"

function esCategoria(valor: string): valor is Categoria {
  return valor === "rojo" || valor === "amarillo" || valor === "verde"
}

function leerColeccion(archivo: string): FeatureCollection {
  return JSON.parse(readFileSync(archivo, "utf8")) as FeatureCollection
}

function recortarCapas(toleranciaOtbn: number) {
  const otbn = recortarYProyectar(leerColeccion(OTBN_SRC), MARCO, VISTA, {
    clave: (props) => String(props.categoria),
    areaMinimaM2: AREA_MINIMA_M2,
    tolerancia: toleranciaOtbn,
  }).filter((capa) => esCategoria(capa.clave))

  const umsef = recortarYProyectar(leerColeccion(UMSEF_SRC), MARCO, VISTA, {
    clave: () => "umsef",
    areaMinimaM2: AREA_MINIMA_M2,
    tolerancia: UMSEF_TOLERANCIA,
  })

  return { otbn, umsef: umsef[0]?.d ?? "" }
}

/**
 * A partial run must not forget which pass a committed image came from.
 *
 * Anchored on each constant's name. An unanchored `desde:` would match the
 * first window in the file and silently hand one step another step's dates.
 */
function ventanaEn(texto: string, nombre: string): Ventana | null {
  const patron = new RegExp(
    `${nombre} = \\{\\s*desde: "(\\d{4}-\\d{2}-\\d{2})",\\s*hasta: "(\\d{4}-\\d{2}-\\d{2})"`
  )
  const encontrado = patron.exec(texto)
  if (encontrado === null) return null
  return { desde: encontrado[1]!, hasta: encontrado[2]! }
}

type Procedencia = { imagen: Ventana; referencia: Ventana }

function procedenciaRegistrada(): Procedencia {
  const porDefecto: Procedencia = {
    imagen: VENTANA_PRINCIPAL,
    referencia: REFERENCIA_PRINCIPAL,
  }
  if (!existsSync(GENERADO)) return porDefecto
  const texto = readFileSync(GENERADO, "utf8")
  return {
    imagen: ventanaEn(texto, "VENTANA_IMAGEN") ?? porDefecto.imagen,
    referencia:
      ventanaEn(texto, "VENTANA_REFERENCIA") ?? porDefecto.referencia,
  }
}

/** Prettier-stable: a string constant breaks after `=` only past 80 columns. */
function constanteDeTexto(nombre: string, valor: string): string {
  const unaLinea = `export const ${nombre} = "${valor}"`
  return unaLinea.length <= 80
    ? unaLinea
    : `export const ${nombre} =\n  "${valor}"`
}

function moduloGenerado(
  ventana: Ventana,
  referencia: Ventana,
  capas: ReturnType<typeof recortarCapas>
): string {
  const anio = Number(ventana.hasta.slice(0, 4))
  const anioReferencia = Number(referencia.hasta.slice(0, 4))
  const otbn = capas.otbn
    .map(
      (capa) =>
        `  {\n    categoria: "${capa.clave}",\n    d: "${capa.d}",\n  },`
    )
    .join("\n")

  return [
    "// Generado por scripts/build-landing-assets.ts — no editar a mano.",
    "// Fuentes: data/otbn/santiago-del-estero.geojson y",
    "// data/forest-loss/santiago-del-estero.geojson, recortadas a MARCO",
    "// (lib/landing/proyeccion.ts) y proyectadas a VISTA 1440×1080.",
    "//",
    "// Guarda editorial: este módulo exporta geometría para dibujar y nada más.",
    "// Ninguna hectárea, cantidad, año ni resumen sale de acá: el ejemplo",
    "// ilustra el método, nunca un resultado sobre un lugar real.",
    "",
    "export const VENTANA_IMAGEN = {",
    `  desde: "${ventana.desde}",`,
    `  hasta: "${ventana.hasta}",`,
    "} as const",
    "",
    `export const ANIO_IMAGEN = ${anio}`,
    "",
    "export const ATRIBUCION =",
    `  "Contiene datos modificados de Copernicus Sentinel (${anio})"`,
    "",
    "export const VENTANA_REFERENCIA = {",
    `  desde: "${referencia.desde}",`,
    `  hasta: "${referencia.hasta}",`,
    "} as const",
    "",
    `export const ANIO_REFERENCIA = ${anioReferencia}`,
    "",
    constanteDeTexto(
      "ATRIBUCION_EVIDENCIA",
      `Contiene datos modificados de Copernicus Sentinel (${anioReferencia}, ${anio})`
    ),
    "",
    constanteDeTexto("LOTE_PATH", anilloAPath(MARCO, VISTA, ANILLO_LOTE)),
    "",
    'export type CategoriaOtbn = "rojo" | "amarillo" | "verde"',
    "",
    "export type CapaOtbn = { categoria: CategoriaOtbn; d: string }",
    "",
    "export const OTBN_PATHS: readonly CapaOtbn[] = [",
    otbn,
    "]",
    "",
    constanteDeTexto("UMSEF_PATH", capas.umsef),
    "",
  ].join("\n")
}

function emitirCapas(ventana: Ventana, referencia: Ventana): void {
  let tolerancia = OTBN_TOLERANCIA
  let capas = recortarCapas(tolerancia)
  let texto = moduloGenerado(ventana, referencia, capas)

  if (Buffer.byteLength(texto) > GENERADO_MAX_BYTES) {
    console.warn(
      `El módulo generado pesa ${kb(Buffer.byteLength(texto))}; reintentando con tolerancia ${OTBN_TOLERANCIA_GRUESA}.`
    )
    tolerancia = OTBN_TOLERANCIA_GRUESA
    capas = recortarCapas(tolerancia)
    texto = moduloGenerado(ventana, referencia, capas)
  }

  const bytes = Buffer.byteLength(texto)
  if (bytes > GENERADO_MAX_BYTES) {
    throw new Error(
      `ejemplo-capas.generated.ts pesa ${kb(bytes)}, por encima del techo de ${kb(GENERADO_MAX_BYTES)}.`
    )
  }

  writeFileSync(GENERADO, texto)
  const categorias =
    capas.otbn.map((capa) => capa.clave).join(", ") || "ninguna"
  console.log(
    `ejemplo-capas.generated.ts: ${kb(bytes)} (OTBN: ${categorias}; tolerancia ${tolerancia})`
  )
}

// ----------------------------------------------------------------- grano

/** Small, fast, deterministic PRNG; the seed is a literal on purpose. */
function mulberry32(semilla: number): () => number {
  let a = semilla >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function escribirGrano(): void {
  const lado = 64
  const png = new PNG({ width: lado, height: lado })
  const azar = mulberry32(0x4c4f5445) // "LOTE"
  for (let i = 0; i < png.data.length; i += 4) {
    const gris = 118 + Math.floor(azar() * 21) // 118..138
    png.data[i] = gris
    png.data[i + 1] = gris
    png.data[i + 2] = gris
    png.data[i + 3] = 255
  }
  mkdirSync(PUBLIC_DIR, { recursive: true })
  const destino = path.join(PUBLIC_DIR, "grano.png")
  // 8-bit greyscale: noise does not compress, so fewer channels is the only
  // lever. The tile is painted at 2 % opacity; nobody sees 64 px repeats.
  writeFileSync(destino, PNG.sync.write(png, { colorType: 0 }))
  console.log(`grano.png: ${kb(statSync(destino).size)}`)
}

// ------------------------------------------------------------------ main

async function main(): Promise<void> {
  const pasos = pasosPedidos()
  // Whatever this run does not produce keeps the provenance already committed.
  let { imagen, referencia } = procedenciaRegistrada()

  if (pasos.has("raster")) imagen = await bajarRaster()
  if (pasos.has("referencia")) referencia = await bajarReferencia()
  if (pasos.has("raster") || pasos.has("referencia") || pasos.has("capas")) {
    emitirCapas(imagen, referencia)
  }
  if (pasos.has("grano")) escribirGrano()

  console.log(`Listo: ${[...pasos].join(", ")}.`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
