"use client"

import { useId, useState } from "react"

import { formatFecha } from "@/lib/ui/verdict"

export type VentanaImagen = {
  url: string
  dateFrom: string
  dateTo: string
  cloudAvgPct: number | null
  windowSource: "xweather" | "ampliada" | "fallback"
  isEmpty: boolean
}

function Pie({ titulo, ventana }: { titulo: string; ventana: VentanaImagen }) {
  return (
    <div className="text-sm leading-snug">
      <p className="font-semibold">{titulo}</p>
      <p className="text-ink-soft">
        {formatFecha(ventana.dateFrom)} a {formatFecha(ventana.dateTo)}
        {ventana.cloudAvgPct !== null ? (
          <> · {ventana.cloudAvgPct.toFixed(1)} % de nubes</>
        ) : null}
      </p>
      {ventana.windowSource === "fallback" ? (
        <p className="text-ink-soft mt-0.5 text-xs">
          Sin datos de nubosidad: se usó el rango amplio y la pasada menos
          nubosa que encontró Copernicus.
        </p>
      ) : null}
      {ventana.windowSource === "ampliada" ? (
        <p className="text-ink-soft mt-0.5 text-xs">
          La ventana despejada no tuvo imágenes bajo 30 % de nubes, así que se
          amplió al período completo.
        </p>
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
 */
export function Comparador({
  referencia,
  actual,
}: {
  referencia: VentanaImagen
  actual: VentanaImagen
}) {
  const [posicion, setPosicion] = useState(50)
  const id = useId()

  return (
    <div className="grid gap-3">
      <div className="border-line relative aspect-square w-full overflow-hidden rounded-lg border bg-black">
        <img
          src={actual.url}
          alt={`Índice de vegetación actual del lote, ${formatFecha(actual.dateFrom)} a ${formatFecha(actual.dateTo)}`}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - posicion}% 0 0)` }}
        >
          <img
            src={referencia.url}
            alt={`Índice de vegetación de referencia de 2020, ${formatFecha(referencia.dateFrom)} a ${formatFecha(referencia.dateTo)}`}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>

        <div
          aria-hidden
          className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
          style={{ left: `${posicion}%` }}
        />

        <span className="absolute top-2 left-2 rounded bg-black/70 px-2 py-1 text-xs font-semibold text-white">
          2020
        </span>
        <span className="absolute top-2 right-2 rounded bg-black/70 px-2 py-1 text-xs font-semibold text-white">
          Hoy
        </span>

        {referencia.isEmpty || actual.isEmpty ? (
          <p className="absolute inset-x-2 bottom-2 rounded bg-black/75 px-2 py-1.5 text-xs text-white">
            Una de las dos ventanas no tuvo imágenes con menos de 30 % de nubes.
            Probá ampliando el rango de fechas.
          </p>
        ) : null}
      </div>

      <p className="text-ink-soft text-sm leading-relaxed">
        Índice de vegetación (NDVI): el verde intenso es monte en pie, el
        amarillo y el rojo son suelo desnudo o cultivo cosechado. Mirá sobre
        todo la <strong className="font-semibold">textura</strong>: el monte es
        moteado e irregular, el desmonte deja fajas rectas.
      </p>
      <p className="text-ink-soft text-xs leading-relaxed">
        Las dos ventanas pueden caer en estaciones distintas, así que parte de
        la diferencia de color es estacional. El veredicto no sale de estas
        imágenes: sale de las capas oficiales citadas arriba.
      </p>

      <label htmlFor={id} className="sr-only">
        Deslizá para comparar 2020 con la imagen actual
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
        <Pie titulo="Referencia 2020" ventana={referencia} />
        <Pie titulo="Imagen actual" ventana={actual} />
      </div>
    </div>
  )
}
