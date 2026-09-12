import {
  APTITUD_EJEMPLO,
  SUPERFICIE_EJEMPLO_HA,
} from "@/lib/landing/aptitud-ejemplo"
import { REASON_COPY } from "@/lib/services/verdict"
// Both verdict modules import the DB schema as TYPES only; keep it that way,
// or this marketing page starts requiring DATABASE_URL at build time.
import { filasAptitud, hectareasTexto } from "@/lib/ui/aptitud"
import { VERDICT_TRAZO, VERDICT_UI } from "@/lib/ui/verdict"
import type { Verdict } from "@/lib/db/schema"

import { RevelarEnVista } from "./revelar-en-vista"

type Fila = {
  clave: Verdict
  titulo: string
  resumen: string
  explicacion: string
  swatch: string
  texto: string
}

const FILAS: Fila[] = [
  {
    clave: "verde",
    titulo: VERDICT_UI.verde.titulo,
    resumen: VERDICT_UI.verde.resumen,
    explicacion: REASON_COPY.NO_FINDINGS,
    swatch: "bg-verde",
    texto: "text-white",
  },
  {
    clave: "amarillo",
    titulo: VERDICT_UI.amarillo.titulo,
    resumen: VERDICT_UI.amarillo.resumen,
    explicacion:
      "Superposición mínima con pérdida de cobertura, Categoría I o II del OTBN, o provincia sin capa cargada.",
    swatch: "bg-amarillo",
    texto: "text-ink",
  },
  {
    clave: "rojo",
    titulo: VERDICT_UI.rojo.titulo,
    resumen: VERDICT_UI.rojo.resumen,
    explicacion: REASON_COPY.FOREST_LOSS_AFTER_CUTOFF,
    swatch: "bg-rojo",
    texto: "text-white",
  },
]

/**
 * The two axes, in the order the product argues them: what the land allows
 * first, because that is Argentine law and it applies today; what it can
 * export second, because the European regulation bites on 30/12/2026.
 *
 * Colour never travels alone on either axis: every row carries its words.
 * The aptitude figures are a declared fiction — the landing illustrates the
 * method, never a result about a real place.
 */
export function Resultados() {
  return (
    <section id="resultados" className="landing__seccion landing__papel">
      <div className="landing__marco flex flex-col gap-10 lg:gap-14">
        <h2 className="landing__h2">Dos preguntas sobre el mismo suelo.</h2>

        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-xl font-bold">Qué se puede hacer</h3>
            <p className="mt-1 leading-relaxed text-ink-soft">
              Cuántas hectáreas del lote deja usar el Ordenamiento Territorial
              de Bosques Nativos. Es ley argentina, y rige hoy.
            </p>
          </div>

          <ul className="border-t border-line">
            {filasAptitud(APTITUD_EJEMPLO).map((fila) => (
              <li
                key={fila.bucket}
                className="grid grid-cols-[auto_1fr_auto] items-baseline gap-x-4 border-b border-line py-4"
              >
                <span
                  aria-hidden="true"
                  className={`${fila.swatch} mt-1 inline-block h-4 w-4 rounded-sm`}
                />
                <div>
                  <p className="font-bold">{fila.etiqueta}</p>
                  <p className="text-sm leading-relaxed text-ink-soft">
                    {fila.detalle}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold tabular-nums">
                    {fila.hectareas}
                  </p>
                  <p className="text-sm text-ink-soft tabular-nums">
                    {fila.porcentaje}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <p className="text-sm leading-relaxed text-ink-soft">
            Ejemplo ilustrativo sobre un lote ficticio de{" "}
            {hectareasTexto(SUPERFICIE_EJEMPLO_HA)}. Las superficies que informa
            la app se miden sobre las capas provinciales publicadas.
          </p>
        </div>

        <div>
          <h3 className="text-xl font-bold">Qué se puede vender</h3>
          <p className="mt-1 leading-relaxed text-ink-soft">
            Si la mercadería del lote entra a la Unión Europea bajo el
            Reglamento (UE) 2023/1115, exigible desde el 30/12/2026. Tres
            resultados posibles, cada uno con sus palabras.
          </p>
        </div>

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
                  <path d={VERDICT_TRAZO[fila.clave]} />
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
