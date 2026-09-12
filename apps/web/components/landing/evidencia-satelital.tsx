import {
  ANIO_IMAGEN,
  ANIO_REFERENCIA,
  ATRIBUCION_EVIDENCIA,
  VENTANA_IMAGEN,
  VENTANA_REFERENCIA,
} from "@/lib/landing/ejemplo-capas.generated"

import { ComparadorEvidencia } from "./comparador-evidencia"

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const

/** «2020-06-15» + «2020-09-10» → «Junio a septiembre de 2020». */
function ventanaLegible(ventana: { desde: string; hasta: string }): string {
  const mes = (iso: string) => MESES[Number(iso.slice(5, 7)) - 1] ?? iso
  const primero = mes(ventana.desde)
  return `${primero.charAt(0).toUpperCase()}${primero.slice(1)} a ${mes(
    ventana.hasta
  )} de ${ventana.desde.slice(0, 4)}`
}

/**
 * The satellite evidence, on ink.
 *
 * This section used to argue the opposite: it was titled «Dos fotos no cuentan
 * toda la historia» and deliberately shipped no comparator, so the landing
 * spent its heaviest surface explaining a limitation while the product's real
 * before/after stayed behind a login. The limitation is still here — it is the
 * last paragraph — but it is a footnote under an image that makes the case,
 * not the headline.
 */
export function EvidenciaSatelital() {
  return (
    <section className="landing__seccion landing__tinta">
      <div className="landing__marco grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="flex flex-col gap-5 lg:col-span-5">
          <h2 className="landing__h2">Mirá el cambio, no lo imagines.</h2>
          <p className="landing__cuerpo text-line">
            Dos pasadas de Sentinel-2 sobre el mismo encuadre, en los mismos
            meses, con seis años de diferencia. Deslizá para comparar.
          </p>
          <p className="max-w-[52ch] leading-relaxed text-line">
            El monte en pie se ve continuo y moteado. El desmonte deja fajas
            rectas, con bordes que siguen una línea de alambrado y no un
            accidente del terreno.
          </p>
          <p className="max-w-[52ch] text-sm leading-relaxed text-line">
            Un cambio en la imagen también puede ser una cosecha. Por eso el
            resultado no sale de estas fotos: sale de las capas oficiales.
          </p>
        </div>

        <figure className="flex flex-col gap-3 lg:col-span-7">
          <ComparadorEvidencia
            anioReferencia={ANIO_REFERENCIA}
            anioActual={ANIO_IMAGEN}
          />
          <figcaption className="flex flex-col gap-1 text-xs text-line">
            <span>
              {ventanaLegible(VENTANA_REFERENCIA)} ·{" "}
              {ventanaLegible(VENTANA_IMAGEN)}
            </span>
            <span>
              Ejemplo ilustrativo · Dpto. Pellegrini, Santiago del Estero.{" "}
              {ATRIBUCION_EVIDENCIA}
            </span>
          </figcaption>
        </figure>
      </div>
    </section>
  )
}
