/**
 * The scroll-linked scene, as pure math.
 *
 * The hook in hooks/use-progreso-escena.ts feeds a normalised progress in and
 * writes the four numbers out as CSS custom properties; landing.css turns
 * them into transforms. Nothing here touches the DOM, so the whole choreography
 * is unit-tested.
 *
 * The three frozen states are mirrored by [data-estado] rules in
 * app/(marketing)/landing.css — keep both in sync.
 */
export type Capitulo = 1 | 2 | 3

export type EstadoEscena = {
  /** Which chapter the copy is on. Changes three times in the whole scroll. */
  capitulo: Capitulo
  /** Lote outline draw and raster dim. Rises to 1 and stays. */
  resalte: number
  /** Plane separation and camera tilt. Rises, holds, falls back to 0. */
  separacion: number
  /** The document sheet rising at the end. */
  papel: number
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v))
}

/** Smoothstep between a and b: 0 before a, 1 after b, eased in between. */
function rampa(p: number, a: number, b: number): number {
  const t = clamp01((p - a) / (b - a))
  return t * t * (3 - 2 * t)
}

/** Normalised scroll progress of the tall section → the whole scene state. */
export function estadoEscena(progreso: number): EstadoEscena {
  const p = clamp01(progreso)
  const capitulo: Capitulo = p < 0.25 ? 1 : p < 0.65 ? 2 : 3
  return {
    capitulo,
    resalte: rampa(p, 0.03, 0.22),
    // Rise, hold, fall: the fall is the realignment chapter 3 opens with.
    separacion: rampa(p, 0.28, 0.45) - rampa(p, 0.62, 0.8),
    papel: rampa(p, 0.72, 0.94),
  }
}

/** Static state each stacked-fallback chapter renders at. */
export const ESTADOS_POR_CAPITULO: Readonly<Record<Capitulo, EstadoEscena>> = {
  1: { capitulo: 1, resalte: 1, separacion: 0, papel: 0 },
  2: { capitulo: 2, resalte: 1, separacion: 1, papel: 0 },
  3: { capitulo: 3, resalte: 1, separacion: 0, papel: 1 },
}

/**
 * Sticky-section geometry → progress. `top` is the section's top relative to
 * the viewport (negative once it has scrolled past), `alto` its full height.
 * A section no taller than the viewport has no scroll room and reports 0.
 */
export function progresoDeRect(
  top: number,
  alto: number,
  alturaVentana: number
): number {
  const recorrido = alto - alturaVentana
  if (recorrido <= 0) return 0
  return clamp01(-top / recorrido)
}
