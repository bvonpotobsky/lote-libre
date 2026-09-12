import {
  CALENDARIO_EUDR,
  FECHA_VERIFICACION_CALENDARIO,
  URL_COMISION_EUROPEA,
  type FuenteLanding,
  type RolFuente,
} from "@/lib/landing/fuentes"

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
 * The institutional list, derived from the same manifest the PDF cites.
 * Caveats are printed, not hidden; no licence badge is drawn for the MAyDS
 * layers because their published licence text is defective.
 */
export function Fuentes({ fuentes }: { fuentes: FuenteLanding[] }) {
  return (
    <section id="fuentes" className="landing__seccion landing__papel">
      <div className="landing__marco flex flex-col gap-10 lg:gap-14">
        <div className="flex flex-col gap-4">
          <h2 className="landing__h2">Fuentes públicas, citadas como tales.</h2>
          <p className="landing__cuerpo text-ink-soft">
            Cada documento imprime las fuentes consultadas, su vigencia y sus
            advertencias.
          </p>
        </div>

        <ul className="border-b border-line">
          {fuentes.map((fuente, i) => (
            <RevelarEnVista
              key={fuente.id}
              as="li"
              indice={i}
              className="grid gap-3 border-t border-line py-6 lg:grid-cols-12 lg:gap-8"
            >
              <div className="flex flex-col gap-1 lg:col-span-4">
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
                <p className="text-sm text-ink-soft">{fuente.organismo}</p>
                <p className="text-xs">{ROL[fuente.rol]}</p>
              </div>

              <div className="flex flex-col gap-2 lg:col-span-8">
                <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                  {fuente.vigencia ? (
                    <span>Vigencia del dato: {fuente.vigencia}</span>
                  ) : null}
                  {fuente.instrumento ? (
                    <span>{fuente.instrumento}</span>
                  ) : null}
                  {fuente.cobertura ? (
                    <span>Cobertura: {fuente.cobertura.join(", ")}</span>
                  ) : null}
                </p>
                {fuente.licencia ? (
                  <p className="text-xs text-ink-soft">{fuente.licencia}</p>
                ) : null}
                {fuente.caveat ? (
                  <p className="max-w-[70ch] text-sm leading-relaxed text-alerta">
                    Advertencia: {fuente.caveat}
                  </p>
                ) : null}
                {fuente.consultadaEl ? (
                  <p className="text-xs text-ink-soft">
                    Consultada el {fuente.consultadaEl}
                  </p>
                ) : null}
              </div>
            </RevelarEnVista>
          ))}
        </ul>

        <p className="text-sm text-ink-soft">
          El uso de fuentes públicas no implica aval institucional de sus
          organismos.
        </p>

        <aside className="flex max-w-[70ch] flex-col gap-4 border-t border-line pt-8">
          <h3 className="text-lg font-semibold">Calendario EUDR</h3>
          <dl className="flex flex-col gap-3">
            {CALENDARIO_EUDR.map((entrada) => (
              <div
                key={entrada.fecha}
                className="grid grid-cols-[6.5rem_1fr] gap-x-4"
              >
                <dt className="font-semibold">{entrada.fecha}</dt>
                <dd className="flex flex-col gap-0.5 text-sm text-ink-soft">
                  <span>{entrada.quien}</span>
                  <span className="text-xs">{entrada.instrumento}</span>
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-sm leading-relaxed text-ink-soft">
            Los plazos aplican a los operadores en la UE; al productor argentino
            le llegan como pedidos de la cadena comercial. Según la Comisión
            Europea, los productores y empresas fuera de la UE no tienen
            obligaciones directas bajo el EUDR salvo que coloquen productos en
            el mercado de la UE, pero pueden recibir pedidos de información.
          </p>
          <p className="text-sm leading-relaxed">
            Información verificada al {FECHA_VERIFICACION_CALENDARIO}; revisala
            antes de publicar.{" "}
            <a
              href={URL_COMISION_EUROPEA}
              className={ENLACE}
              rel="noreferrer"
              target="_blank"
            >
              Calendario oficial de la Comisión Europea
            </a>
          </p>
        </aside>
      </div>
    </section>
  )
}
