import Link from "next/link"

import { Marca } from "@/components/marca/marca"

import { BotonPrincipal } from "./boton-principal"

const ANCLAS = [
  { href: "#como-funciona", texto: "Cómo funciona" },
  { href: "#resultados", texto: "Resultados" },
  { href: "#fuentes", texto: "Fuentes" },
]

const ENLACE =
  "focus-ink inline-flex min-h-11 items-center rounded-sm text-sm font-semibold underline decoration-1 underline-offset-4"

/**
 * Compact sticky header on paper. Below `lg` it is the mark and «Ingresá»;
 * the primary action lives in the hero, already on screen.
 */
export function EncabezadoMarketing({ sesion }: { sesion: boolean }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper">
      <div className="landing__marco flex h-14 items-center justify-between gap-6">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-sm focus-ink"
        >
          <Marca className="h-5 w-auto" prioritaria />
        </Link>

        <div className="flex items-center gap-5 lg:gap-7">
          <nav
            aria-label="Secciones"
            className="hidden lg:flex lg:items-center lg:gap-6"
          >
            {ANCLAS.map((ancla) => (
              <a
                key={ancla.href}
                href={ancla.href}
                className="inline-flex min-h-11 items-center rounded-sm text-sm text-ink-soft focus-ink hover:text-ink"
              >
                {ancla.texto}
              </a>
            ))}
          </nav>

          {sesion ? (
            <Link href="/lotes" className={ENLACE}>
              Tus lotes
            </Link>
          ) : (
            <>
              <Link href="/ingresar" className={ENLACE}>
                Ingresá
              </Link>
              <div className="hidden lg:block">
                <BotonPrincipal href="/crear-cuenta" compacto>
                  Creá tu cuenta
                </BotonPrincipal>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
