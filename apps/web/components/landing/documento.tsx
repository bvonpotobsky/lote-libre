import type { FuenteLanding } from "@/lib/landing/fuentes"
import { APTITUD_EJEMPLO } from "@/lib/landing/aptitud-ejemplo"
import { filasAptitud } from "@/lib/ui/aptitud"
import { VERDICT_UI } from "@/lib/ui/verdict"

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

/**
 * A fictional record, deliberately.
 *
 * DESIGN.md's «Regla del Ejemplo Rotulado» forbids attributing a verdict,
 * hectares, a year, a name or a RENSPA to the real example frame. This sheet
 * used to compute its surface and centroid from ANILLO_LOTE, which is the seed
 * lote — so it was already printing 501 ha and a six-decimal coordinate of a
 * real place, and filling in a verdict on top would have compounded that.
 *
 * So the sheet stops describing the frame. Every value below is invented, the
 * coordinates are rounded to three decimals — a ~100 m square, not a surveyed
 * corner — and the caption says so. The figures that do show the real frame
 * (Hero, EscenaTerritorio, EvidenciaSatelital) still carry no result at all.
 *
 * The numbers are internally consistent with lib/services/verdict.ts: no loss
 * after the cutoff plus Categoría III is the only combination that reads green.
 */
const EJEMPLO = {
  denominacion: "Lote de ejemplo",
  provincia: "Santiago del Estero",
  superficie: "312,00 ha",
  geolocalizacion: "-27,340, -63,120 (WGS84)",
  renspa: "no declarado",
  fecha: "12/09/2026",
  perdida: "0,00 % de la superficie",
  categoria: "Categoría III — 98,20 % del lote",
} as const

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
 * A sheet that reproduces the real structure of lib/services/pdf.tsx: title,
 * subtitle, verdict box, label column, source list, footer. No hash digits are
 * shown — a fingerprint nobody can recompute is decoration.
 *
 * The verdict label is VERDICT_UI.verde.titulo, not the PDF's VERDICT_LABEL:
 * that one is set in capitals, and sustained capitals are forbidden on screen.
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

        <div
          className={`flex flex-col gap-1 rounded-md border-2 ${VERDICT_UI.verde.borde} p-3`}
        >
          <p className="text-lg font-bold text-verde">
            {VERDICT_UI.verde.titulo}
          </p>
          <p className="text-xs text-ink-soft">
            Pérdida de cobertura arbórea posterior al 31/12/2020 dentro del
            lote: {EJEMPLO.perdida}. Categoría OTBN: {EJEMPLO.categoria}.
          </p>
        </div>

        <section className="flex flex-col gap-2">
          <h3 className="font-semibold">Identificación del lote</h3>
          <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-1 sm:grid-cols-[8.5rem_1fr]">
            <Fila etiqueta="Denominación">{EJEMPLO.denominacion}</Fila>
            <Fila etiqueta="Provincia">{EJEMPLO.provincia}</Fila>
            <Fila etiqueta="Superficie">{EJEMPLO.superficie}</Fila>
            <Fila etiqueta="Geolocalización">{EJEMPLO.geolocalizacion}</Fila>
            <Fila etiqueta="RENSPA declarado">{EJEMPLO.renspa}</Fila>
          </dl>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="font-semibold">Aptitud legal</h3>
          <ul className="flex flex-col gap-1">
            {filasAptitud(APTITUD_EJEMPLO).map((fila) => (
              <li key={fila.bucket} className="flex justify-between gap-4">
                <span>{fila.etiqueta}</span>
                <span className="tabular-nums">
                  {fila.hectareas} · {fila.porcentaje}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="font-semibold">Resultado de exportación</h3>
          <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-1 sm:grid-cols-[8.5rem_1fr]">
            <Fila etiqueta="Fecha">{EJEMPLO.fecha}</Fila>
            <Fila etiqueta="Pérdida de cobertura">{EJEMPLO.perdida}</Fila>
            <Fila etiqueta="Categoría OTBN">{EJEMPLO.categoria}</Fila>
          </dl>
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
        Extracto ilustrativo con la estructura real del documento. El lote y el
        resultado son ficticios.
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

          <div className="flex flex-col gap-8 lg:col-span-5 lg:justify-center">
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
          </div>
        </div>
      </div>
    </section>
  )
}
