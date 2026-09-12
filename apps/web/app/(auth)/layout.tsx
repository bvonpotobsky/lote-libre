import { redirect } from "next/navigation"

import { Marca } from "@/components/marca/marca"
import { getCurrentUser } from "@/lib/auth/guard"

const SEMAFORO = [
  {
    color: "bg-verde",
    texto: "text-white",
    titulo: "Sin observaciones",
    detalle: "Sin pérdida de bosque posterior al 31/12/2020.",
  },
  {
    color: "bg-amarillo",
    texto: "text-ink",
    titulo: "Con observaciones",
    detalle: "Categoría protegida del OTBN, o superposición mínima.",
  },
  {
    color: "bg-rojo",
    texto: "text-white",
    titulo: "No cumple",
    detalle: "Desmonte detectado dentro del lote después de la fecha de corte.",
  },
]

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
      <section className="flex flex-col justify-center gap-8 px-6 py-10 lg:px-14 lg:py-14">
        <div className="max-w-xl">
          <Marca className="h-5 w-auto" prioritaria />
          <h1 className="mt-3 text-3xl leading-[1.1] font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl">
            Demostrá que tu lote no viene de tierra desmontada.
          </h1>
          <p className="text-ink-soft mt-4 max-w-prose leading-relaxed">
            Europa le pide al importador, el importador al exportador, el
            exportador al acopio y el acopio a vos. Cargá el lote, verificalo
            contra las capas oficiales y descargá el documento para entregar.
          </p>
        </div>

        <ul className="grid max-w-xl gap-3">
          {SEMAFORO.map((estado) => (
            <li
              key={estado.titulo}
              className={`${estado.color} ${estado.texto} rounded-md px-4 py-3`}
            >
              <p className="font-bold">{estado.titulo}</p>
              <p className="mt-0.5 text-sm opacity-90">{estado.detalle}</p>
            </li>
          ))}
        </ul>

        <p className="text-ink-soft mt-2 max-w-prose text-xs leading-relaxed">
          Fuentes: Monitoreo de Superficie de Bosque Nativo e Inventario de
          Bosques Nativos (Ley 26.331) del Ministerio de Ambiente, e imágenes
          Sentinel-2 de Copernicus.
        </p>
      </section>

      <section className="border-line bg-white px-6 py-10 lg:border-l lg:px-10 lg:py-14">
        {children}
      </section>
    </div>
  )
}
