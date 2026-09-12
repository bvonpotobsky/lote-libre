/**
 * build-marca.ts — derives every brand asset from the one master file.
 *
 * Run by hand, once, with `pnpm --filter web build:marca`. Never wired into CI
 * or the Railway build, and everything it writes is committed — the same
 * contract as build-landing-assets.ts.
 *
 * The master (assets/marca/lote-limpio-logo.png) lives outside public/ on
 * purpose: it is a source file, not something to serve. It arrives 1774 × 887
 * with the artwork occupying 1529 × 340 of that, so roughly half the file is
 * transparent padding. Laid out at a header's height the padding would shrink
 * the glyphs to a smear, which is why nothing here uses the master as-is.
 *
 * Produces:
 *   public/marca/lote-limpio.png   The lockup cropped to its content and scaled
 *                                  to LOCKUP_ANCHO. Imported statically so
 *                                  next/image derives the responsive AVIF/WebP,
 *                                  and so the URL lands under /_next — the only
 *                                  paths proxy.ts lets through without a session.
 *   app/icon.png                   The green symbol alone, square, transparent.
 *                                  Next emits the <link rel="icon"> from it.
 *   app/apple-icon.png             The same symbol on paper, not transparency:
 *                                  iOS composites a missing background to black.
 *
 * The symbol is separated from the wordmark by chroma, not by coordinates (see
 * lib/marca/recorte.ts), so a re-exported master still crops correctly.
 *
 * `--solo=lockup|iconos` runs one step.
 */

import { mkdirSync, statSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import sharp from "sharp"

import {
  aCuadrado,
  bbox,
  conMargen,
  enmascarar,
  esCromatico,
  esVisible,
  type Caja,
} from "@/lib/marca/recorte"

const HERE = path.dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = path.resolve(HERE, "..")
const MAESTRO = path.join(WEB_ROOT, "assets", "marca", "lote-limpio-logo.png")
const MARCA_DIR = path.join(WEB_ROOT, "public", "marca")
const APP_DIR = path.join(WEB_ROOT, "app")

/**
 * The lockup is never painted wider than ~90 CSS px (h-5 at a 4.5:1 ratio), so
 * 768 covers a 3× screen more than twice over. Shipping the master's 1529 would
 * be bytes nobody downloads: next/image picks from `sizes`, not from the file.
 */
const LOCKUP_ANCHO = 768
const LOCKUP_MAX_BYTES = 40 * 1024

/**
 * Next scales one icon.png to every rel="icon" size the document asks for, and
 * nothing asks for more than a tab, a bookmark or a home screen. 256 is also
 * about the symbol's own resolution in the master, so this neither invents
 * detail by enlarging nor throws any away.
 */
const ICONO_LADO = 256
const ICONO_MAX_BYTES = 24 * 1024

/** The size iOS asks for, and the only one it does not resample. */
const APPLE_LADO = 180
const APPLE_MAX_BYTES = 16 * 1024

/** Breathing room around the symbol, as a fraction of its longest side. */
const MARGEN_ICONO = 0.1

const PAPEL = "#fafaf8"
const TRANSPARENTE = { r: 0, g: 0, b: 0, alpha: 0 }

type Paso = "lockup" | "iconos"
const PASOS: readonly Paso[] = ["lockup", "iconos"]

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

function verificarPeso(destino: string, techo: number): void {
  const bytes = statSync(destino).size
  const nombre = path.relative(WEB_ROOT, destino)
  console.log(`${nombre}: ${kb(bytes)}`)
  if (bytes > techo) {
    throw new Error(
      `${nombre} pesa ${kb(bytes)}, por encima del techo de ${kb(techo)}.`
    )
  }
}

type Maestro = { datos: Buffer; ancho: number; alto: number }

async function leerMaestro(): Promise<Maestro> {
  const { data, info } = await sharp(MAESTRO)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  return { datos: data, ancho: info.width, alto: info.height }
}

/**
 * Crops to `caja`, padding with transparency wherever it reaches past the
 * canvas — which aCuadrado does by design when the artwork sits near an edge.
 * Two passes on purpose: sharp applies extract before a resize and extend
 * after one, and relying on that ordering inside a single pipeline reads as a
 * puzzle six months from now.
 */
async function recortar(maestro: Maestro, caja: Caja): Promise<Buffer> {
  const x0 = Math.max(0, caja.x)
  const y0 = Math.max(0, caja.y)
  const x1 = Math.min(maestro.ancho, caja.x + caja.ancho)
  const y1 = Math.min(maestro.alto, caja.y + caja.alto)

  const recorte = await sharp(maestro.datos, {
    raw: { width: maestro.ancho, height: maestro.alto, channels: 4 },
  })
    .extract({ left: x0, top: y0, width: x1 - x0, height: y1 - y0 })
    .png()
    .toBuffer()

  const relleno = {
    left: x0 - caja.x,
    top: y0 - caja.y,
    right: caja.x + caja.ancho - x1,
    bottom: caja.y + caja.alto - y1,
  }
  const falta = Object.values(relleno).some((lado) => lado > 0)
  if (!falta) return recorte

  return sharp(recorte)
    .extend({ ...relleno, background: TRANSPARENTE })
    .png()
    .toBuffer()
}

function cajaDe(maestro: Maestro, que: "lockup" | "simbolo"): Caja {
  const caja = bbox(
    maestro.datos,
    maestro.ancho,
    maestro.alto,
    que === "lockup" ? esVisible : esCromatico
  )
  if (caja === null) {
    throw new Error(
      `El maestro no tiene píxeles de ${que}. ¿Se reexportó en otro formato?`
    )
  }
  return caja
}

// ---------------------------------------------------------------- lockup

async function escribirLockup(maestro: Maestro): Promise<void> {
  const caja = cajaDe(maestro, "lockup")
  console.log(
    `lockup: ${caja.ancho}×${caja.alto} en (${caja.x},${caja.y}) — el maestro mide ${maestro.ancho}×${maestro.alto}`
  )

  mkdirSync(MARCA_DIR, { recursive: true })
  const destino = path.join(MARCA_DIR, "lote-limpio.png")
  const recorte = await recortar(maestro, caja)

  // No `palette: true`: the wordmark is pure black over transparency and
  // quantising its antialias frays the counters at header sizes.
  await sharp(recorte)
    .resize({ width: LOCKUP_ANCHO, fit: "inside", withoutEnlargement: true })
    .png({ compressionLevel: 9, effort: 10 })
    .toFile(destino)

  verificarPeso(destino, LOCKUP_MAX_BYTES)
}

// ---------------------------------------------------------------- iconos

async function escribirIconos(maestro: Maestro): Promise<void> {
  const simbolo = cajaDe(maestro, "simbolo")
  const encuadre = conMargen(aCuadrado(simbolo), MARGEN_ICONO)
  console.log(
    `símbolo: ${simbolo.ancho}×${simbolo.alto} en (${simbolo.x},${simbolo.y}) → encuadre ${encuadre.ancho}×${encuadre.alto}`
  )

  // Cleared before cropping, not after: the square plus its margin reaches
  // into the wordmark, and without this the icon ships with a slice of the L.
  const soloSimbolo: Maestro = {
    ...maestro,
    datos: Buffer.from(
      enmascarar(maestro.datos, maestro.ancho, maestro.alto, esCromatico)
    ),
  }
  const recorte = await recortar(soloSimbolo, encuadre)

  // Unlike the lockup, the icons quantise well: one flat green against one
  // background, no counters to fray. Full colour spends four times the bytes
  // on antialias nobody resolves at a tab's size.
  const icono = path.join(APP_DIR, "icon.png")
  await sharp(recorte)
    .resize(ICONO_LADO, ICONO_LADO)
    .png({ compressionLevel: 9, effort: 10, palette: true })
    .toFile(icono)
  verificarPeso(icono, ICONO_MAX_BYTES)

  const apple = path.join(APP_DIR, "apple-icon.png")
  await sharp(recorte)
    .resize(APPLE_LADO, APPLE_LADO)
    .flatten({ background: PAPEL })
    .png({ compressionLevel: 9, effort: 10, palette: true })
    .toFile(apple)
  verificarPeso(apple, APPLE_MAX_BYTES)
}

// ------------------------------------------------------------------ main

async function main(): Promise<void> {
  const pasos = pasosPedidos()
  const maestro = await leerMaestro()

  if (pasos.has("lockup")) await escribirLockup(maestro)
  if (pasos.has("iconos")) await escribirIconos(maestro)

  console.log(`Listo: ${[...pasos].join(", ")}.`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
