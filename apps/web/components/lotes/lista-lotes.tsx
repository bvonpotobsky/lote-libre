import Link from "next/link"

import type { LoteSummary } from "@/lib/lotes/service"
import { VERDICT_UI, formatHa, nombreProvincia } from "@/lib/ui/verdict"

/**
 * The verdict column, bled to the edge of the row.
 *
 * Colour never travels alone: roughly one man in twelve cannot separate red
 * from green, and this audience is mostly men working outdoors. The words are
 * the answer and the colour is the shortcut.
 */
function Indicador({ lote }: { lote: LoteSummary }) {
  if (lote.verdict) {
    const ui = VERDICT_UI[lote.verdict]
    return (
      <span
        className={`${ui.bg} ${ui.texto} flex w-24 shrink-0 items-center justify-center self-stretch px-2 py-3 text-center text-xs leading-tight font-bold sm:w-28 sm:text-sm`}
      >
        {ui.titulo}
      </span>
    )
  }

  /*
   * Three different silences, and they are not interchangeable. An edited lote
   * had an answer that its new outline invalidated — telling that producer "Sin
   * verificar" hides the fact that one tap gets the answer back. `verdict` is
   * withheld in all three cases, so the wording is the only place the
   * difference survives.
   */
  const texto = lote.verificationStale
    ? "Verificar de nuevo"
    : lote.verificationStatus === "failed"
      ? "Reintentar"
      : "Sin verificar"

  return (
    <span className="bg-field text-ink-soft flex w-24 shrink-0 items-center justify-center self-stretch px-2 py-3 text-center text-xs leading-tight font-semibold sm:w-28 sm:text-sm">
      {texto}
    </span>
  )
}

export function ListaLotes({ lotes }: { lotes: LoteSummary[] }) {
  return (
    <ul className="divide-y divide-[var(--color-line)]">
      {lotes.map((lote) => (
        <li key={lote.id}>
          <Link
            href={`/lotes/${lote.id}`}
            /*
             * The focus outline is drawn inward. Every other control in the
             * system holds its ring 2px clear of the element, but a row runs
             * the full width of a panel that clips its own overflow: outside,
             * the ring would be shaved off at both ends.
             */
            className="hover:bg-field focus-visible:bg-field focus-visible:outline-ink flex min-h-[4.5rem] items-stretch gap-4 focus-visible:outline-2 focus-visible:-outline-offset-2"
          >
            <Indicador lote={lote} />
            <span className="flex flex-1 flex-col justify-center py-3 pr-4">
              <span className="leading-snug font-semibold">{lote.nombre}</span>
              {/*
               * Size and province, and no RENSPA. Seventeen characters of
               * establishment code wrapped every row onto a second line in a
               * 28rem panel, for something nobody scans a list by — it is a
               * property of the establishment, not of this field. The detail
               * screen and the PDF still carry it.
               */}
              <span className="text-ink-soft mt-0.5 text-sm">
                {formatHa(lote.areaHa)} ha · {nombreProvincia(lote.provincia)}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
