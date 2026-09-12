import type { LoteVerification } from "@/lib/db/schema"
import { CAVEAT_APTITUD, filasAptitud } from "@/lib/ui/aptitud"
import { formatHa } from "@/lib/ui/verdict"

/**
 * The aptitude axis: how the lote's surface divides across the OTBN.
 *
 * Deliberately not a traffic light. Collapsing the split back to one colour is
 * exactly what the lookup used to do, and it is the information a purchase
 * turns on: Categoría I cannot be cleared at all, ever.
 *
 * The governing category and the reasons behind the verdict stay folded in the
 * panel below. This answers how much; that one answers why.
 */
export function PanelAptitud({
  verificacion,
  areaHa,
}: {
  verificacion: LoteVerification
  areaHa: number
}) {
  const reparto = verificacion.otbnBreakdown ?? []
  if (reparto.length === 0) return null

  // The consulted province's own warning about its layer, beside the figures it
  // qualifies. CAVEAT_APTITUD is the general statement about scale and
  // simplification; this one can say something far stronger — Chaco's declares
  // its polygons are "no utilizable para estadísticas de superficie", which is
  // exactly what this section computes. It stays in "Fuentes consultadas" too:
  // same text, two readers.
  const caveatOtbn = verificacion.sources.find((fuente) =>
    fuente.id.startsWith("otbn-"),
  )?.caveat

  return (
    <section className="grid gap-4">
      <div>
        <h2 className="font-semibold">Qué se puede hacer</h2>
        <p className="text-ink-soft mt-1 text-sm leading-relaxed">
          Ordenamiento Territorial de Bosques Nativos (Ley 26.331), sobre las{" "}
          {formatHa(areaHa)} ha del lote.
        </p>
      </div>

      <ul className="border-line border-t">
        {filasAptitud(reparto).map((fila) => (
          <li
            key={fila.bucket}
            className="border-line grid grid-cols-[auto_1fr_auto] items-baseline gap-x-3 border-b py-3"
          >
            <span
              aria-hidden
              className={`${fila.swatch} mt-1 inline-block h-4 w-4 rounded-sm`}
            />
            <div>
              <p className="font-semibold">{fila.etiqueta}</p>
              <p className="text-ink-soft text-sm leading-snug">
                {fila.detalle}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold tabular-nums">
                {fila.hectareas}
              </p>
              <p className="text-ink-soft text-sm tabular-nums">
                {fila.porcentaje}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="border-alerta text-alerta grid gap-2 border-l-4 py-2 pl-3 text-sm leading-relaxed">
        <p>{CAVEAT_APTITUD}</p>
        {caveatOtbn ? <p>{caveatOtbn}</p> : null}
      </div>
    </section>
  )
}
