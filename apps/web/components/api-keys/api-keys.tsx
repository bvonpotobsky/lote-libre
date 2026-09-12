"use client"

import { useEffect, useState } from "react"
import type { FormEvent } from "react"

type ApiKey = {
  id: string
  name: string
  keyPrefix: string
  scopes: string[]
  createdAt: string
  expiresAt: string | null
  revokedAt: string | null
  lastUsedAt: string | null
}

type CreatedKey = ApiKey & { secret: string }

const fecha = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("es-AR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Sin vencimiento"

export function ApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [name, setName] = useState("")
  const [secret, setSecret] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [enviando, setEnviando] = useState(false)

  async function cargar() {
    const response = await fetch("/api/account/api-keys")
    const body = await response.json()
    if (!response.ok || !body.ok) throw new Error(body.error?.message ?? "No pudimos cargar tus API keys.")
    setKeys(body.data)
  }

  useEffect(() => {
    let vigente = true
    fetch("/api/account/api-keys")
      .then((response) => response.json())
      .then((body) => {
        if (!vigente) return
        if (!body.ok) throw new Error(body.error?.message ?? "No pudimos cargar tus API keys.")
        setKeys(body.data)
      })
      .catch((reason: unknown) => {
        if (vigente) setError(reason instanceof Error ? reason.message : "No pudimos cargar tus API keys.")
      })
      .finally(() => vigente && setCargando(false))
    return () => {
      vigente = false
    }
  }, [])

  async function crear(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSecret(null)
    setEnviando(true)
    try {
      const response = await fetch("/api/account/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          scopes: ["lotes:read", "lotes:create"],
        }),
      })
      const body = await response.json()
      if (!response.ok || !body.ok) throw new Error(body.error?.message ?? "No pudimos crear la API key.")
      const created = body.data as CreatedKey
      setSecret(created.secret)
      setName("")
      await cargar()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No pudimos crear la API key.")
    } finally {
      setEnviando(false)
    }
  }

  async function revocar(id: string) {
    setError(null)
    const response = await fetch(`/api/account/api-keys/${id}`, { method: "DELETE" })
    const body = await response.json()
    if (!response.ok || !body.ok) {
      setError(body.error?.message ?? "No pudimos revocar la API key.")
      return
    }
    await cargar()
  }

  return (
    <main className="bg-paper min-h-full px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="border-line border-b pb-5">
          <p className="text-ink-soft text-sm font-semibold">Acceso para integraciones</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">API keys</h1>
        </div>
        <p className="text-ink-soft mt-2 max-w-2xl text-sm leading-relaxed">
          Creá una credencial para que otro sistema pueda crear y consultar tus lotes.
          El secreto aparece una sola vez y no se guarda en texto plano.
        </p>

        {error ? <p role="alert" className="border-rojo text-rojo mt-5 border-l-4 bg-white p-4 text-sm">{error}</p> : null}

        {secret ? (
          <section className="border-line mt-6 bg-white p-5" aria-label="API key creada">
            <h2 className="font-semibold">Copiá tu API key ahora</h2>
            <p className="text-ink-soft mt-1 text-sm">Este es el único momento en que vas a verla completa.</p>
            <code className="bg-field mt-4 block overflow-x-auto p-4 text-sm break-all">{secret}</code>
            <button type="button" onClick={() => secret && navigator.clipboard.writeText(secret)} className="bg-ink text-paper tap focus-ink mt-4 rounded-md px-4 font-semibold">
              Copiar API key
            </button>
          </section>
        ) : null}

        <form onSubmit={crear} className="border-line mt-6 bg-white p-5">
          <h2 className="font-semibold">Crear una credencial</h2>
          <label htmlFor="api-key-name" className="mt-4 block text-sm font-semibold">Nombre de la integración</label>
          <input
            id="api-key-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ej.: sistema del acopio"
            required
            maxLength={80}
            className="border-line focus-ink mt-2 h-13 w-full rounded-md border bg-transparent px-3 text-base"
          />
          <button type="submit" disabled={enviando} className="bg-ink text-paper tap focus-ink mt-4 rounded-md px-4 font-semibold disabled:opacity-50">
            {enviando ? "Creando…" : "Crear API key"}
          </button>
        </form>

        <section className="mt-8" aria-labelledby="keys-title">
          <h2 id="keys-title" className="text-lg font-bold">Credenciales activas</h2>
          {cargando ? <p className="text-ink-soft mt-3 text-sm">Cargando…</p> : null}
          {!cargando && keys.length === 0 ? <p className="text-ink-soft mt-3 text-sm">Todavía no creaste ninguna API key.</p> : null}
          <div className="border-line mt-3 divide-y bg-white">
            {keys.map((key) => (
              <article key={key.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold">{key.name}</h3>
                  <p className="text-ink-soft mt-1 font-mono text-sm">{key.keyPrefix}…</p>
                  <p className="text-ink-soft mt-1 text-xs">Creada {fecha(key.createdAt)} · {key.revokedAt ? "Revocada" : key.expiresAt ? `Vence ${fecha(key.expiresAt)}` : "Sin vencimiento"}</p>
                </div>
                {!key.revokedAt ? <button type="button" onClick={() => revocar(key.id)} className="border-ink text-ink tap focus-ink rounded-md border-2 px-4 font-semibold">Revocar</button> : null}
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
