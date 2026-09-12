"use client"

import { useRouter } from "next/navigation"

import { PanelLotes } from "@/components/lotes/panel-lotes"
import { Mapa } from "@/components/mapa/mapa"
import type { LoteConGeometria } from "@/lib/lotes/service"

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
 *
 * This component holds no state, and that is deliberate rather than incidental.
 * Searching and filtering live inside `PanelLotes`, a sibling of the map, so
 * nothing a producer types can re-render the map, rebuild the collection it is
 * given, or move its camera. The map always draws every lote.
 */
export function VistaLotes({ lotes }: { lotes: LoteConGeometria[] }) {
  const router = useRouter()

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

      <aside className="flex w-full flex-col border-t border-line bg-white lg:min-h-0 lg:w-[28rem] lg:shrink-0 lg:border-t-0 lg:border-l">
        <PanelLotes lotes={lotes} />
      </aside>
    </div>
  )
}
