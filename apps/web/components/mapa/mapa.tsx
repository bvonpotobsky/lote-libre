"use client"

import dynamic from "next/dynamic"

import type { MapaProps } from "./mapa-leaflet"

/**
 * Leaflet touches `window` at import time, so it cannot be server rendered.
 * Next 16 refuses `ssr: false` inside a Server Component, so this wrapper has
 * to be a Client Component — that is the whole reason it exists.
 */
const MapaLeaflet = dynamic(() => import("./mapa-leaflet"), {
  ssr: false,
  loading: () => (
    <div className="bg-field text-ink-soft flex h-full w-full items-center justify-center text-sm">
      Cargando el mapa…
    </div>
  ),
})

export function Mapa(props: MapaProps) {
  return <MapaLeaflet {...props} />
}
