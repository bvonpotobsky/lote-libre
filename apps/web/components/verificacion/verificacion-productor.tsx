"use client"

import Link from "next/link"
import { useCallback, useState } from "react"

import type { ProducerVerification } from "@/lib/services/producer-verification"

const ESTADO_CLASE: Record<string, string> = {
  Habilitado: "bg-verde text-white",
  Vigente: "bg-verde text-white",
  "No habilitado": "bg-rojo text-white",
  "No vigente": "bg-rojo text-white",
  "No encontrado": "bg-amarillo text-ink",
  "No aplica": "bg-field text-ink-soft",
  "Requiere regularización": "bg-amarillo text-ink",
}

export function VerificacionProductor({ cuit }: { cuit: string | null }) {
  const [resultado, setResultado] = useState<ProducerVerification | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const consultar = useCallback(async () => {
    const inicio = Date.now()
    setCargando(true)
    setError(null)
    try {
      const response = await fetch("/api/verificacion-productor", { cache: "no-store" })
      const body = await response.json()
      if (!response.ok || !body.ok) throw new Error(body.error?.message ?? "No pudimos completar la consulta.")
      setResultado(body.data)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos completar la consulta.")
    } finally {
      const restante = 7000 - (Date.now() - inicio)
      if (restante > 0) await new Promise((resolve) => window.setTimeout(resolve, restante))
      setCargando(false)
    }
  }, [])

  if (!cuit) {
    return (
      <main className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-8 sm:px-6">
        <div>
          <p className="text-ink-soft text-sm">Verificación del productor</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Necesitamos tu CUIT</h1>
        </div>
        <section className="grid gap-4 rounded-lg border border-line bg-white p-5 sm:p-6">
          <p className="leading-relaxed">La consulta toma el CUIT cargado en tu perfil. Todavía no hay uno asociado a tu cuenta.</p>
          <Link href="/perfil" className="bg-ink text-paper tap focus-ink inline-flex min-h-13 items-center justify-center rounded-md px-4 font-semibold">Cargar CUIT</Link>
        </section>
      </main>
    )
  }

  return (
    <main className="mx-auto grid w-full max-w-3xl gap-8 px-4 py-8 sm:px-6">
      <div>
        <p className="text-ink-soft text-sm">Verificación del productor</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Situación registral</h1>
        <p className="text-ink-soft mt-3">CUIT {cuit}</p>
      </div>

      {cargando ? (
        <section role="status" className="grid min-h-48 place-items-center gap-3 rounded-lg border border-line bg-white p-6 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-line border-t-ink" aria-hidden />
          <p className="font-semibold">Consultando ARCA, SISA y SENASA…</p>
          <p className="text-ink-soft text-sm">Estamos reuniendo los registros asociados a tu CUIT.</p>
        </section>
      ) : error ? (
        <section className="grid gap-4 rounded-lg border border-line bg-white p-5 sm:p-6">
          <p role="alert" className="border-rojo text-rojo border-l-4 py-2 pl-3 font-medium">{error}</p>
          <button type="button" onClick={() => void consultar()} className="bg-ink text-paper tap focus-ink min-h-13 rounded-md px-4 font-semibold">Reintentar consulta</button>
        </section>
      ) : resultado ? (
        <>
          <button type="button" onClick={() => void consultar()} className="bg-ink text-paper tap focus-ink min-h-13 rounded-md px-4 font-semibold" disabled={cargando}>
            Buscar información nuevamente
          </button>
          <section className="grid gap-2 rounded-lg bg-verde px-5 py-5 text-white sm:px-6">
            <h2 className="text-2xl font-bold tracking-tight">Verificación del productor completada</h2>
            <p className="leading-relaxed">El productor cumple con las condiciones registrales básicas para trasladar granos.</p>
            <p className="text-sm opacity-90">Consultado el {new Date(resultado.consultadoEn).toLocaleString("es-AR")}</p>
          </section>
          <div className="grid gap-4">
            {resultado.checks.map((check) => (
              <article key={check.id} className="grid gap-3 rounded-lg border border-line bg-white p-5 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div><p className="font-bold">{check.organismo}</p><p className="text-ink-soft mt-1 text-sm">{check.titulo}</p></div>
                  <span className={`inline-flex w-fit items-center rounded-sm px-3 py-2 text-xs font-bold ${ESTADO_CLASE[check.estado]}`}>{check.estado}</span>
                </div>
                <p className="text-ink-soft text-sm leading-relaxed">{check.detalle}</p>
              </article>
            ))}
          </div>
          <aside className="border-alerta bg-field text-alerta border-l-4 p-4 text-sm leading-relaxed">
            <strong>Verificación preliminar.</strong> Esta consulta es simulada para la demostración y no constituye una certificación oficial.
          </aside>
        </>
      ) : (
        <section className="grid gap-4 rounded-lg border border-line bg-white p-5 sm:p-6">
          <p className="leading-relaxed">El CUIT está listo para consultar sus registros asociados.</p>
          <button type="button" onClick={() => void consultar()} className="bg-ink text-paper tap focus-ink min-h-13 rounded-md px-4 font-semibold">
            Buscar información
          </button>
        </section>
      )}
    </main>
  )
}
