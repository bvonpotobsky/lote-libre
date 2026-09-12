import Link from "next/link"

import { LOTE_PATH } from "@/lib/landing/ejemplo-capas.generated"

import { BotonPrincipal } from "./boton-principal"

/** Closing call, with a cropped detail of the lote outline as the only ornament. */
export function Cierre() {
  return (
    <section className="landing__seccion landing__papel">
      <div className="landing__marco grid gap-10 lg:grid-cols-12 lg:items-center">
        <div className="flex flex-col gap-8 lg:col-span-7">
          <h2 className="landing__h2">
            Antes de firmar, sabé qué estás comprando.
          </h2>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <BotonPrincipal href="/crear-cuenta">Creá tu cuenta</BotonPrincipal>
            <Link
              href="/ingresar"
              className="inline-flex tap items-center rounded-sm font-semibold underline decoration-1 underline-offset-4 focus-ink"
            >
              Ingresá
            </Link>
          </div>
        </div>

        <div className="hidden lg:col-span-4 lg:col-start-9 lg:block">
          <svg
            viewBox="640 340 420 420"
            className="w-full opacity-70"
            aria-hidden="true"
          >
            <path
              d={LOTE_PATH}
              fill="none"
              stroke="#000000"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
      </div>
    </section>
  )
}
