/**
 * recorte.ts — finding the real content inside a brand export.
 *
 * A logo exported from a design tool arrives padded with transparency, and the
 * padding is not decoration: laid out at a header's height, the artwork ends up
 * a fraction of the box it was given. These helpers measure where the ink
 * actually is so the build step can crop to it.
 *
 * Everything here takes a raw RGBA buffer — the caller decodes and re-encodes —
 * so the geometry can be tested without a single byte of PNG.
 */

export type Caja = {
  readonly x: number
  readonly y: number
  readonly ancho: number
  readonly alto: number
}

export type Predicado = (r: number, g: number, b: number, a: number) => boolean

/**
 * An export's antialias leaves a halo of near-zero alpha well outside the
 * artwork. Anything at or below this is that halo, not content.
 */
export const ALFA_MINIMA = 8

/**
 * Chroma weighted by alpha, below which a pixel reads as a neutral.
 *
 * Weighting is the whole point. The master carries a scatter of hued pixels
 * through the wordmark — compression noise at alpha 9, invisible on screen —
 * whose raw chroma sits in the twenties, close enough to a threshold on raw
 * chroma to drag the symbol's crop across the entire file. Against how much
 * colour the pixel actually contributes once composited, that noise lands near
 * 1 while the mark's own green lands near 75, and the gap stops being a
 * judgement call.
 */
export const CROMA_MINIMA = 12

export const esVisible: Predicado = (_r, _g, _b, a) => a > ALFA_MINIMA

/**
 * True for a pixel that carries hue, which is how the green symbol is told
 * apart from the black wordmark next to it — no hue window, no hard-coded
 * coordinates, so a re-export of the lockup still crops correctly.
 */
export const esCromatico: Predicado = (r, g, b, a) =>
  a > ALFA_MINIMA &&
  ((Math.max(r, g, b) - Math.min(r, g, b)) * a) / 255 > CROMA_MINIMA

/** The tightest box around every pixel the predicate accepts; null if none do. */
export function bbox(
  rgba: Uint8Array,
  ancho: number,
  alto: number,
  incluye: Predicado
): Caja | null {
  let x0 = ancho
  let y0 = alto
  let x1 = -1
  let y1 = -1

  for (let y = 0; y < alto; y += 1) {
    for (let x = 0; x < ancho; x += 1) {
      const o = (y * ancho + x) * 4
      if (!incluye(rgba[o]!, rgba[o + 1]!, rgba[o + 2]!, rgba[o + 3]!)) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }

  if (x1 < 0) return null
  return { x: x0, y: y0, ancho: x1 - x0 + 1, alto: y1 - y0 + 1 }
}

/**
 * The smallest square holding the box, around the same centre.
 *
 * The origin may land outside the canvas when the content sits against an edge.
 * That is the caller's problem to pad, not something to clamp away here: moving
 * the square back inside would push the artwork off centre.
 */
export function aCuadrado(caja: Caja): Caja {
  const lado = Math.max(caja.ancho, caja.alto)
  return {
    x: Math.round(caja.x + caja.ancho / 2 - lado / 2),
    y: Math.round(caja.y + caja.alto / 2 - lado / 2),
    ancho: lado,
    alto: lado,
  }
}

/** Grows the box on all four sides by a fraction of its longest side. */
export function conMargen(caja: Caja, fraccion: number): Caja {
  const margen = Math.round(Math.max(caja.ancho, caja.alto) * fraccion)
  return {
    x: caja.x - margen,
    y: caja.y - margen,
    ancho: caja.ancho + margen * 2,
    alto: caja.alto + margen * 2,
  }
}

/**
 * A copy of the buffer with every rejected pixel made fully transparent.
 *
 * Cropping the symbol by geometry alone is not enough: the square around it,
 * plus any breathing room, reaches into the wordmark and drags a slice of the
 * first letter into the icon. Clearing by the same predicate that found the
 * symbol means no amount of padding can pull in type — the crop can be chosen
 * for how the icon looks, not for what it might accidentally include.
 */
export function enmascarar(
  rgba: Uint8Array,
  ancho: number,
  alto: number,
  incluye: Predicado
): Uint8Array {
  const salida = Uint8Array.from(rgba)
  for (let i = 0; i < ancho * alto; i += 1) {
    const o = i * 4
    if (incluye(rgba[o]!, rgba[o + 1]!, rgba[o + 2]!, rgba[o + 3]!)) continue
    salida[o + 3] = 0
  }
  return salida
}
