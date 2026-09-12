import Link from "next/link"

import { Mapa } from "@/components/mapa/mapa"

export function EstadoVacio() {
  return (
    <div className="relative h-[calc(100svh-3.5rem)]">
      <Mapa
        className="absolute inset-0 h-full w-full"
        etiqueta="Mapa del Chaco seco"
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 p-4 sm:p-6">
        <div className="pointer-events-auto mx-auto max-w-lg rounded-lg bg-white p-5 shadow-[0_-2px_24px_rgba(0,0,0,0.18)] sm:p-6">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Todavía no cargaste ningún lote
          </h1>
          <p className="text-ink-soft mt-2 text-sm leading-relaxed">
            Dibujá el contorno sobre el mapa, o subí el KML que ya exportaste de
            tu plataforma de agricultura de precisión.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Link
              href="/lotes/nuevo"
              className="bg-ink tap focus-ink text-paper flex items-center justify-center rounded-md px-4 text-base font-semibold"
            >
              Dibujar el primero
            </Link>
            <Link
              href="/lotes/nuevo?modo=importar"
              className="border-ink text-ink tap focus-ink flex items-center justify-center rounded-md border-2 px-4 text-base font-semibold"
            >
              Importar un KML
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
