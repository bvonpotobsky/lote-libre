import { OTBN_PATHS, UMSEF_PATH } from "@/lib/landing/ejemplo-capas.generated"

import { EscenaCliente } from "./escena-cliente"
import { FiguraTerritorio } from "./figura-territorio"

const CAPITULOS = [
  {
    n: 1 as const,
    numero: "01",
    titulo: "Delimitá tu lote",
    texto:
      "Dibujá el contorno sobre el mapa o importá el KML o GeoJSON que ya tenés. El lote queda guardado con su geometría.",
  },
  {
    n: 2 as const,
    numero: "02",
    titulo: "Contrastá con fuentes oficiales",
    texto:
      "El sistema cruza el contorno con las capas oficiales implementadas: pérdida de bosque nativo UMSEF posterior al 31/12/2020 y categoría del OTBN provincial. La imagen satelital es contexto; las capas son la fuente.",
  },
  {
    n: 3 as const,
    numero: "03",
    titulo: "Descargá el respaldo",
    texto:
      "Descargás un documento con el resultado, las fuentes consultadas, las limitaciones de cobertura y una huella SHA-256 del contenido declarado.",
  },
]

/**
 * «Del territorio al documento». Three chapters, one lote, one frame.
 *
 * The markup is the complete, static version: each chapter carries its own
 * figure frozen at that chapter's state, so the story reads in full on a
 * phone, under reduced motion and without JavaScript. On a wide viewport with
 * motion welcome, the hook in EscenaCliente flips `data-escena="activa"` and
 * landing.css hides the frozen figures, pins the stage and drives one shared
 * figure from scroll progress.
 */
export function EscenaTerritorio() {
  return (
    <section
      id="como-funciona"
      className="escena landing__seccion landing__papel"
    >
      <Definiciones />

      <div className="landing__marco flex flex-col gap-12 lg:gap-20">
        <div className="flex flex-col gap-4">
          <h2 className="landing__h2">Del territorio al documento.</h2>
          <p className="landing__cuerpo text-ink-soft">
            Un mismo lote, tres pasos: se delimita, se contrasta con las capas
            oficiales y se organiza en un documento.
          </p>
        </div>

        <EscenaCliente className="escena__pista">
          <div className="escena__capitulos flex flex-col gap-16 lg:gap-24">
            {CAPITULOS.map((capitulo) => (
              <article
                key={capitulo.n}
                className="escena__capitulo grid gap-6 lg:grid-cols-12 lg:items-center lg:gap-10"
                data-n={capitulo.n}
              >
                <div className="flex flex-col gap-3 lg:col-span-5">
                  <h3 className="text-xl font-bold sm:text-2xl">
                    <span className="font-semibold text-ink-soft">
                      {capitulo.numero} /
                    </span>{" "}
                    {capitulo.titulo}
                  </h3>
                  <p className="landing__cuerpo text-ink-soft">
                    {capitulo.texto}
                  </p>
                </div>
                <FiguraTerritorio
                  estado={capitulo.n}
                  className="escena__figura-estatica lg:col-span-7"
                />
              </article>
            ))}
          </div>

          {/* The pinned stage. Hidden unless the hook activates the scene. */}
          <div className="escena__estrado">
            <FiguraTerritorio sticky />
          </div>
        </EscenaCliente>

        <p className="max-w-[70ch] text-sm leading-relaxed text-ink-soft">
          Geometría de ejemplo sobre capas oficiales publicadas (UMSEF
          2021–2024, OTBN Santiago del Estero 2015), simplificadas para esta
          ilustración. No es un resultado del sistema.
        </p>
      </div>
    </section>
  )
}

/** The heavy geometry, once; every figure references it with <use>. */
function Definiciones() {
  return (
    <svg
      width="0"
      height="0"
      aria-hidden="true"
      style={{ position: "absolute", width: 0, height: 0 }}
    >
      <defs>
        <path id="umsef-path" d={UMSEF_PATH} />
        {OTBN_PATHS.map((capa) => (
          <path key={capa.categoria} id={`otbn-${capa.categoria}`} d={capa.d} />
        ))}
        <pattern
          id="trama-umsef"
          patternUnits="userSpaceOnUse"
          width="14"
          height="14"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="14" stroke="#000000" strokeWidth="3" />
        </pattern>
      </defs>
    </svg>
  )
}
