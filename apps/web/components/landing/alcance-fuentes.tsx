import { type FuenteLanding, type RolFuente } from "@/lib/landing/fuentes"

import { RevelarEnVista } from "./revelar-en-vista"

const ROL: Record<RolFuente, string> = {
  verificacion: "Capa de verificación",
  evidencia: "Evidencia visual",
  referencia: "Referencia cartográfica",
}

const ENLACE = "focus-ink rounded-sm underline decoration-1 underline-offset-4"
/** Standalone title links get a full touch target; inline ones flow with text. */
const ENLACE_TITULO = `${ENLACE} inline-flex min-h-11 items-center`

/**
 * Everything the landing owes the reader about its own limits, in one place.
 *
 * It used to be three: the coverage note under the hero's CTA, the caveats
 * that closed «Resultados», and a full-page source list where each of six
 * layers spent eight lines on licence text and warnings. Together they made
 * the page read as a disclaimer. The claims are unchanged — the coverage, the
 * quote, every caveat verbatim — but each row now opens to them instead of
 * leading with them.
 *
 * <details>, not a JavaScript disclosure: the «Regla del Contenido Completo»
 * asks that the page be finished without JavaScript, and a native element is
 * the only kind that keeps the caveats in the initial HTML and still folds.
 * The licence text is printed inside, never drawn as a badge — the MAyDS
 * layers publish a defective one, and a badge would read as an endorsement.
 */
export function AlcanceFuentes({ fuentes }: { fuentes: FuenteLanding[] }) {
  return (
    <section id="fuentes" className="landing__seccion landing__papel">
      <div className="landing__marco flex flex-col gap-10 lg:gap-14">
        <div className="flex flex-col gap-4">
          <h2 className="landing__h2">Alcance y fuentes.</h2>
          <p className="landing__cuerpo text-ink-soft">
            Hoy las capas cubren Córdoba, Santiago del Estero y Chaco. Un lote
            en otra provincia se guarda igual, pero todavía no se puede
            verificar.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <p className="landing__cita">
            Dato faltante no significa lote aprobado.
          </p>
          <p className="landing__cuerpo text-ink-soft">
            Sin observaciones exige evidencia positiva de las dos capas. Un lote
            en una provincia sin OTBN cargado no se evalúa como favorable.
          </p>
        </div>

        <ul className="border-b border-line">
          {fuentes.map((fuente, i) => (
            <RevelarEnVista
              key={fuente.id}
              as="li"
              indice={i}
              className="flex flex-col gap-2 border-t border-line py-5"
            >
              <div className="flex flex-col gap-1 lg:flex-row lg:items-baseline lg:justify-between lg:gap-8">
                <p className="text-lg font-semibold">
                  {fuente.url ? (
                    <a
                      href={fuente.url}
                      className={ENLACE_TITULO}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {fuente.titulo}
                    </a>
                  ) : (
                    fuente.titulo
                  )}
                </p>
                <p className="shrink-0 text-xs text-ink-soft">
                  {ROL[fuente.rol]}
                </p>
              </div>

              <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-soft">
                <span>{fuente.organismo}</span>
                {fuente.vigencia ? (
                  <span>Vigencia del dato: {fuente.vigencia}</span>
                ) : null}
              </p>

              {fuente.caveat ? (
                <details className="text-sm">
                  {/* No `display` override: anything but list-item drops the
                      native marker, and the marker is the only affordance
                      here. The touch target comes from padding instead. */}
                  <summary className="tap cursor-pointer rounded-sm py-4 font-semibold focus-ink">
                    Advertencias y licencia
                  </summary>
                  <div className="flex flex-col gap-2 pb-2">
                    <p className="max-w-[70ch] leading-relaxed text-alerta">
                      Advertencia: {fuente.caveat}
                    </p>
                    <p className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-soft">
                      {fuente.instrumento ? (
                        <span>{fuente.instrumento}</span>
                      ) : null}
                      {fuente.cobertura ? (
                        <span>Cobertura: {fuente.cobertura.join(", ")}</span>
                      ) : null}
                      {fuente.consultadaEl ? (
                        <span>Consultada el {fuente.consultadaEl}</span>
                      ) : null}
                    </p>
                    {fuente.licencia ? (
                      <p className="max-w-[70ch] text-xs leading-relaxed text-ink-soft">
                        {fuente.licencia}
                      </p>
                    ) : null}
                  </div>
                </details>
              ) : null}
            </RevelarEnVista>
          ))}
        </ul>

        <p className="text-sm text-ink-soft">
          El uso de fuentes públicas no implica aval institucional de sus
          organismos.
        </p>
      </div>
    </section>
  )
}
