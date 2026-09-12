/**
 * Every motion parameter of the landing, in one place.
 *
 * Mirrored as CSS custom properties in app/(marketing)/landing.css — keep
 * both in sync. The CSS cannot import this file, so the mirror is enforced
 * by review; a comment at the top of landing.css points back here.
 */
export const MOVIMIENTO = {
  /** Milliseconds. */
  duracion: { micro: 180, entrada: 560, trazo: 1100 },
  easing: "cubic-bezier(0.22, 1, 0.36, 1)",
  /** Stagger step and the accumulated cap, in milliseconds. */
  escalonado: { paso: 70, tope: 300 },
  /** Perspective in px, tilts in degrees. */
  camara: { perspectiva: 1200, inclinacionX: 24, inclinacionZ: -10 },
  /** Distance between two stacked planes at full separation, in px. */
  planos: { separacion: 32 },
  /** Decorative vertical drift, in px. */
  parallax: { maximo: 20 },
} as const

/** Delay for the nth revealed item, capped so a long list never crawls. */
export function retardo(indice: number): number {
  if (indice <= 0) return 0
  return Math.min(
    indice * MOVIMIENTO.escalonado.paso,
    MOVIMIENTO.escalonado.tope
  )
}
