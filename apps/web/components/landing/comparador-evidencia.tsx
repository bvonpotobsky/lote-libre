"use client"

import Image from "next/image"
import { useId, useState } from "react"

import {
  POSICION_INICIAL,
  limitarPosicion,
  recorteDeVista,
} from "@/lib/landing/comparador"
import referencia from "@/public/landing/evidencia-2020.jpg"
import actual from "@/public/landing/hero.jpg"

import { TrazoLote } from "./trazo-lote"

/**
 * The landing's before/after wipe, to the same spec as the app's comparator
 * (DESIGN.md «Comparador»): two stacked images, a percentage clip-path, a 2 px
 * white divider with a 1 px black ring, and a native range with accent-color —
 * thumb, mouse and keyboard, announced to a screen reader with no extra wiring.
 *
 * It is a separate component, not a reuse of components/mapa/comparador.tsx.
 * That one is typed on a real lote's imagery windows — cloud cover, window
 * source, empty flag — and none of that exists on a marketing page; feeding it
 * invented telemetry is exactly the fabrication PRODUCT.md forbids. It is also
 * framed square, where this one is 4:3 to match MARCO/VISTA so the lote outline
 * registers with the raster pixel for pixel.
 *
 * Both images are committed bytes. The landing never calls Copernicus: the
 * app's imagery cache is a directory that does not survive a redeploy, and its
 * routes require a session.
 *
 * No transition on the divider. The wipe is direct manipulation, and a
 * transition would lag the thumb; that also leaves nothing for
 * prefers-reduced-motion to undo.
 */
export function ComparadorEvidencia({
  anioReferencia,
  anioActual,
}: {
  anioReferencia: number
  anioActual: number
}) {
  const [posicion, setPosicion] = useState(POSICION_INICIAL)
  const id = useId()

  return (
    <div className="grid gap-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md border border-line bg-black">
        <Image
          src={actual}
          alt={`Imagen satelital del encuadre de ejemplo en ${anioActual}: el lote aparece desmontado en fajas rectas.`}
          sizes="(min-width: 1024px) 60vw, 100vw"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: recorteDeVista(posicion) }}
        >
          <Image
            src={referencia}
            alt={`Imagen satelital del mismo encuadre en ${anioReferencia}: el monte se ve continuo sobre toda la superficie.`}
            sizes="(min-width: 1024px) 60vw, 100vw"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>

        <TrazoLote className="pointer-events-none absolute inset-0 h-full w-full" />

        <div
          aria-hidden="true"
          className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
          style={{ left: `${limitarPosicion(posicion)}%` }}
        />

        <span className="absolute top-3 left-3 rounded bg-black/70 px-2 py-1 text-xs font-semibold text-white">
          {anioReferencia}
        </span>
        <span className="absolute top-3 right-3 rounded bg-black/70 px-2 py-1 text-xs font-semibold text-white">
          {anioActual}
        </span>
      </div>

      <label htmlFor={id} className="sr-only">
        {`Deslizá para comparar la imagen de ${anioReferencia} con la de ${anioActual}`}
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        value={posicion}
        onChange={(evento) => {
          setPosicion(limitarPosicion(Number(evento.target.value)))
        }}
        className="h-11 w-full accent-paper focus-ink"
      />
    </div>
  )
}
