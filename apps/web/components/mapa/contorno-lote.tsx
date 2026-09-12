import type { Vista } from "@/lib/geo/proyeccion"

type Props = {
  /** The lote's edge as an SVG path, from `contornoDeLote`. */
  d: string
  /** The raster's pixel grid, which is also this viewBox. */
  vista: Vista
  className?: string
}

/**
 * The lote's own edge, drawn over a frame that also shows its neighbours.
 *
 * Double stroke, paper under ink — the same treatment as the landing's
 * TrazoLote, which had to read over dark canopy and pale soil alike. The stroke
 * does not scale with the viewBox: `vista` varies per lote, from roughly
 * 512x512 down to a 2048x128 strip, and a scaling stroke would be four times
 * thicker on the strip.
 *
 * No fill, unlike TrazoLote's 10% paper wash. There the wash is decoration;
 * here the pixels underneath are the evidence being judged — the mottling of
 * monte against the flat, even colour of desmonte — and a veil over exactly
 * those pixels is the wrong trade.
 */
export function ContornoLote({ d, vista, className = "" }: Props) {
  return (
    <svg
      viewBox={`0 0 ${vista.ancho} ${vista.alto}`}
      className={className}
      aria-hidden="true"
    >
      <path
        d={d}
        fill="none"
        stroke="#fafaf8"
        strokeWidth="4.5"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={d}
        fill="none"
        stroke="#000000"
        strokeWidth="1.5"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
