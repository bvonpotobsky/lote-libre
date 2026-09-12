import { redirect } from "next/navigation"

import { Marca } from "@/components/marca/marca"
import { getCurrentUser } from "@/lib/auth/guard"
import type { Verdict } from "@/lib/db/schema"
import { VERDICT_TRAZO, VERDICT_UI } from "@/lib/ui/verdict"

/** The order the product argues them: clean, then qualified, then not. */
const VEREDICTOS: Verdict[] = ["verde", "amarillo", "rojo"]

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Reads the real session, the same source the app shell uses. Deciding this
  // from the cookie in proxy.ts is what caused the redirect loop.
  if (await getCurrentUser()) redirect("/lotes")

  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[1fr_28rem]">
      <section className="flex flex-col justify-center px-6 py-10 lg:px-14 lg:py-14">
        <div className="flex max-w-xl flex-col gap-10">
          <div className="flex flex-col gap-4">
            {/* `self-start` or the flex column stretches the lockup to the
                column width and `h-5` squashes it. */}
            <Marca className="h-5 w-auto self-start" prioritaria />
            <h1 className="text-3xl leading-[1.1] font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl">
              Sabé qué se puede hacer con tu campo, y qué se puede vender desde
              él.
            </h1>
            <p className="max-w-prose leading-relaxed text-ink-soft">
              El Ordenamiento de Bosques Nativos dice cuántas hectáreas podés
              usar; el reglamento europeo, si la mercadería entra. Dibujá el
              lote sobre el satelital, verificalo contra las capas oficiales y
              descargá el documento que te va a pedir el acopio.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="font-semibold">Tres resultados posibles.</h2>

            {/* The same three rows the landing shows, read from the same
                source. Colour sits in a 24 px swatch instead of a full-bleed
                block: beside a form, three saturated bands shout over it. */}
            <ul className="border-b border-line">
              {VEREDICTOS.map((clave) => {
                const ui = VERDICT_UI[clave]
                return (
                  <li
                    key={clave}
                    className="grid grid-cols-[auto_1fr] gap-x-4 border-t border-line py-4"
                  >
                    <span
                      aria-hidden="true"
                      className={`${ui.bg} ${ui.texto} mt-0.5 flex h-6 w-6 items-center justify-center rounded`}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d={VERDICT_TRAZO[clave]} />
                      </svg>
                    </span>
                    <div>
                      <p className="font-bold">{ui.titulo}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">
                        {ui.resumen}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>

          <p className="max-w-prose text-xs leading-relaxed text-ink-soft">
            Cubrimos Córdoba, Santiago del Estero y Chaco. Fuentes: Monitoreo de
            Superficie de Bosque Nativo e Inventario de Bosques Nativos (Ley
            26.331) del Ministerio de Ambiente, e imágenes Sentinel-2 de
            Copernicus.
          </p>
        </div>
      </section>

      <section className="border-line bg-white px-6 py-10 lg:border-l lg:px-10 lg:py-14">
        {children}
      </section>
    </div>
  )
}
