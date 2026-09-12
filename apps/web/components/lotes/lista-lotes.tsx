import Link from "next/link"

import { EstadoVerificacion } from "@/components/lotes/estado-verificacion"
import { estadoDeLote, type LoteListado } from "@/lib/lotes/listado"
import { formatFecha, formatHa, nombreProvincia } from "@/lib/ui/verdict"

/**
 * One lote per row, and the row answers three questions in reading order:
 * which field is this, what does the verification say, and — by being one tap —
 * what can I do about it.
 *
 * The name leads. It used to sit behind a 7rem column of solid verdict colour
 * bled to the left edge, which meant the first thing the eye landed on was the
 * answer rather than the field it belonged to, and which spent a quarter of a
 * 28rem panel on at most seventeen characters. The verdict now holds a narrower
 * block in a right-hand column, where the blocks line up with each other and
 * the names line up with each other, so rows can be compared down either edge.
 */
function Fila({ lote }: { lote: LoteListado }) {
  const estado = estadoDeLote(lote)

  /*
   * Dated only when there is a verdict to date. `verifiedAt` survives a stale
   * row — it points at the check the edit invalidated — and printing it beside
   * "Sin verificar" would read as a verification this lote does not have.
   */
  const pie = estado.esVeredicto
    ? lote.verifiedAt
      ? `Verificado ${formatFecha(lote.verifiedAt)}`
      : null
    : estado.nota

  return (
    <Link
      href={`/lotes/${lote.id}`}
      /*
       * The focus outline is drawn inward. Every other control in the system
       * holds its ring 2px clear of the element, but a row runs the full width
       * of a panel that clips its own overflow: outside, the ring would be
       * shaved off at both ends.
       */
      /*
       * Both columns can be squeezed to nothing — `minmax(0, …)` on each —
       * because at 200% text zoom a fixed 8rem verdict block is 256px and
       * would push the row off a phone. Squeezed, the state wraps and the row
       * grows instead. Nothing is ever clipped to make room.
       */
      className="grid min-h-[4.5rem] grid-cols-[minmax(0,1fr)_minmax(0,auto)] items-start gap-x-3 gap-y-1 px-4 py-3 transition-colors duration-150 hover:bg-field focus-visible:bg-field focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink active:bg-field sm:px-6"
    >
      {/*
       * Wraps as far as it needs to. Two lines covers every name we have seen,
       * but a clamp would hide the one thing a producer identifies a field by,
       * and a name half-read is worse than a row one line taller.
       */}
      <span className="col-start-1 row-start-1 text-[1.0625rem] leading-snug font-semibold">
        {lote.nombre}
      </span>

      <span className="col-start-2 row-start-1 justify-self-end">
        <EstadoVerificacion estado={estado} />
      </span>

      {/*
       * Size and province, and no RENSPA. Seventeen characters of establishment
       * code wrapped every row onto a second line in a 28rem panel, for
       * something nobody scans a list by — it is a property of the
       * establishment, not of this field. The detail screen and the PDF still
       * carry it.
       */}
      <span className="col-start-1 row-start-2 text-sm leading-snug text-ink-soft">
        {formatHa(lote.areaHa)} ha · {nombreProvincia(lote.provincia)}
      </span>

      {pie ? (
        <span className="col-start-2 row-start-2 justify-self-end text-right text-xs leading-snug text-ink-soft">
          {pie}
        </span>
      ) : null}
    </Link>
  )
}

export function ListaLotes({ lotes }: { lotes: LoteListado[] }) {
  return (
    <ul className="divide-y divide-[var(--color-line)]">
      {lotes.map((lote) => (
        <li key={lote.id}>
          <Fila lote={lote} />
        </li>
      ))}
    </ul>
  )
}
