import { ARGENTINA_BBOX } from "./validate"

/**
 * Reading a pasted point, in whatever shape it arrives.
 *
 * A producer rarely has a postal address for a field, but very often has the
 * point itself: copied out of Google Maps, read off a handheld GPS, forwarded by
 * an agronomist, or typed from a paper survey. Each of those prints the same
 * place differently, so this module accepts all of them and answers with one
 * shape.
 *
 * Its harder job is the opposite one. This parser sits in FRONT of a name
 * search, so every false positive steals a query that should have reached the
 * gazetteer: "Ruta 9 km 180" carries two numbers and must still be treated as
 * prose. That is why `sin_formato` exists as a distinct answer from `ilegible` —
 * the first falls through in silence, the second is worth telling someone about.
 *
 * Kept free of React and of the gazetteer so it can be tested directly, which is
 * the only kind of test this app's vitest config can run.
 */

/** North and east are positive; `O` is oeste, the letter a Spanish keyboard types. */
type Hemisferio = "N" | "S" | "E" | "W" | "O"

export type LecturaCoordenada =
  | { ok: true; lat: number; lon: number; corregido: boolean }
  /** Prose. Not a coordinate at all — the caller should search it as a name. */
  | { ok: false; motivo: "sin_formato" }
  /** Numbers that mean to be a coordinate, but cannot be read as one. */
  | { ok: false; motivo: "ilegible" }
  /** Read fine, lands elsewhere. Carries the pair so the copy can print it. */
  | { ok: false; motivo: "fuera_de_argentina"; lat: number; lon: number }
  /** A maps.app.goo.gl link resolves server-side and carries no coordinates. */
  | { ok: false; motivo: "link_corto" }

/**
 * One half of a pair: a signed magnitude plus whichever hemisphere letter was
 * attached to it, on either side.
 */
type Componente = { valor: number; letra: Hemisferio | null }

/**
 * One component, anchored so the half has to be consumed whole.
 *
 * Anchoring is what rejects `33 53 28 S` as DMS: the minutes branch is only
 * reachable through a `°`, so three bare numbers leave a tail and fail. A
 * producer holding DMS data has the degree sign; without a marker those numbers
 * could be anything, and reading them as DMS would be a guess.
 */
const COMPONENTE =
  /^\s*([NSEWO])?\s*([+-]?\d+(?:\.\d+)?)\s*(?:°\s*(?:(\d+(?:\.\d+)?)\s*'\s*(?:(\d+(?:\.\d+)?)\s*"?\s*)?)?)?\s*([NSEWO])?\s*$/

/** Where the coordinates live inside the handful of Google Maps URL shapes. */
const EN_URL = [
  /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
  /[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
  /[?&]ll=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
  /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
]

/** Uppercased, with every flavour of prime and quote folded to one. */
function normalizar(texto: string): string {
  return texto
    .toUpperCase()
    .replace(/[’′]/g, "'")
    .replace(/[”″]/g, '"')
    .replace(/''/g, '"')
}

const esLatitud = (letra: Hemisferio | null): boolean =>
  letra === "N" || letra === "S"

const esLongitud = (letra: Hemisferio | null): boolean =>
  letra === "E" || letra === "W" || letra === "O"

const dentroDeArgentina = (lat: number, lon: number): boolean =>
  lat >= ARGENTINA_BBOX.minLat &&
  lat <= ARGENTINA_BBOX.maxLat &&
  lon >= ARGENTINA_BBOX.minLon &&
  lon <= ARGENTINA_BBOX.maxLon

/** A pair that is not even on the globe is a typing failure, not a far place. */
const posibleEnLaTierra = (lat: number, lon: number): boolean =>
  Math.abs(lat) <= 90 && Math.abs(lon) <= 180

function leerComponente(mitad: string): Componente | null {
  const encontrado = COMPONENTE.exec(mitad)
  if (!encontrado) return null

  const [, izquierda, grados, minutos, segundos, derecha] = encontrado
  if (grados === undefined) return null
  // A half carrying a letter on both sides is not one component: the trailing
  // one belongs to the half that follows, so this split was the wrong split.
  if (izquierda !== undefined && derecha !== undefined) return null

  const signo = grados.startsWith("-") ? -1 : 1
  const magnitud =
    Math.abs(Number(grados)) +
    Number(minutos ?? 0) / 60 +
    Number(segundos ?? 0) / 3600

  return {
    valor: signo * magnitud,
    letra: ((izquierda ?? derecha) as Hemisferio | undefined) ?? null,
  }
}

/**
 * Every way the text could be cut in two, most specific separator first.
 *
 * Splitting before parsing is what keeps the grammar small: one half is
 * unambiguous, while a single pass over the whole string has to guess whether a
 * letter closes the first component or opens the second. Wrong cuts are cheap —
 * they simply fail to parse, and the next candidate is tried.
 */
function* divisiones(texto: string): Generator<[string, string]> {
  for (const marca of texto.matchAll(/;/g)) {
    if (marca.index === undefined) continue
    yield [texto.slice(0, marca.index), texto.slice(marca.index + 1)]
  }
  for (const marca of texto.matchAll(/,/g)) {
    if (marca.index === undefined) continue
    yield [texto.slice(0, marca.index), texto.slice(marca.index + 1)]
  }
  for (const marca of texto.matchAll(/\s+/g)) {
    if (marca.index === undefined) continue
    yield [
      texto.slice(0, marca.index),
      texto.slice(marca.index + marca[0].length),
    ]
  }
}

function leerPar(texto: string): [Componente, Componente] | null {
  for (const [izquierda, derecha] of divisiones(texto)) {
    const a = leerComponente(izquierda)
    if (!a) continue
    const b = leerComponente(derecha)
    if (b) return [a, b]
  }
  return null
}

/** The letter is authoritative: a redundant minus sign does not negate twice. */
function conSigno(componente: Componente): number {
  if (componente.letra === null) return componente.valor
  const negativa =
    componente.letra === "S" ||
    componente.letra === "O" ||
    componente.letra === "W"
  return negativa ? -Math.abs(componente.valor) : Math.abs(componente.valor)
}

/**
 * Settle a pair whose axes and signs are already explicit.
 *
 * No swap is attempted here, and that is the point: `-33.8911 S, 60.5746 E` is a
 * claim about which axis is which, and an `N` where an `S` was meant is a typo to
 * report rather than to quietly repair.
 */
function resolverConLetras(lat: number, lon: number): LecturaCoordenada {
  if (!posibleEnLaTierra(lat, lon)) return { ok: false, motivo: "ilegible" }
  if (!dentroDeArgentina(lat, lon))
    return { ok: false, motivo: "fuera_de_argentina", lat, lon }
  return { ok: true, lat, lon, corregido: false }
}

/**
 * Settle a bare pair of numbers, trying the four readings that could be meant.
 *
 * Order matters and encodes the policy. (lat, lon) is read first because that is
 * what every consumer tool prints, from Google Maps to a phone's compass; the
 * transposed reading comes last. The two ranges overlap between -56 and -53, so
 * a pair like (-54.5, -55.2) is valid either way and no detector can decide it —
 * latitude-first wins there by default, and the read-back in the suggestion row
 * is what lets the producer catch a wrong guess before committing.
 *
 * Negating an unsigned pair is not counted as a correction: Argentina sits
 * wholly in the south-west quadrant, so the sign is an inference the read-back
 * shows in full rather than a transposition worth warning about.
 */
function resolverSinLetras(lat: number, lon: number): LecturaCoordenada {
  if (!posibleEnLaTierra(lat, lon)) return { ok: false, motivo: "ilegible" }

  const lecturas: readonly [number, number, boolean][] = [
    [lat, lon, false],
    [-lat, -lon, false],
    [lon, lat, true],
    [-lon, -lat, true],
  ]

  for (const [a, b, corregido] of lecturas) {
    if (dentroDeArgentina(a, b)) return { ok: true, lat: a, lon: b, corregido }
  }

  // Never fly somewhere the app would refuse to accept a lote anyway: at the
  // national view the producer cannot even tell where they landed.
  return { ok: false, motivo: "fuera_de_argentina", lat, lon }
}

function leerUrl(texto: string): LecturaCoordenada {
  if (/(?:maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(texto))
    return { ok: false, motivo: "link_corto" }

  for (const patron of EN_URL) {
    const encontrado = patron.exec(texto)
    if (!encontrado) continue
    const [, lat, lon] = encontrado
    if (lat === undefined || lon === undefined) continue
    return resolverSinLetras(Number(lat), Number(lon))
  }

  // Claiming to understand every mapping host is worse than letting the text
  // reach the gazetteer, where it simply finds nothing.
  return { ok: false, motivo: "sin_formato" }
}

export function interpretarCoordenadas(texto: string): LecturaCoordenada {
  const limpio = texto.trim()
  if (limpio === "") return { ok: false, motivo: "sin_formato" }
  if (/^https?:\/\//i.test(limpio)) return leerUrl(limpio)

  const normal = normalizar(limpio)

  // Any letter that is not a hemisphere mark means prose. This is the guard that
  // keeps "Ruta 9 km 180" and "Villa 25 de Mayo" out of the coordinate path.
  if (/\p{L}/u.test(normal.replace(/[NSEWO]/g, "")))
    return { ok: false, motivo: "sin_formato" }

  /*
   * Whether the text was even trying to be a coordinate, which decides how a
   * failure is reported. A hemisphere letter or a unit marker is an explicit
   * signal. So is an es-AR comma that cannot be placed: "-33,8911, -60,5746"
   * asks one comma to be both the decimal mark and the separator, which is
   * undecidable rather than prose, and guessing would move the producer a whole
   * degree away.
   */
  const cifras = normal.match(/\d+/g)?.length ?? 0
  const hayIndicio =
    /[NSEWO]/.test(normal) ||
    /[°'"]/.test(normal) ||
    (normal.includes(",") && !normal.includes(".") && cifras >= 2)

  const par =
    leerPar(normal) ??
    // es-AR decimal commas, tried only once a period cannot be the decimal mark.
    (!normal.includes(".") && normal.includes(",")
      ? leerPar(normal.replace(/,/g, "."))
      : null)

  if (!par)
    return { ok: false, motivo: hayIndicio ? "ilegible" : "sin_formato" }

  const [a, b] = par
  if (
    (esLatitud(a.letra) && esLatitud(b.letra)) ||
    (esLongitud(a.letra) && esLongitud(b.letra))
  )
    return { ok: false, motivo: "ilegible" }

  // The letters name the axes, so longitude may legitimately be written first.
  const invertido = esLongitud(a.letra) || esLatitud(b.letra)
  const componenteLat = invertido ? b : a
  const componenteLon = invertido ? a : b

  const lat = conSigno(componenteLat)
  const lon = conSigno(componenteLon)

  return componenteLat.letra !== null || componenteLon.letra !== null
    ? resolverConLetras(lat, lon)
    : resolverSinLetras(lat, lon)
}

/** Four decimals is ~11 m, and a trailing zero only reads as false precision. */
function enCastellano(valor: number): string {
  const fijo = valor.toFixed(4)
  const limpio = fijo.includes(".") ? fijo.replace(/\.?0+$/, "") : fijo
  return limpio.replace(".", ",")
}

/**
 * The read-back, and the whole reason a transposition can be repaired safely.
 *
 * The producer sees what we understood — in Spanish, with the hemisphere spelled
 * out — before committing, so a wrong guess costs a glance instead of a trip to
 * the wrong province.
 */
export function escribirCoordenadas(lat: number, lon: number): string {
  const norteSur = lat < 0 ? "S" : "N"
  const esteOeste = lon < 0 ? "O" : "E"
  return `${enCastellano(Math.abs(lat))}° ${norteSur} · ${enCastellano(Math.abs(lon))}° ${esteOeste}`
}
