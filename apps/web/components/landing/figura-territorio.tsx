import Image from "next/image"

import {
  OTBN_PATHS,
  type CategoriaOtbn,
} from "@/lib/landing/ejemplo-capas.generated"
import { VISTA } from "@/lib/landing/proyeccion"
import hero from "@/public/landing/hero.jpg"

import { TrazoLote } from "./trazo-lote"

/** The Ministry's own SLD colours; never harmonised with the palette. */
const COLOR_OTBN: Record<CategoriaOtbn, string> = {
  rojo: "#f10000",
  amarillo: "#eff60b",
  verde: "#33a02c",
}

const ETIQUETA_OTBN: Record<CategoriaOtbn, string> = {
  rojo: "Cat. I",
  amarillo: "Cat. II",
  verde: "Cat. III",
}

const ORDEN_OTBN: readonly CategoriaOtbn[] = ["rojo", "amarillo", "verde"]

const DESCRIPCION: Record<1 | 2 | 3, string> = {
  1: "Ilustración: el contorno del lote de ejemplo dibujado sobre la imagen satelital.",
  2: "Ilustración: las capas se separan en profundidad sobre el lote de ejemplo: imagen de contexto, pérdida de bosque nativo UMSEF, categorías del OTBN y límite del lote.",
  3: "Ilustración: las capas vuelven a alinearse y la vista queda encuadrada en una hoja de documento.",
}

type Props = {
  estado?: 1 | 2 | 3
  /**
   * The scroll-driven instance: no frozen `data-estado`, so it inherits the
   * custom properties the hook writes on the section root; legend always
   * present and faded in by CSS.
   */
  sticky?: boolean
  className?: string
}

/**
 * The four-plane stack: context raster, UMSEF, OTBN, lote — four sibling
 * elements inside one preserve-3d camera, because SVG groups cannot carry
 * depth. The heavy paths live once in the page's <defs> and are referenced
 * with <use>, so three frozen figures cost one copy of the geometry.
 */
export function FiguraTerritorio({
  estado = 1,
  sticky = false,
  className = "",
}: Props) {
  const vista = `0 0 ${VISTA.ancho} ${VISTA.alto}`
  const capasOtbn = ORDEN_OTBN.filter((categoria) =>
    OTBN_PATHS.some((capa) => capa.categoria === categoria)
  )

  return (
    <div
      className={`escena__figura ${className}`}
      data-estado={sticky ? undefined : estado}
      data-sticky={sticky ? "" : undefined}
    >
      <div
        className="escena__escenario"
        role="img"
        aria-label={sticky ? DESCRIPCION[2] : DESCRIPCION[estado]}
      >
        <div
          className="escena__hoja absolute inset-0 rounded-md border border-line bg-white"
          aria-hidden="true"
        >
          <div className="absolute inset-x-0 top-0 px-[5%] pt-[3.5%]">
            <p className="text-[0.8rem] leading-tight font-semibold">
              Declaración de debida diligencia — EUDR
            </p>
            <p className="mt-0.5 text-[0.7rem] leading-tight text-ink-soft">
              Reglamento (UE) 2023/1115. Fecha de corte de deforestación:
              31/12/2020.
            </p>
          </div>
          <div className="absolute inset-x-0 bottom-0 px-[5%] pb-[3%]">
            <p className="text-[0.7rem] leading-tight text-ink-soft">
              Huella SHA-256 del contenido declarado. Permite verificar que este
              documento no fue alterado.
            </p>
          </div>
        </div>

        <div className="escena__camara" aria-hidden="true">
          <div className="escena__capa" data-capa="imagen">
            <Image
              src={hero}
              alt=""
              sizes="(min-width: 1024px) 50vw, 100vw"
              loading="lazy"
              className="object-cover"
            />
          </div>
          <div className="escena__capa" data-capa="umsef">
            <svg viewBox={vista}>
              <use
                href="#umsef-path"
                fill="url(#trama-umsef)"
                fillOpacity="0.55"
                stroke="#000000"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
          <div className="escena__capa" data-capa="otbn">
            <svg viewBox={vista}>
              {capasOtbn.map((categoria) => (
                <use
                  key={categoria}
                  href={`#otbn-${categoria}`}
                  fill={COLOR_OTBN[categoria]}
                  fillOpacity="0.35"
                  stroke={COLOR_OTBN[categoria]}
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
          </div>
          <div className="escena__capa" data-capa="lote">
            <TrazoLote />
          </div>
        </div>
      </div>

      {(sticky || estado === 2) && <Leyenda categorias={capasOtbn} />}
    </div>
  )
}

function Leyenda({ categorias }: { categorias: readonly CategoriaOtbn[] }) {
  return (
    <ul className="escena__leyenda mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
      <li className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="inline-block h-3.5 w-3.5 rounded-[0.225rem] border border-line bg-[#4a3f33]"
        />
        Imagen de contexto (Sentinel-2)
      </li>
      <li className="flex items-center gap-2">
        <svg
          aria-hidden="true"
          width="14"
          height="14"
          viewBox="0 0 14 14"
          className="rounded-[0.225rem]"
        >
          <rect width="14" height="14" fill="#fafaf8" />
          <path
            d="M-2 4l6-6M-2 10l12-12M-2 16l18-18M4 16l12-12M10 16l6-6"
            stroke="#000000"
            strokeWidth="1.5"
          />
          <rect
            width="13"
            height="13"
            x="0.5"
            y="0.5"
            fill="none"
            stroke="#000000"
          />
        </svg>
        UMSEF: pérdida de bosque nativo desde 2021
      </li>
      <li className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>OTBN provincial</span>
        {ORDEN_OTBN.map((categoria) => (
          <span key={categoria} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block h-4 w-4 rounded-[0.225rem]"
              style={{
                backgroundColor: COLOR_OTBN[categoria],
                // Categories absent from the frame stay listed, but dimmed.
                opacity: categorias.includes(categoria) ? 1 : 0.4,
              }}
            />
            <span className="text-ink-soft">{ETIQUETA_OTBN[categoria]}</span>
          </span>
        ))}
      </li>
      <li className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="inline-block h-3.5 w-3.5 rounded-[0.225rem] border-[1.5px] border-black outline outline-2 outline-[#fafaf8]"
        />
        Límite del lote
      </li>
    </ul>
  )
}
