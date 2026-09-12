import type { OtbnShare } from "@/lib/db/schema"
import { OTBN_UI } from "./verdict"

/**
 * One printed row of the aptitude breakdown.
 *
 * Presentation lives here, apart from any component, because this repo's vitest
 * only sees `lib/**` and runs in `node`: a rule that lives inside a `.tsx` file
 * cannot be tested at all. The panel and the PDF both render these rows, so
 * they cannot disagree about how a hectare reads.
 */
export type FilaAptitud = {
  bucket: OtbnShare["bucket"]
  etiqueta: string
  detalle: string
  swatch: string
  hectareas: string
  porcentaje: string
}

/**
 * Travels with every breakdown, on screen and in the PDF.
 *
 * The three shipped OTBN layers are 1:250 000 and their own metadata admits the
 * product "no refleja estrictamente el OTBN aprobado por la ALA". Simplifying
 * them for serving drops roughly 7 % of the Categoría III surface in small
 * scattered patches, so that bucket is understated by construction. A hectare
 * figure invites surveyor-grade trust; this is what it is actually worth.
 */
export const CAVEAT_APTITUD =
  "Superficies medidas sobre las capas provinciales publicadas, a escala 1:250 000 y simplificadas para poder servirlas. Sirven para dimensionar el lote, no para amojonarlo."

export function filasAptitud(
  reparto: readonly OtbnShare[],
): FilaAptitud[] {
  return reparto.map((share) => {
    const ui = OTBN_UI[share.bucket]

    return {
      bucket: share.bucket,
      etiqueta: ui.etiqueta,
      detalle: ui.detalle,
      swatch: ui.swatch,
      // Rounded to zero but present: the share says there is something there.
      hectareas:
        share.hectares === 0
          ? "menos de 1 ha"
          : `${share.hectares.toLocaleString("es-AR")} ha`,
      porcentaje: `${share.pct.toLocaleString("es-AR", {
        maximumFractionDigits: 2,
      })} %`,
    }
  })
}
