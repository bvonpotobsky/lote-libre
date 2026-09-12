import Image from "next/image"

import { ATRIBUCION } from "@/lib/landing/ejemplo-capas.generated"
import hero from "@/public/landing/hero.jpg"

import { BotonPrincipal } from "./boton-principal"
import { TrazoLote } from "./trazo-lote"

/**
 * Editorial block left, cartography right, bleeding to the edge on `lg`.
 * H1, bajada and CTA are in the initial HTML and never hidden; the only
 * motion is the outline drawing itself once over the raster.
 */
export function Hero() {
  return (
    <section className="hero landing__seccion landing__papel">
      <div className="landing__marco grid items-center gap-10 lg:grid-cols-12 lg:gap-8">
        <div className="flex flex-col gap-6 lg:col-span-6">
          <p className="text-base text-ink-soft">
            Aptitud legal y exportabilidad
          </p>
          <h1 className="landing__h1">
            El acopio va a pedir respaldo sobre este suelo.
          </h1>
          <p className="landing__cuerpo text-ink-soft">
            Aptitud OTBN y exportabilidad EUDR: dos veredictos distintos sobre
            el mismo contorno. Dibujá el lote sobre el satelital, contrastalo
            con las capas oficiales y llevate el documento listo para entregar.
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <BotonPrincipal href="/crear-cuenta">Creá tu cuenta</BotonPrincipal>
            <a
              href="#como-funciona"
              className="inline-flex tap items-center rounded-sm font-semibold underline decoration-1 underline-offset-4 focus-ink"
            >
              Cómo funciona
            </a>
          </div>
        </div>

        <figure className="lg:col-span-6 lg:-mr-[clamp(1.25rem,4vw,5rem)]">
          <div className="hero__camara">
            <div className="hero__marco relative aspect-[4/3] overflow-hidden rounded-md border border-line">
              <Image
                src={hero}
                alt="Imagen satelital Sentinel-2 del encuadre de ejemplo en el departamento Pellegrini, Santiago del Estero"
                priority
                sizes="(min-width: 1024px) 56vw, 100vw"
                className="h-full w-full object-cover"
              />
              <TrazoLote animado className="absolute inset-0 h-full w-full" />
              <span className="chip absolute top-3 left-3">
                Imagen satelital: evidencia visual
              </span>
              <span className="chip absolute bottom-3 left-3">
                Ejemplo ilustrativo · Dpto. Pellegrini, Santiago del Estero
              </span>
            </div>
          </div>
          <figcaption className="mt-2 text-xs text-ink-soft">
            {ATRIBUCION}
          </figcaption>
        </figure>
      </div>
    </section>
  )
}
