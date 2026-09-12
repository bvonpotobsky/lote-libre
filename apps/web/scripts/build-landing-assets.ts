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
 *   lib/landing/ejemplo-capas.generated.ts  The official layers (OTBN, UMSEF)
 *                                         clipped to the frame and projected to
 *                                         SVG paths, plus the lote outline and
 *                                         the imagery window / attribution.
 *   public/landing/grano.png              A 64×64 greyscale grain tile, seeded
 *                                         so two runs are byte-identical.
 *
 * `--solo=raster|capas|grano` runs one step. The vector and grain steps work
 * offline without credentials; only the raster step validates the environment.
 * The generated module is rewritten whenever raster or capas runs; a capas-only
 * run keeps the imagery window already recorded in the file.
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

const HERO_MAX_BYTES = 400 * 1024
/** sharp `.linear(a, b)`: output = a · input + b, in 0–255 terms. */
const HERO_GANANCIA = 1.6
const HERO_DESPLAZAMIENTO = -8
const GENERADO_MAX_BYTES = 120 * 1024
const OTBN_TOLERANCIA = 0.00012
const OTBN_TOLERANCIA_GRUESA = 0.0002
const UMSEF_TOLERANCIA = 0.00008
const AREA_MINIMA_M2 = 5_000

type Ventana = { readonly desde: string; readonly hasta: string }
type Paso = "raster" | "capas" | "grano"

function pasosPedidos(): Set<Paso> {
  const solo = process.argv.find((arg) => arg.startsWith("--solo="))
  if (!solo) return new Set<Paso>(["raster", "capas", "grano"])
  const valor = solo.slice("--solo=".length)
  if (valor !== "raster" && valor !== "capas" && valor !== "grano") {
    throw new Error(`--solo debe ser raster, capas o grano; llegó "${valor}"`)
  }
  return new Set<Paso>([valor])
}

function kb(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`
}

// ---------------------------------------------------------------- raster

async function bajarRaster(): Promise<Ventana> {
  assertEnvironment()

  let ventana: Ventana = VENTANA_PRINCIPAL
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
    ventana = VENTANA_RESPALDO
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
        `Copernicus no devolvió imagen utilizable ni en ${VENTANA_PRINCIPAL.desde}–${VENTANA_PRINCIPAL.hasta} ni en ${VENTANA_RESPALDO.desde}–${VENTANA_RESPALDO.hasta}.`
      )
    }
  }

  mkdirSync(PUBLIC_DIR, { recursive: true })
  const destino = path.join(PUBLIC_DIR, "hero.jpg")
  // The evalscript's 2.5× gain still leaves the dry Chaco canopy near black.
  // One linear lift (a·x + b, per channel, before encoding) brings it to a
  // daylight olive/brown without a colour cast; the strips keep their edges.
  await sharp(png)
    .flatten({ background: "#000000" })
    .linear(HERO_GANANCIA, HERO_DESPLAZAMIENTO)
    .jpeg({ quality: 82, chromaSubsampling: "4:4:4", mozjpeg: true })
    .toFile(destino)

  const bytes = statSync(destino).size
  console.log(`hero.jpg: ${kb(bytes)} (${ventana.desde} → ${ventana.hasta})`)
  if (bytes > HERO_MAX_BYTES) {
    throw new Error(
      `hero.jpg pesa ${kb(bytes)}, por encima del techo de ${kb(HERO_MAX_BYTES)}.`
    )
  }
  return ventana
}

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

/** A capas-only run must not forget which pass the committed hero came from. */
function ventanaRegistrada(): Ventana {
  if (!existsSync(GENERADO)) return VENTANA_PRINCIPAL
  const texto = readFileSync(GENERADO, "utf8")
  const desde = /desde: "(\d{4}-\d{2}-\d{2})"/.exec(texto)?.[1]
  const hasta = /hasta: "(\d{4}-\d{2}-\d{2})"/.exec(texto)?.[1]
  return desde && hasta ? { desde, hasta } : VENTANA_PRINCIPAL
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
  capas: ReturnType<typeof recortarCapas>
): string {
  const anio = Number(ventana.hasta.slice(0, 4))
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

function emitirCapas(ventana: Ventana): void {
  let tolerancia = OTBN_TOLERANCIA
  let capas = recortarCapas(tolerancia)
  let texto = moduloGenerado(ventana, capas)

  if (Buffer.byteLength(texto) > GENERADO_MAX_BYTES) {
    console.warn(
      `El módulo generado pesa ${kb(Buffer.byteLength(texto))}; reintentando con tolerancia ${OTBN_TOLERANCIA_GRUESA}.`
    )
    tolerancia = OTBN_TOLERANCIA_GRUESA
    capas = recortarCapas(tolerancia)
    texto = moduloGenerado(ventana, capas)
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
  let ventana = ventanaRegistrada()

  if (pasos.has("raster")) ventana = await bajarRaster()
  if (pasos.has("raster") || pasos.has("capas")) emitirCapas(ventana)
  if (pasos.has("grano")) escribirGrano()

  console.log(`Listo: ${[...pasos].join(", ")}.`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
