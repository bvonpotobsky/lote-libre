"use client"

import {
  ETIQUETA_FILTRO,
  type Criterios,
  type FiltroEstado,
} from "@/lib/lotes/listado"

/**
 * A chevron, and the only glyph in the panel.
 *
 * The system's three button treatments carry no icons, and this is not one: it
 * is the mark that tells a thumb this box opens a list rather than accepting
 * typing. Without it an `appearance-none` select is indistinguishable from the
 * search field directly above it.
 */
function Chevron() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 8"
      width="12"
      height="8"
      className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-ink-soft"
    >
      <path
        d="M1 1.5 6 6.5 11 1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      />
    </svg>
  )
}

export function ControlesLista({
  criterios,
  onCambio,
  opcionesEstado,
  conteo,
  total,
}: {
  criterios: Criterios
  onCambio: (criterios: Criterios) => void
  opcionesEstado: FiltroEstado[]
  conteo: Record<FiltroEstado, number>
  total: number
}) {
  /*
   * A filter nobody can use is chrome. With every lote in the same state there
   * is nothing to narrow, and the panel's scarcest axis is vertical: 52px of
   * permanent control costs a row of lotes on every screen.
   */
  const muestraEstado = opcionesEstado.length > 1

  return (
    <div className="grid gap-2 border-b border-line px-4 py-3 sm:px-6">
      <div className="flex min-w-0 items-center rounded-md border border-line transition-colors duration-150 focus-within:border-ink focus-within:ring-[3px] focus-within:ring-ink/50">
        <label htmlFor="buscar-lote" className="sr-only">
          Buscar un lote por nombre
        </label>
        <input
          id="buscar-lote"
          type="search"
          value={criterios.texto}
          onChange={(evento) =>
            onCambio({ ...criterios, texto: evento.target.value })
          }
          placeholder="Buscar por nombre"
          autoComplete="off"
          enterKeyHint="search"
          /*
           * 1rem, never 0.875rem: below 16px iOS zooms the whole page in on
           * focus, and the map is what gets pushed off screen when it does.
           * `appearance-none` drops WebKit's own clear button, which lands at
           * 16px in the corner of a 52px field — the explicit one beside it is
           * the target a gloved thumb can actually hit.
           */
          className="tap min-w-0 flex-1 appearance-none bg-transparent px-3 text-base outline-none placeholder:text-ink-soft [&::-webkit-search-cancel-button]:appearance-none"
        />
        {criterios.texto !== "" ? (
          <button
            type="button"
            onClick={() => onCambio({ ...criterios, texto: "" })}
            className="tap shrink-0 border-l border-line px-4 text-sm font-semibold focus-ink"
          >
            Borrar
          </button>
        ) : null}
      </div>

      {muestraEstado ? (
        <div className="relative min-w-0">
          <label htmlFor="filtrar-estado" className="sr-only">
            Filtrar por estado de verificación
          </label>
          <select
            id="filtrar-estado"
            value={criterios.estado}
            onChange={(evento) =>
              onCambio({
                ...criterios,
                estado: evento.target.value as Criterios["estado"],
              })
            }
            className="tap w-full appearance-none rounded-md border border-line bg-transparent pr-11 pl-3 text-base font-semibold focus-ink transition-colors duration-150"
          >
            <option value="todos">Todos los estados ({total})</option>
            {opcionesEstado.map((opcion) => (
              <option key={opcion} value={opcion}>
                {ETIQUETA_FILTRO[opcion]} ({conteo[opcion]})
              </option>
            ))}
          </select>
          <Chevron />
        </div>
      ) : null}
    </div>
  )
}
