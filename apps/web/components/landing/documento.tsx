import area from "@turf/area"
import centroid from "@turf/centroid"
import { polygon } from "@turf/helpers"

import type { FuenteLanding } from "@/lib/landing/fuentes"
import { ANILLO_LOTE } from "@/lib/landing/proyeccion"
import { formatHa } from "@/lib/ui/verdict"

/** Only what the real PDF would cite for a lote in Santiago del Estero. */
const FUENTES_DEL_EJEMPLO = new Set(["umsef", "otbn-santiago-del-estero"])

const BENEFICIOS = [
  {
    titulo: "Resultados acompañados de las fuentes utilizadas",
    texto:
      "Cada resultado cita la capa que lo sustenta, con su organismo, su vigencia y el enlace de origen.",
  },
  {
    titulo: "Limitaciones de cobertura y datos incluidas en el documento",
    texto:
      "Las advertencias de cada capa se imprimen junto a la fuente: escala, año del ordenamiento, simplificación.",
  },
  {
    titulo: "Huella verificable del contenido",
    texto:
      "Un SHA-256 del contenido declarado, impreso al pie de cada página, permite comprobar que el documento no fue alterado.",
  },
]

const ejemplo = polygon([ANILLO_LOTE.map(([lon, lat]) => [lon, lat])])
const superficieHa = formatHa(area(ejemplo) / 10_000)
const [lon, lat] = centroid(ejemplo).geometry.coordinates as [number, number]
const geolocalizacion = `${lat.toFixed(6)}, ${lon.toFixed(6)} (WGS84)`

type FilaProps = { etiqueta: string; children: React.ReactNode }

function Fila({ etiqueta, children }: FilaProps) {
  return (
    <>
      <dt className="text-ink-soft">{etiqueta}</dt>
      <dd className="font-semibold">{children}</dd>
    </>
  )
}

/**
 * A sheet that reproduces the real structure of lib/services/pdf.tsx:
 * title, subtitle, label column, source list, footer. The verdict rows are
 * empty on purpose and no hash digits are shown: this is the shape of the
 * document, not a result.
 */
export function HojaDocumento({ fuentes }: { fuentes: FuenteLanding[] }) {
  const citadas = fuentes.filter((fuente) => FUENTES_DEL_EJEMPLO.has(fuente.id))
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-5 rounded-md border border-line bg-white p-5 text-sm sm:p-8">
        <header className="flex flex-col gap-1 border-b-2 border-ink pb-2">
          <p className="text-lg font-bold">
            Declaración de debida diligencia — EUDR
          </p>
          <p className="text-xs text-ink-soft">
            Reglamento (UE) 2023/1115. Fecha de corte de deforestación:
            31/12/2020.
          </p>
        </header>

        <section className="flex flex-col gap-2">
          <h3 className="font-semibold">Identificación del lote</h3>
          <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-1 sm:grid-cols-[8.5rem_1fr]">
            <Fila etiqueta="Denominación">Lote de ejemplo</Fila>
            <Fila etiqueta="Provincia">Santiago del Estero</Fila>
            <Fila etiqueta="Superficie">{superficieHa} ha</Fila>
            <Fila etiqueta="Geolocalización">{geolocalizacion}</Fila>
          </dl>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="font-semibold">Resultado de la verificación</h3>
          <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-1 sm:grid-cols-[8.5rem_1fr]">
            <Fila etiqueta="Fecha">—</Fila>
            <Fila etiqueta="Pérdida de cobertura">—</Fila>
            <Fila etiqueta="Categoría OTBN">—</Fila>
          </dl>
          <p className="text-xs text-ink-soft">
            Se completa al verificar el lote.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="font-semibold">Fuentes consultadas</h3>
          <ul className="flex flex-col gap-2">
            {citadas.map((fuente) => (
              <li key={fuente.id} className="flex flex-col gap-0.5">
                <span className="font-semibold">{fuente.titulo}</span>
                <span className="text-xs text-ink-soft">
                  {fuente.vigencia
                    ? `Vigencia del dato: ${fuente.vigencia}`
                    : null}
                  {fuente.vigencia && fuente.consultadaEl ? " · " : null}
                  {fuente.consultadaEl
                    ? `Consultada el ${fuente.consultadaEl}`
                    : null}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <footer className="border-t border-line pt-2 text-xs text-ink-soft">
          Huella SHA-256 del contenido declarado. Permite verificar que este
          documento no fue alterado.
        </footer>
      </div>
      <p className="text-xs text-ink-soft">
        Extracto ilustrativo con la estructura real del documento.
      </p>
    </div>
  )
}

export function Documento({ fuentes }: { fuentes: FuenteLanding[] }) {
  return (
    <section className="landing__seccion landing__papel">
      <div className="landing__marco flex flex-col gap-10 lg:gap-14">
        <h2 className="landing__h2">El documento que se entrega.</h2>

        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <HojaDocumento fuentes={fuentes} />
          </div>

          <div className="flex flex-col gap-8 lg:col-span-5">
            <dl className="border-t border-line">
              {BENEFICIOS.map((beneficio) => (
                <div
                  key={beneficio.titulo}
                  className="flex flex-col gap-1 border-b border-line py-5"
                >
                  <dt className="text-lg font-semibold">{beneficio.titulo}</dt>
                  <dd className="leading-relaxed text-ink-soft">
                    {beneficio.texto}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="text-sm leading-relaxed text-ink-soft">
              La huella SHA-256 se calcula sobre el contenido canónico definido
              por el producto, no sobre los bytes del PDF. Permite comprobar que
              un documento coincide con una referencia confiable; no demuestra
              por sí sola la veracidad de los datos ni constituye una firma
              digital.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
