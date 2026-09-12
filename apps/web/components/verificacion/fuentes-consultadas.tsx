import type { SourceRef } from "@/lib/db/schema"
import { formatFecha } from "@/lib/ui/verdict"

/**
 * The provenance footer of a verdict. It lives outside `PanelVeredicto` so the
 * satellite comparison can sit between the reasoning and the citations: the
 * sidebar reads verdict, then the evidence, then what the evidence was read
 * from.
 *
 * Folded, and closed by default. Provenance is cited in full — the list is in
 * the initial HTML, not fetched on open — but it is the last thing anyone reads
 * in a session, and unfolded it was the note the sidebar ended on.
 */
export function FuentesConsultadas({ fuentes }: { fuentes: SourceRef[] }) {
  return (
    <details className="border-line border-t">
      {/* No `display` override: anything but list-item drops the native
          marker, and the marker is the only affordance that this folds. The
          touch target comes from padding instead. The heading stays inside the
          summary — the sidebar has sibling h2s and losing this one breaks
          heading navigation — and `inline` is what keeps the marker on its
          line instead of alone above a block box. */}
      <summary className="tap focus-ink cursor-pointer rounded-sm py-4">
        <h2 className="inline font-semibold">Fuentes consultadas</h2>
      </summary>
      <ul className="grid gap-3 pb-3">
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
    </details>
  )
}
