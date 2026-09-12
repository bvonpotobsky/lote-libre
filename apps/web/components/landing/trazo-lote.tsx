import { LOTE_PATH } from "@/lib/landing/ejemplo-capas.generated"
import { VISTA } from "@/lib/landing/proyeccion"

/** A square window around the lote, for glyph-sized uses. */
const VISTA_RECORTADA = "540 360 360 360"

type Props = {
  /** Draw the outline once on load (landing.css `.trazo-lote--animado`). */
  animado?: boolean
  /** Crop the view to the lote itself instead of the whole frame. */
  recorte?: boolean
  className?: string
}

/**
 * The example lote as a double stroke: paper under ink, so the outline reads
 * over dark canopy and pale soil alike. Shares VISTA with the raster, so
 * placing this SVG over the hero image registers the two exactly.
 */
export function TrazoLote({
  animado = false,
  recorte = false,
  className = "",
}: Props) {
  const clase = animado ? "trazo-lote trazo-lote--animado" : "trazo-lote"
  const viewBox = recorte ? VISTA_RECORTADA : `0 0 ${VISTA.ancho} ${VISTA.alto}`
  return (
    <svg viewBox={viewBox} className={className} aria-hidden="true">
      <path
        d={LOTE_PATH}
        pathLength={1}
        className={clase}
        fill="rgba(250, 250, 248, 0.1)"
        stroke="#fafaf8"
        strokeWidth="4.5"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={LOTE_PATH}
        pathLength={1}
        className={clase}
        fill="none"
        stroke="#000000"
        strokeWidth="1.5"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
