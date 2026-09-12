import type { LoteVerification } from "@/lib/db/schema"
import { REASON_COPY, type VerdictReason } from "@/lib/services/verdict"
import {
  OTBN_UI,
  VERDICT_UI,
  formatFecha,
  formatHa,
  formatPct,
} from "@/lib/ui/verdict"

function Dato({
  etiqueta,
  valor,
  detalle,
}: {
  etiqueta: string
  valor: string
  detalle?: string
}) {
  return (
    <div className="border-line border-t py-3 first:border-t-0 first:pt-0">
      <p className="text-ink-soft text-sm">{etiqueta}</p>
      <p className="mt-0.5 text-lg font-semibold">{valor}</p>
      {detalle ? (
        <p className="text-ink-soft mt-0.5 text-sm leading-snug">{detalle}</p>
      ) : null}
    </div>
  )
}

export function PanelVeredicto({
  verificacion,
}: {
  verificacion: LoteVerification
}) {
  if (verificacion.status !== "ready" || !verificacion.verdict) return null

  const ui = VERDICT_UI[verificacion.verdict]
  const otbn = verificacion.otbnCategory
    ? OTBN_UI[verificacion.otbnCategory]
    : null
  const motivos = (verificacion.reasons as VerdictReason[]) ?? []

  return (
    <section className="grid gap-5">
      <div className={`${ui.bg} ${ui.texto} rounded-lg px-5 py-4`}>
        <p className="text-2xl font-bold tracking-tight">{ui.titulo}</p>
        <p className="mt-1 text-sm leading-relaxed opacity-95">{ui.resumen}</p>
        <p className="mt-3 text-xs opacity-90">
          Verificado el {formatFecha(verificacion.createdAt)}
        </p>
      </div>

      <div>
        <Dato
          etiqueta="Pérdida de bosque posterior al 31/12/2020"
          valor={formatPct(verificacion.forestLossPct)}
          detalle={
            verificacion.forestLossHa
              ? `${formatHa(verificacion.forestLossHa)} ha dentro del lote${
                  verificacion.forestLossFirstYear
                    ? `, detectadas desde ${verificacion.forestLossFirstYear}`
                    : ""
                }`
              : "No se detectó pérdida dentro del lote."
          }
        />
        {otbn ? (
          <div className="border-line border-t py-3">
            <p className="text-ink-soft text-sm">
              Ordenamiento de Bosques Nativos
            </p>
            <p className="mt-1 flex items-center gap-2 text-lg font-semibold">
              <span
                aria-hidden
                className={`${otbn.swatch} inline-block h-4 w-4 rounded-sm`}
              />
              {otbn.etiqueta}
              {verificacion.otbnPct ? (
                <span className="text-ink-soft text-sm font-normal">
                  {formatPct(verificacion.otbnPct)} del lote
                </span>
              ) : null}
            </p>
            <p className="text-ink-soft mt-0.5 text-sm leading-snug">
              {otbn.detalle}
            </p>
          </div>
        ) : null}
      </div>

      {motivos.length > 0 ? (
        <div>
          <h2 className="font-semibold">Por qué</h2>
          <ul className="mt-2 grid gap-2">
            {motivos.map((motivo) => (
              <li
                key={motivo}
                className="border-line text-ink-soft border-l-2 pl-3 text-sm leading-relaxed"
              >
                {REASON_COPY[motivo] ?? motivo}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <h2 className="font-semibold">Fuentes consultadas</h2>
        <ul className="mt-2 grid gap-3">
          {verificacion.sources.map((fuente) => (
            <li key={fuente.id} className="text-sm leading-relaxed">
              <p className="font-medium">{fuente.label}</p>
              <p className="text-ink-soft">
                Vigencia {fuente.vintage} · consultada el{" "}
                {formatFecha(fuente.consultedAt)}
              </p>
              {fuente.caveat ? (
                <p className="text-alerta mt-0.5 text-[13px]">
                  {fuente.caveat}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
