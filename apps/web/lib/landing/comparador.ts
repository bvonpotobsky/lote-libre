/**
 * Wipe geometry for the landing's evidence comparator.
 *
 * Pure: the component owns the DOM and the state, this owns the arithmetic.
 * Kept apart from components/mapa/comparador.tsx on purpose — that one is
 * typed on a real lote's imagery windows (cloud cover, window source, empty
 * flag) and none of that exists on a marketing page.
 */

/** Both halves visible at rest: the wipe invites the drag, it does not hide one. */
export const POSICION_INICIAL = 50

/** Into 0..100, with the initial position standing in for a non-number. */
export function limitarPosicion(valor: number): number {
  if (Number.isNaN(valor)) return POSICION_INICIAL
  return Math.min(100, Math.max(0, valor))
}

/**
 * The inset the reference image is cut to.
 *
 * The position reads left to right — 0 is all "now", 100 is all "then" — so it
 * is inverted here: the reference is clipped from the right by the remainder.
 */
export function recorteDeVista(posicion: number): string {
  return `inset(0 ${100 - limitarPosicion(posicion)}% 0 0)`
}
