import type { SourceRef } from "@/lib/db/schema"
import { formatFecha } from "@/lib/ui/verdict"

/**
 * The provenance footer of a verdict. It lives outside `PanelVeredicto` so the
 * satellite comparison can sit between the reasoning and the citations: the
 * sidebar reads verdict, then the evidence, then what the evidence was read
 * from.
 */
export function FuentesConsultadas({ fuentes }: { fuentes: SourceRef[] }) {
  return (
    <div>
      <h2 className="font-semibold">Fuentes consultadas</h2>
      <ul className="mt-2 grid gap-3">
        {fuentes.map((fuente) => (
          <li key={fuente.id} className="text-sm leading-relaxed">
            <p className="font-medium">{fuente.label}</p>
            <p className="text-ink-soft">
              Vigencia {fuente.vintage} · consultada el{" "}
              {formatFecha(fuente.consultedAt)}
            </p>
            {fuente.caveat ? (
              <p className="text-alerta mt-0.5 text-[13px]">{fuente.caveat}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
