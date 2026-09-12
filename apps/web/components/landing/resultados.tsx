import { REASON_COPY } from "@/lib/services/verdict"
// Both verdict modules import the DB schema as TYPES only; keep it that way,
// or this marketing page starts requiring DATABASE_URL at build time.
import { VERDICT_UI } from "@/lib/ui/verdict"

import { RevelarEnVista } from "./revelar-en-vista"

type Simbolo = "check" | "alerta" | "cruz"

type Fila = {
  clave: string
  titulo: string
  resumen: string
  explicacion: string
  swatch: string
  texto: string
  simbolo: Simbolo
}

const FILAS: Fila[] = [
  {
    clave: "verde",
    titulo: VERDICT_UI.verde.titulo,
    resumen: VERDICT_UI.verde.resumen,
    explicacion: REASON_COPY.NO_FINDINGS,
    swatch: "bg-verde",
    texto: "text-white",
    simbolo: "check",
  },
  {
    clave: "amarillo",
    titulo: VERDICT_UI.amarillo.titulo,
    resumen: VERDICT_UI.amarillo.resumen,
    explicacion:
      "Superposición mínima con pérdida de cobertura, Categoría I o II del OTBN, o provincia sin capa cargada.",
    swatch: "bg-amarillo",
    texto: "text-ink",
    simbolo: "alerta",
  },
  {
    clave: "rojo",
    titulo: VERDICT_UI.rojo.titulo,
    resumen: VERDICT_UI.rojo.resumen,
    explicacion: REASON_COPY.FOREST_LOSS_AFTER_CUTOFF,
    swatch: "bg-rojo",
    texto: "text-white",
    simbolo: "cruz",
  },
]

const TRAZOS: Record<Simbolo, string> = {
  check: "M3.5 8.5l3 3 6-6",
  alerta: "M8 3.5v5.5M8 12.5h.01",
  cruz: "M4.5 4.5l7 7M11.5 4.5l-7 7",
}

/**
 * The three verdicts. Colour never travels alone: every row carries a symbol
 * and its words, straight from the product's own copy.
 *
 * There used to be a fourth row for a province with no OTBN layer. It said
 * nothing the amber row does not already say — «…o provincia sin capa
 * cargada» — and it turned the section into a list of holes. The scope it
 * described now lives in «Alcance y fuentes», once, with the pull quote.
 */
export function Resultados() {
  return (
    <section id="resultados" className="landing__seccion landing__papel">
      <div className="landing__marco flex flex-col gap-10 lg:gap-14">
        <h2 className="landing__h2">
          Tres resultados posibles. Cada uno con sus palabras.
        </h2>

        <ul className="border-b border-line">
          {FILAS.map((fila, i) => (
            <RevelarEnVista
              key={fila.clave}
              as="li"
              indice={i}
              className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-t border-line py-6 lg:grid-cols-[auto_16rem_1fr] lg:gap-x-8 lg:py-7"
            >
              <span
                aria-hidden="true"
                className={`${fila.swatch} ${fila.texto} mt-0.5 flex h-6 w-6 items-center justify-center rounded`}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={TRAZOS[fila.simbolo]} />
                </svg>
              </span>
              <p className="text-lg font-bold">{fila.titulo}</p>
              <div className="col-start-2 flex flex-col gap-1 lg:col-start-3">
                <p className="leading-relaxed">{fila.resumen}</p>
                <p className="text-sm leading-relaxed text-ink-soft">
                  {fila.explicacion}
                </p>
              </div>
            </RevelarEnVista>
          ))}
        </ul>
      </div>
    </section>
  )
}
