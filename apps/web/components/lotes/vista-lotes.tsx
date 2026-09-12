"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

import { ListaLotes } from "@/components/lotes/lista-lotes"
import { Mapa } from "@/components/mapa/mapa"
import type { LoteConGeometria } from "@/lib/lotes/service"
import { formatHa } from "@/lib/ui/verdict"

/**
 * The producer's own fields, seen at once.
 *
 * Map and list together rather than one instead of the other: the map answers
 * "where are my lotes", the list answers "which one needs attention", and the
 * list already carries the verdict wording and the links. Replacing it with a
 * map would have traded a scannable summary for a pretty one.
 *
 * The two are a split, not a stack. A map that occupies the top half of the
 * page and then scrolls away is a picture of a map: the moment the producer
 * reaches the row they care about, the field it belongs to is off screen. At
 * `lg` the map holds the viewport and the panel scrolls beside it, the same
 * map/panel partido the detail and load screens already use — and for the same
 * reason, so the three screens are one place.
 */
export function VistaLotes({ lotes }: { lotes: LoteConGeometria[] }) {
  const router = useRouter()

  const totalHa = lotes.reduce((suma, lote) => suma + lote.areaHa, 0)
  /*
   * A verdict is withheld — not flagged — once its polygon changes, so this one
   * count covers never verified, failed, and outdated alike. It is the number
   * that answers the only question this screen exists for: is there still
   * something between me and handing the paper over.
   */
  const sinVeredicto = lotes.filter((lote) => lote.verdict === null).length

  return (
    <div className="flex min-h-[calc(100svh-3.5rem)] flex-col lg:h-[calc(100svh-3.5rem)] lg:min-h-0 lg:flex-row">
      <div className="relative h-[38svh] shrink-0 sm:h-[42svh] lg:h-auto lg:min-h-0 lg:flex-1">
        <Mapa
          className="absolute inset-0 h-full w-full"
          etiqueta="Mapa de tus lotes"
          lotes={lotes.map((lote) => ({
            id: lote.id,
            nombre: lote.nombre,
            geometry: lote.geometry,
            verdict: lote.verdict,
            areaHa: lote.areaHa,
          }))}
          onSeleccionar={(id) => router.push(`/lotes/${id}`)}
        />
      </div>

      <aside className="border-line flex w-full flex-col border-t bg-white lg:min-h-0 lg:w-[28rem] lg:shrink-0 lg:border-t-0 lg:border-l">
        {/*
         * Capped and centred below `lg`, edge to edge above it. On a tablet the
         * verdict column would otherwise sit alone against a screen's worth of
         * empty row; on a phone the bleed is the point, and the panel is 28rem
         * anyway once it becomes a column.
         */}
        <div className="border-line mx-auto w-full max-w-3xl shrink-0 border-b p-4 sm:p-6 lg:max-w-none">
          <h1 className="text-2xl leading-tight font-bold tracking-tight">
            Tus lotes
          </h1>
          <p className="text-ink-soft mt-1 text-sm">
            {lotes.length === 1 ? "1 lote" : `${lotes.length} lotes`} ·{" "}
            {formatHa(totalHa)} ha
            {sinVeredicto > 0 ? ` · ${sinVeredicto} sin veredicto` : ""}
          </p>
          <Link
            href="/lotes/nuevo"
            className="bg-ink text-paper tap focus-ink mt-4 flex items-center justify-center rounded-md px-4 font-semibold"
          >
            Cargar un lote
          </Link>
        </div>

        <div className="mx-auto w-full max-w-3xl lg:max-w-none lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
          <ListaLotes lotes={lotes} />
        </div>
      </aside>
    </div>
  )
}
