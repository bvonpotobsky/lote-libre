"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import { ControlesLista } from "@/components/lotes/controles-lista"
import { ListaLotes } from "@/components/lotes/lista-lotes"
import {
  CRITERIOS_VACIOS,
  contarPorEstado,
  filtrarLotes,
  hayCriteriosActivos,
  opcionesDeEstado,
  type Criterios,
  type LoteListado,
} from "@/lib/lotes/listado"

const contarLotes = (cantidad: number): string =>
  cantidad === 1 ? "1 lote" : `${cantidad} lotes`

/**
 * The list side of the overview, and everything that can change about it.
 *
 * Every piece of state on this screen lives here rather than a level up, and
 * that placement is the point: the map is a sibling of this component, not a
 * child, so typing in the search box cannot re-render it. Filtering is a
 * property of what is drawn in this panel and of nothing else — the map keeps
 * receiving every lote, so a field never disappears from the picture because
 * of a word typed into a box.
 */
export function PanelLotes({ lotes }: { lotes: LoteListado[] }) {
  const [criterios, setCriterios] = useState<Criterios>(CRITERIOS_VACIOS)

  const opcionesEstado = useMemo(() => opcionesDeEstado(lotes), [lotes])
  const conteo = useMemo(() => contarPorEstado(lotes), [lotes])
  const visibles = useMemo(
    () => filtrarLotes(lotes, criterios),
    [lotes, criterios]
  )

  const filtrando = hayCriteriosActivos(criterios)
  const limpiar = () => setCriterios(CRITERIOS_VACIOS)

  return (
    <>
      {/*
       * Capped and centred below `lg`, edge to edge above it. On a tablet the
       * verdict column would otherwise sit alone against a screen's worth of
       * empty row; on a phone the bleed is the point, and the panel is 28rem
       * anyway once it becomes a column.
       */}
      <div className="mx-auto w-full max-w-3xl shrink-0 lg:max-w-none">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-line px-4 py-3 sm:px-6">
          <div>
            <h1 className="text-2xl leading-tight font-bold tracking-tight">
              Lotes
            </h1>
            {/*
             * The whole collection, every time. Nothing here is paginated and
             * nothing is fetched a page at a time, so this number is the real
             * total rather than the size of what happens to be loaded.
             */}
            <p className="mt-0.5 text-sm text-ink-soft">
              {contarLotes(lotes.length)}
            </p>
          </div>
          <Link
            href="/lotes/nuevo"
            className="flex tap items-center justify-center rounded-md bg-ink px-4 font-semibold text-paper focus-ink"
          >
            Cargar un lote
          </Link>
        </div>

        <ControlesLista
          criterios={criterios}
          onCambio={setCriterios}
          opcionesEstado={opcionesEstado}
          conteo={conteo}
          total={lotes.length}
        />

        {/*
         * Only while something is narrowing the list, and then it says both
         * what is hidden and how to get it back. At rest the panel does not
         * need a caption to explain that a list is a list.
         */}
        {filtrando ? (
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 sm:px-6">
            <p className="text-sm text-ink-soft" aria-live="polite">
              {visibles.length} de {contarLotes(lotes.length)}
            </p>
            <button
              type="button"
              onClick={limpiar}
              className="-mr-2 flex h-12 shrink-0 items-center px-2 text-sm font-semibold underline underline-offset-4 focus-ink"
            >
              Quitar filtros
            </button>
          </div>
        ) : null}
      </div>

      <div className="mx-auto w-full max-w-3xl lg:min-h-0 lg:max-w-none lg:flex-1 lg:overflow-y-auto">
        {visibles.length > 0 ? (
          <ListaLotes lotes={visibles} />
        ) : (
          <div className="px-4 py-10 sm:px-6">
            <p className="font-semibold">
              {criterios.texto.trim() !== ""
                ? "Ningún lote se llama así."
                : "Ningún lote está en ese estado."}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              {criterios.texto.trim() !== ""
                ? "Probá con otra parte del nombre. Tus lotes siguen todos en el mapa."
                : "Tus lotes siguen todos en el mapa."}
            </p>
          </div>
        )}
      </div>
    </>
  )
}
