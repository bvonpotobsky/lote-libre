import Link from "next/link"

import { Marca } from "@/components/marca/marca"
import { ATRIBUCION } from "@/lib/landing/ejemplo-capas.generated"

const ENLACE =
  "focus-ink inline-flex min-h-11 items-center rounded-sm text-sm underline decoration-1 underline-offset-4"

const SITIO = [
  { href: "#como-funciona", texto: "Cómo funciona" },
  { href: "#resultados", texto: "Resultados" },
  { href: "#fuentes", texto: "Fuentes" },
]

const FUENTES = [
  {
    href: "https://geo.ambiente.gob.ar/",
    texto: "UMSEF y OTBN: geo.ambiente.gob.ar",
  },
  { href: "https://www.ign.gob.ar/", texto: "Instituto Geográfico Nacional" },
  {
    href: "https://dataspace.copernicus.eu/",
    texto: "Copernicus Data Space Ecosystem",
  },
]

/** Real links only. */
export function PieMarketing() {
  return (
    <footer className="border-t border-line">
      <div className="landing__marco grid gap-8 py-10 lg:grid-cols-12 lg:gap-8">
        <div className="flex flex-col gap-1 lg:col-span-4">
          <Marca className="h-5 w-auto self-start" />
          <p className="text-sm text-ink-soft">
            Trazabilidad EUDR para soja y ganadería
          </p>
          <p className="mt-3 text-sm text-ink-soft">
            Contacto:{" "}
            <a href="mailto:demo@lotelimpio.ar" className={ENLACE}>
              demo@lotelimpio.ar
            </a>
          </p>
        </div>

        <nav aria-label="Navegación del sitio" className="lg:col-span-4">
          <ul className="flex flex-col">
            {SITIO.map((enlace) => (
              <li key={enlace.href}>
                <a href={enlace.href} className={ENLACE}>
                  {enlace.texto}
                </a>
              </li>
            ))}
            <li>
              <Link href="/ingresar" className={ENLACE}>
                Ingresá
              </Link>
            </li>
            <li>
              <Link href="/crear-cuenta" className={ENLACE}>
                Creá tu cuenta
              </Link>
            </li>
          </ul>
        </nav>

        <div className="lg:col-span-4">
          <p className="text-xs font-semibold text-ink-soft">
            Fuentes de datos
          </p>
          <ul className="flex flex-col">
            {FUENTES.map((enlace) => (
              <li key={enlace.href}>
                <a
                  href={enlace.href}
                  className={ENLACE}
                  rel="noreferrer"
                  target="_blank"
                >
                  {enlace.texto}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-ink-soft">{ATRIBUCION}</p>
        </div>
      </div>
    </footer>
  )
}
