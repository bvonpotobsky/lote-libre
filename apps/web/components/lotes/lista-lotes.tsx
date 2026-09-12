import Link from "next/link"

import type { LoteSummary } from "@/lib/lotes/service"
import {
  VERDICT_UI,
  formatHa,
  nombreProvincia,
} from "@/lib/ui/verdict"

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

  const pendiente = lote.verificationStatus === "failed"
  return (
    <span className="bg-field text-ink-soft flex w-24 shrink-0 items-center justify-center self-stretch px-2 py-3 text-center text-xs leading-tight font-semibold sm:w-28 sm:text-sm">
      {pendiente ? "Reintentar" : "Sin verificar"}
    </span>
  )
}

export function ListaLotes({ lotes }: { lotes: LoteSummary[] }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Tus lotes</h1>
        <Link
          href="/lotes/nuevo"
          className="bg-ink text-paper flex h-11 items-center rounded-md px-4 text-sm font-semibold"
        >
          Cargar un lote
        </Link>
      </div>

      <ul className="border-line mt-5 divide-y divide-[var(--color-line)] overflow-hidden rounded-lg border bg-white">
        {lotes.map((lote) => (
          <li key={lote.id}>
            <Link
              href={`/lotes/${lote.id}`}
              className="hover:bg-field flex min-h-[4.5rem] items-stretch gap-4 focus-visible:bg-[var(--color-field)]"
            >
              <Indicador lote={lote} />
              <span className="flex flex-1 flex-col justify-center py-3 pr-4">
                <span className="leading-snug font-semibold">{lote.nombre}</span>
                <span className="text-ink-soft mt-0.5 text-sm">
                  {formatHa(lote.areaHa)} ha ·{" "}
                  {nombreProvincia(lote.provincia)}
                  {lote.renspa ? ` · RENSPA ${lote.renspa}` : ""}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
