"use client"

import { useState, type FormEvent } from "react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

export function PerfilProductor({ nombre, cuit }: { nombre: string; cuit: string | null }) {
  const [valor, setValor] = useState(cuit ?? "")
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setGuardando(true)
    setMensaje(null)
    setError(null)
    const response = await fetch("/api/perfil", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cuit: valor }),
    })
    const result = await response.json()
    if (!response.ok || !result.ok) setError(result.error?.message ?? "No pudimos guardar el CUIT.")
    else {
      setValor(result.data.cuit)
      setMensaje("CUIT guardado. Ya podés iniciar la verificación.")
    }
    setGuardando(false)
  }

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-8 px-4 py-8 sm:px-6">
      <div>
        <p className="text-ink-soft text-sm">Perfil del productor</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{nombre}</h1>
        <p className="text-ink-soft mt-3 max-w-prose leading-relaxed">Cargá tu CUIT para consultar tu situación registral antes de trasladar granos.</p>
      </div>
      <form onSubmit={guardar} className="grid gap-5 rounded-lg border border-line bg-white p-5 sm:p-6">
        <div className="grid gap-2">
          <Label htmlFor="cuit" className="text-base">CUIT</Label>
          <Input id="cuit" value={valor} onChange={(event) => setValor(event.target.value)} placeholder="20-12345678-3" inputMode="numeric" required className="tap text-base" />
          <p className="text-ink-soft text-sm">Podés ingresarlo con o sin guiones.</p>
        </div>
        {error ? <p role="alert" className="border-rojo text-rojo border-l-4 py-2 pl-3 text-sm font-medium">{error}</p> : null}
        {mensaje ? <p role="status" className="border-verde text-verde border-l-4 py-2 pl-3 text-sm font-medium">{mensaje}</p> : null}
        <Button type="submit" disabled={guardando} className="tap text-base">{guardando ? "Guardando…" : "Guardar CUIT"}</Button>
      </form>
    </div>
  )
}
