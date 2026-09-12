"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"

import {
  ZONAS_URL,
  buscarSugerencias,
  decodificarZonas,
  type Camara,
  type Resultado,
  type Sugerencia,
  type Zona,
} from "@/lib/geo/zonas"

/**
 * The search box that gets a producer to their field before they draw it.
 *
 * Every decision worth testing lives in `lib/geo/zonas.ts` and
 * `lib/geo/coordenadas.ts`; this file is a fetch, some `useState` and the ARIA a
 * listbox needs. That split is not a preference — `vitest.config.ts` runs
 * `environment: "node"` with no jsdom, so a pure module is the only unit this
 * project can actually test, and leaving logic here would leave it uncovered.
 *
 * Hand-rolled rather than built on a combobox primitive, following the same call
 * `controles-lista.tsx` documents for its native `<select>`: there is no combobox
 * in `packages/ui` and neither cmdk nor Radix is a dependency. An `<input>` and a
 * `<ul>` are the whole widget.
 */

/**
 * The gazetteer, fetched once per page and shared by every mount.
 *
 * Module level, mirroring `lib/geo/provinces.ts`, with one deliberate difference:
 * that module caches its failure forever, which is right on a server and wrong
 * here. A producer's next focus IS the retry, and this control offers no other.
 */
let enVuelo: Promise<Zona[]> | null = null

function pedirZonas(): Promise<Zona[]> {
  enVuelo ??= fetch(ZONAS_URL)
    .then((respuesta) => {
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`)
      return respuesta.json()
    })
    .then(decodificarZonas)
    .catch((error: unknown) => {
      enVuelo = null
      throw error
    })
  return enVuelo
}

type Estado = "sin_pedir" | "cargando" | "listo" | "falla"

type Mensaje = { titulo: string; ayuda: string; problema: boolean }

/**
 * Every line this control can say, in one place.
 *
 * `problema: true` earns the red left rule from `cargar-lote.tsx`; the other two
 * are ordinary states, and a red rule on "still loading" would be a lie. Each
 * problem reads in two parts — what happened, then what to do — which is the
 * house shape for error copy.
 */
const COPY: Record<string, Mensaje> = {
  cargando: {
    titulo: "Cargando las localidades…",
    ayuda: "",
    problema: false,
  },
  vacio: {
    titulo: "Ninguna localidad se llama así.",
    ayuda: "Probá con otra parte del nombre, o pegá las coordenadas.",
    problema: false,
  },
  falla: {
    titulo: "No pudimos cargar las localidades.",
    ayuda: "Probá de nuevo en un momento, o pegá las coordenadas del lote.",
    problema: true,
  },
  fuera_de_argentina: {
    titulo: "Esas coordenadas caen fuera del país.",
    ayuda:
      "Revisá el orden de los números: primero la latitud (−33,89) y después la longitud (−60,57).",
    problema: true,
  },
  ilegible: {
    titulo: "No entendimos esos números.",
    ayuda:
      "Separá la latitud de la longitud con un punto y coma: −33,8911; −60,5746.",
    problema: true,
  },
  link_corto: {
    titulo: "Ese link no trae las coordenadas.",
    ayuda:
      "Abrilo en el navegador y copiá los números de la barra de direcciones.",
    problema: true,
  },
}

function mensajeDe(
  texto: string,
  estado: Estado,
  resultado: Resultado
): Mensaje | null {
  if (texto.trim() === "") return null
  // A pasted point answers before the gazetteer has even been asked for.
  if (resultado.sugerencias.length > 0) return null
  if (resultado.aviso !== null) return COPY[resultado.aviso] ?? null
  if (estado === "cargando") return COPY.cargando ?? null
  if (estado === "falla") return COPY.falla ?? null
  if (estado === "listo") return COPY.vacio ?? null
  return null
}

export function BuscadorZona({ onIr }: { onIr: (camara: Camara) => void }) {
  const idCampo = useId()
  const idLista = useId()

  const [texto, setTexto] = useState("")
  const [abierto, setAbierto] = useState(false)
  /** -1 means the typed text itself is active, which APG requires to stay editable. */
  const [activo, setActivo] = useState(-1)
  const [zonas, setZonas] = useState<readonly Zona[]>([])
  const [estado, setEstado] = useState<Estado>("sin_pedir")

  const campoRef = useRef<HTMLInputElement>(null)
  const listaRef = useRef<HTMLUListElement>(null)
  const cajaRef = useRef<HTMLDivElement>(null)

  const resultado = useMemo(
    () => buscarSugerencias(texto, zonas),
    [texto, zonas]
  )
  const mensaje = mensajeDe(texto, estado, resultado)
  const { sugerencias, total } = resultado
  const desplegado = abierto && (sugerencias.length > 0 || mensaje !== null)

  /**
   * Asked for on first focus: not on mount, not on the first keystroke.
   *
   * On mount this page is already fetching the MapLibre bundle, its worker, two
   * boundary layers, two anchor files, a glyph range and satellite tiles — a
   * ninth request for a feature many loads never use would compete with the tiles
   * that ARE the page. On the first keystroke the file lands after the producer
   * has stopped typing. Focus is the moment intent stops being ambiguous, and it
   * buys the whole typing latency as a head start.
   */
  function alEnfocar(): void {
    setAbierto(true)
    if (estado === "cargando" || estado === "listo") return
    setEstado("cargando")
    pedirZonas().then(
      (cargadas) => {
        setZonas(cargadas)
        setEstado("listo")
      },
      () => {
        setEstado("falla")
      }
    )
  }

  /*
   * The browser does not scroll for `aria-activedescendant`, so the active row is
   * brought into view by hand. Never smooth: the map's camera is the only motion
   * this system has.
   */
  useEffect(() => {
    if (activo < 0) return
    listaRef.current?.children[activo]?.scrollIntoView({ block: "nearest" })
  }, [activo])

  /*
   * Closing on an outside pointerdown, in the capture phase, rather than the
   * usual `preventDefault()` on each row's own pointerdown — that fix breaks
   * touch scrolling of the list, which is worse than the bug it solves. The blur
   * handler below covers Tab-away, which a pointer listener cannot see.
   */
  useEffect(() => {
    if (!desplegado) return
    const alApuntar = (evento: PointerEvent): void => {
      const destino = evento.target
      if (destino instanceof Node && cajaRef.current?.contains(destino)) return
      setAbierto(false)
      setActivo(-1)
    }
    document.addEventListener("pointerdown", alApuntar, true)
    return () => document.removeEventListener("pointerdown", alApuntar, true)
  }, [desplegado])

  function elegir(sugerencia: Sugerencia, conElDedo: boolean): void {
    onIr(sugerencia.camara)
    setAbierto(false)
    setActivo(-1)
    // A tap means "done searching, get the keyboard off my map"; Enter means
    // "I am at a keyboard and may want to refine".
    if (conElDedo) campoRef.current?.blur()
  }

  function alTeclear(evento: React.KeyboardEvent<HTMLInputElement>): void {
    const ultimo = sugerencias.length - 1

    if (evento.key === "ArrowDown") {
      evento.preventDefault()
      if (!desplegado) {
        setAbierto(true)
        setActivo(sugerencias.length > 0 ? 0 : -1)
        return
      }
      setActivo((actual) => Math.min(actual + 1, ultimo))
      return
    }

    if (evento.key === "ArrowUp") {
      evento.preventDefault()
      if (!desplegado) {
        setAbierto(true)
        setActivo(ultimo)
        return
      }
      // Past the first row the typed text becomes active again, and editable.
      setActivo((actual) => (actual <= 0 ? -1 : actual - 1))
      return
    }

    if (evento.key === "Enter") {
      // With nothing active the first row commits: forcing an explicit ArrowDown
      // after typing «pergam» is friction with a thumb.
      const elegida = sugerencias[activo >= 0 ? activo : 0]
      if (!elegida) return
      evento.preventDefault()
      elegir(elegida, false)
      return
    }

    if (evento.key === "Escape") {
      if (desplegado) {
        setAbierto(false)
        setActivo(-1)
        return
      }
      if (texto !== "") setTexto("")
      return
    }

    // Tab is never intercepted and never commits: committing on the way out of a
    // field surprises anyone who was only leaving it.
  }

  return (
    /*
     * Mirrors the zoom pair on the opposite corner — same insets, same white box,
     * same 1 px `line` border, same `overflow-hidden` so the list attaches to the
     * field with the hairline the two zoom buttons already share. No shadow: the
     * system has exactly three and none of them is elevation.
     *
     * `right-20` exists only to clear that zoom stack, which is 3.25rem plus its
     * border at `right-3`. If its width or insets change, this changes with it.
     *
     * `max-h` is tied to the map box and never to a pixel count. On /lotes/nuevo
     * the map floors at min-h-[42svh] — about 280 px on a small phone — and a
     * fixed `max-h-64` overflows it. That is not cosmetic: <Mapa> is absolute
     * inside a flex sibling of the form, and with no z-index the form paints over
     * the spillover, so the list would look arbitrarily guillotined.
     */
    <div
      ref={cajaRef}
      className="absolute top-3 right-20 left-3 flex max-h-[calc(100%-1.5rem)] flex-col sm:top-4 sm:right-24 sm:left-4 sm:max-h-[calc(100%-2rem)]"
    >
      <div className="flex min-h-0 flex-col overflow-hidden rounded-md border border-line bg-white transition-colors duration-150 focus-within:border-ink focus-within:ring-[3px] focus-within:ring-ink/50 sm:max-w-[22rem]">
        <div className="flex min-w-0 shrink-0 items-center">
          <label htmlFor={idCampo} className="sr-only">
            Buscar una localidad o pegar las coordenadas del lote
          </label>
          <input
            ref={campoRef}
            id={idCampo}
            /*
             * `type="text"`, not `type="search"` like its sibling in
             * controles-lista.tsx. Search brings WebKit's own cancel button, it
             * changes the iOS keyboard, and in some Safari versions it opens the
             * browser's history dropdown over this listbox. The explicit Borrar
             * button covers what that costs.
             *
             * 1 rem, never 0.875: below 16 px iOS zooms the page on focus, and
             * the map is what gets pushed off screen — along with every height
             * calculation on the wrapper above.
             */
            type="text"
            role="combobox"
            aria-expanded={desplegado}
            aria-controls={idLista}
            aria-autocomplete="list"
            aria-activedescendant={
              activo >= 0 ? `${idLista}-${activo}` : undefined
            }
            value={texto}
            onChange={(evento) => {
              setTexto(evento.target.value)
              setActivo(-1)
              setAbierto(true)
            }}
            onFocus={alEnfocar}
            onBlur={(evento) => {
              const siguiente = evento.relatedTarget
              if (
                siguiente instanceof Node &&
                cajaRef.current?.contains(siguiente)
              )
                return
              setAbierto(false)
              setActivo(-1)
            }}
            onKeyDown={alTeclear}
            placeholder="Localidad o coordenadas"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="go"
            className="tap min-w-0 flex-1 bg-transparent px-3 text-base outline-none placeholder:text-ink-soft"
          />
          {texto !== "" ? (
            <button
              type="button"
              onClick={() => {
                setTexto("")
                setActivo(-1)
                campoRef.current?.focus()
              }}
              className="tap shrink-0 border-l border-line px-4 text-sm font-semibold focus-ink"
            >
              Borrar
            </button>
          ) : null}
        </div>

        {desplegado ? (
          <>
            <span aria-hidden="true" className="h-px shrink-0 bg-line" />
            {sugerencias.length > 0 ? (
              <ul
                ref={listaRef}
                id={idLista}
                role="listbox"
                aria-label="Lugares encontrados"
                /*
                 * `overscroll-contain` is not optional: without it a thumb flick
                 * that reaches the end of the list starts panning the map
                 * underneath, on the one screen where that is most costly.
                 */
                className="min-h-0 overflow-y-auto overscroll-contain"
              >
                {sugerencias.map((sugerencia, indice) => (
                  <li
                    key={sugerencia.clave}
                    id={`${idLista}-${indice}`}
                    role="option"
                    /* Present on every row, false included: several screen
                     * readers treat a missing aria-selected as unselectable. */
                    aria-selected={indice === activo}
                    onPointerDown={() => elegir(sugerencia, true)}
                    /*
                     * `tap`, never `tap-compacto`. The compact exception is for an
                     * action riding in a header's row where width is the scarce
                     * axis and the action does not move the task forward. A
                     * suggestion row is the opposite on all three counts, and with
                     * 36 San Josés a mis-tap picks the wrong province.
                     *
                     * The active row is `bg-field`, which lista-lotes.tsx already
                     * uses for hover and focus: the ban on `field` is about
                     * decorative surfaces, not transient interaction states.
                     */
                    className={`flex tap cursor-default items-center gap-1.5 px-3 text-base transition-colors duration-150 ${
                      indice === activo ? "bg-field" : ""
                    }`}
                  >
                    <span className="shrink-0 font-semibold">
                      {sugerencia.titulo}
                    </span>
                    {sugerencia.detalle !== "" ? (
                      <span className="min-w-0 truncate text-ink-soft">
                        · {sugerencia.detalle}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}

            {total > sugerencias.length ? (
              <p className="shrink-0 border-t border-line px-3 py-2 text-sm text-ink-soft">
                Hay más. Agregá la provincia para achicar la lista.
              </p>
            ) : null}

            {mensaje !== null ? (
              /*
               * `role="status"`, never `role="alert"`: this control can fail on
               * every keystroke, and an assertive region would interrupt a screen
               * reader mid-word. There is no aria-live count either — a live
               * region plus aria-activedescendant double-announces every row in
               * both NVDA and VoiceOver.
               */
              <div
                role="status"
                className={`shrink-0 px-3 py-2 text-sm ${
                  mensaje.problema ? "border-l-4 border-rojo pl-3" : ""
                }`}
              >
                <p
                  className={`font-semibold ${mensaje.problema ? "text-rojo" : ""}`}
                >
                  {mensaje.titulo}
                </p>
                {mensaje.ayuda !== "" ? (
                  <p className="mt-0.5 leading-relaxed text-ink-soft">
                    {mensaje.ayuda}
                  </p>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  )
}
