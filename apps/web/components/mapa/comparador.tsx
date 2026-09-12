"use client"

import { useId, useState } from "react"

import type { Encuadre } from "@/lib/geo/encuadre"
import type { ImageLayer } from "@/lib/services/imagery"
import {
  FRAME_NOTE,
  HOLES_NOTE,
  LAYER_LEGEND,
  SEASONAL_NOTE,
  clearLine,
  cloudLine,
  referenceChip,
} from "@/lib/ui/imagery"
import { formatFecha } from "@/lib/ui/verdict"
import { ContornoLote } from "./contorno-lote"

export type VentanaImagen = {
  url: string
  dateFrom: string
  dateTo: string
  cloudAvgPct: number | null
  clearRatio: number | null
  windowSource: "xweather" | "ampliada" | "fallback"
  isEmpty: boolean
  pixelWidth: number
  pixelHeight: number
}

function Pie({ titulo, ventana }: { titulo: string; ventana: VentanaImagen }) {
  const limpieza = clearLine(ventana.clearRatio)
  const nubosidad = cloudLine(ventana.cloudAvgPct)

  return (
    <div className="text-sm leading-snug">
      <p className="font-semibold">{titulo}</p>
      <p className="text-ink-soft">
        {formatFecha(ventana.dateFrom)} a {formatFecha(ventana.dateTo)}
      </p>
      {limpieza ? <p className="text-ink-soft">{limpieza}</p> : null}
      {ventana.windowSource === "fallback" ? (
        <p className="text-ink-soft mt-0.5 text-xs">
          Sin datos de nubosidad: se usó el rango amplio y la pasada menos
          nubosa que encontró Copernicus.
        </p>
      ) : ventana.windowSource === "ampliada" ? (
        <p className="text-ink-soft mt-0.5 text-xs">
          La ventana despejada no tuvo imágenes utilizables, así que se amplió
          al período completo.
        </p>
      ) : nubosidad ? (
        <p className="text-ink-soft mt-0.5 text-xs">{nubosidad}</p>
      ) : null}
    </div>
  )
}

/**
 * Before/after wipe between the 2020 baseline and the most recent clear pass.
 *
 * Driven by a real range input rather than a drag handler: it works with a
 * thumb, with a mouse, and with a keyboard, and it announces itself to a screen
 * reader without any extra wiring.
 *
 * The frame takes its shape from the encuadre both windows were requested with,
 * so the outline drawn over them lands on the lote rather than near it, and the
 * placeholder that precedes them is already the right shape.
 */
export function Comparador({
  referencia,
  actual,
  capa,
  encuadre,
  contorno,
}: {
  referencia: VentanaImagen
  actual: VentanaImagen
  capa: ImageLayer
  encuadre: Encuadre
  contorno: string
}) {
  const [posicion, setPosicion] = useState(50)
  const id = useId()

  const ratio = `${encuadre.vista.ancho} / ${encuadre.vista.alto}`

  return (
    <div className="grid gap-3">
      <div
        className="border-line bg-field relative w-full overflow-hidden rounded-lg border"
        style={{ aspectRatio: ratio }}
      >
        <img
          src={actual.url}
          alt={`Imagen actual del lote, ${formatFecha(actual.dateFrom)} a ${formatFecha(actual.dateTo)}`}
          className="absolute inset-0 h-full w-full object-contain"
        />
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - posicion}% 0 0)` }}
        >
          <img
            src={referencia.url}
            alt={`Imagen de referencia de ${referenceChip(referencia.dateTo)}, ${formatFecha(referencia.dateFrom)} a ${formatFecha(referencia.dateTo)}`}
            className="absolute inset-0 h-full w-full object-contain"
          />
        </div>

        {/* Over both halves rather than inside the wipe: it is the same polygon
            in either window, so clipping it per half would make it flicker at
            the seam for no information — and drawing it continuously is exactly
            what lets the eye confirm the two halves are the same ground. Under
            the divider and the chips, so the control never hides behind it. */}
        <ContornoLote
          d={contorno}
          vista={encuadre.vista}
          className="pointer-events-none absolute inset-0 h-full w-full"
        />

        <div
          aria-hidden
          className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
          style={{ left: `${posicion}%` }}
        />

        <span className="absolute top-2 left-2 rounded bg-black/70 px-2 py-1 text-xs font-semibold text-white">
          {referenceChip(referencia.dateTo)}
        </span>
        <span className="absolute top-2 right-2 rounded bg-black/70 px-2 py-1 text-xs font-semibold text-white">
          Hoy
        </span>

        {referencia.isEmpty || actual.isEmpty ? (
          <p className="absolute inset-x-2 bottom-2 rounded bg-black/75 px-2 py-1.5 text-xs text-white">
            Una de las dos ventanas volvió sin imagen utilizable. Probá
            ampliando el rango de fechas.
          </p>
        ) : null}
      </div>

      <p className="text-ink-soft text-sm leading-relaxed">
        {LAYER_LEGEND[capa]}
      </p>
      <p className="text-ink-soft text-xs leading-relaxed">{FRAME_NOTE}</p>
      <p className="text-ink-soft text-xs leading-relaxed">{HOLES_NOTE}</p>
      <p className="text-ink-soft text-xs leading-relaxed">{SEASONAL_NOTE}</p>

      <label htmlFor={id} className="sr-only">
        Deslizá para comparar {referenceChip(referencia.dateTo)} con la imagen
        actual
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        value={posicion}
        onChange={(event) => setPosicion(Number(event.target.value))}
        className="accent-ink h-11 w-full"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Pie
          titulo={`Referencia ${referenceChip(referencia.dateTo)}`}
          ventana={referencia}
        />
        <Pie titulo="Imagen actual" ventana={actual} />
      </div>
    </div>
  )
}
