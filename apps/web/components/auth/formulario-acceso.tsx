"use client"

import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useState, type FormEvent } from "react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { authClient } from "@/lib/auth/client"

type Modo = "ingresar" | "crear"

const COPY = {
  ingresar: {
    titulo: "Entrá a tu cuenta",
    accion: "Entrar",
    enviando: "Entrando…",
    pieTexto: "¿Todavía no tenés cuenta?",
    pieAccion: "Creá una",
    pieHref: "/crear-cuenta",
  },
  crear: {
    titulo: "Creá tu cuenta",
    accion: "Crear cuenta",
    enviando: "Creando…",
    pieTexto: "¿Ya tenés cuenta?",
    pieAccion: "Entrá",
    pieHref: "/ingresar",
  },
} as const

/** Better Auth error codes we can say something useful about. */
function mensajeDeError(code: string | undefined, modo: Modo): string {
  switch (code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "El email o la contraseña no coinciden. Revisalos y probá de nuevo."
    case "USER_ALREADY_EXISTS":
      return "Ya hay una cuenta con ese email. Entrá en lugar de crearla."
    case "PASSWORD_TOO_SHORT":
      return "La contraseña tiene que tener al menos 8 caracteres."
    default:
      return modo === "crear"
        ? "No pudimos crear la cuenta. Revisá los datos y probá de nuevo."
        : "No pudimos entrar. Revisá los datos y probá de nuevo."
  }
}

export function FormularioAcceso({ modo }: { modo: Modo }) {
  const copy = COPY[modo]
  const router = useRouter()
  const volver = useSearchParams().get("volver")

  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setEnviando(true)

    const datos = new FormData(event.currentTarget)
    const email = String(datos.get("email") ?? "").trim()
    const password = String(datos.get("password") ?? "")
    const name = String(datos.get("name") ?? "").trim()

    const resultado =
      modo === "crear"
        ? await authClient.signUp.email({ email, password, name })
        : await authClient.signIn.email({ email, password })

    if (resultado.error) {
      setError(mensajeDeError(resultado.error.code, modo))
      setEnviando(false)
      return
    }

    router.push(volver ?? "/")
    router.refresh()
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <h2 className="text-2xl font-bold tracking-tight">{copy.titulo}</h2>

      <form onSubmit={enviar} className="mt-7 grid gap-5" noValidate>
        {modo === "crear" ? (
          <div className="grid gap-2">
            <Label htmlFor="name" className="text-base">
              Nombre y apellido
            </Label>
            <Input
              id="name"
              name="name"
              required
              autoComplete="name"
              placeholder="Ana Gómez"
              className="tap text-base"
            />
          </div>
        ) : null}

        <div className="grid gap-2">
          <Label htmlFor="email" className="text-base">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder="tu@campo.com.ar"
            className="tap text-base"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="password" className="text-base">
            Contraseña
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={
              modo === "crear" ? "new-password" : "current-password"
            }
            className="tap text-base"
          />
          {modo === "crear" ? (
            <p className="text-ink-soft text-sm">Mínimo 8 caracteres.</p>
          ) : null}
        </div>

        {error ? (
          <p
            role="alert"
            className="border-rojo text-rojo border-l-4 bg-white py-2 pl-3 text-sm font-medium"
          >
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={enviando} className="tap text-base">
          {enviando ? copy.enviando : copy.accion}
        </Button>
      </form>

      <p className="text-ink-soft mt-6 text-sm">
        {copy.pieTexto}{" "}
        <Link
          href={copy.pieHref}
          className="text-ink font-semibold underline underline-offset-4"
        >
          {copy.pieAccion}
        </Link>
      </p>
    </div>
  )
}
