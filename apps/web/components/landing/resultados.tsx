import { REASON_COPY } from "@/lib/services/verdict"
// Both verdict modules import the DB schema as TYPES only; keep it that way,
// or this marketing page starts requiring DATABASE_URL at build time.
import { VERDICT_UI } from "@/lib/ui/verdict"

import { RevelarEnVista } from "./revelar-en-vista"

type Simbolo = "check" | "alerta" | "cruz" | "guion"

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
  {
    clave: "sin-capa",
    titulo: "Sin capa cargada",
    resumen: REASON_COPY.OTBN_NO_COVERAGE,
    explicacion: "El resultado queda Con observaciones.",
    swatch: "bg-field border-line border",
    texto: "text-ink",
    simbolo: "guion",
  },
]

const TRAZOS: Record<Simbolo, string> = {
  check: "M3.5 8.5l3 3 6-6",
  alerta: "M8 3.5v5.5M8 12.5h.01",
  cruz: "M4.5 4.5l7 7M11.5 4.5l-7 7",
  guion: "M4 8h8",
}

/**
 * The three verdicts and the state that is none of them. Colour never
 * travels alone: every row carries a symbol and its words, straight from the
 * product's own copy.
 */
export function Resultados() {
  return (
    <section id="resultados" className="landing__seccion landing__papel">
      <div className="landing__marco flex flex-col gap-10 lg:gap-14">
        <h2 className="landing__h2">
          Un resultado claro. Sus límites, también.
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

        <div className="flex flex-col gap-4 pt-2">
          <p className="landing__cita">
            Dato faltante no significa lote aprobado.
          </p>
          <p className="landing__cuerpo text-ink-soft">
            Sin observaciones exige evidencia positiva de las dos capas. Un lote
            en otra provincia, o en una provincia sin OTBN cargado, no se evalúa
            como favorable.
          </p>
        </div>
      </div>
    </section>
  )
}
