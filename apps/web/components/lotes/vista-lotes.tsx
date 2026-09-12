"use client"

import { useRouter } from "next/navigation"

import { ListaLotes } from "@/components/lotes/lista-lotes"
import { Mapa } from "@/components/mapa/mapa"
import type { LoteConGeometria } from "@/lib/lotes/service"

/**
 * The producer's own fields, seen at once.
 *
 * Map and list together rather than one instead of the other: the map answers
 * "where are my lotes", the list answers "which one needs attention", and the
 * list already carries the verdict wording and the links. Replacing it with a
 * map would have traded a scannable summary for a pretty one.
 */
export function VistaLotes({ lotes }: { lotes: LoteConGeometria[] }) {
  const router = useRouter()

  return (
    <div className="flex flex-col">
      <div className="relative h-[45svh] shrink-0 sm:h-[50svh]">
        <Mapa
          className="absolute inset-0 h-full w-full"
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

      <ListaLotes lotes={lotes} />
    </div>
  )
}
