"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"

import { authClient } from "@/lib/auth/client"

export function Encabezado({
  nombre,
  email,
  image,
}: {
  nombre: string
  email: string
  image: string | null
}) {
  const router = useRouter()
  const [saliendo, setSaliendo] = useState(false)
  const [abierto, setAbierto] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const iniciales = nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase()

  async function salir() {
    setSaliendo(true)
    await authClient.signOut()
    router.push("/ingresar")
    router.refresh()
  }

  useEffect(() => {
    function cerrarAlHacerClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setAbierto(false)
    }

    function cerrarConEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setAbierto(false)
    }

    document.addEventListener("mousedown", cerrarAlHacerClick)
    document.addEventListener("keydown", cerrarConEscape)
    return () => {
      document.removeEventListener("mousedown", cerrarAlHacerClick)
      document.removeEventListener("keydown", cerrarConEscape)
    }
  }, [])

  return (
    /*
     * `z-10` and no more. This used to be `z-[1000]`, an undocumented number
     * chosen to clear Leaflet's pane ladder (400-700) and its controls
     * (800-1000). MapLibre has no such ladder, and the map container isolates
     * its own stacking context, so the header only has to beat ordinary
     * siblings.
     */
    <header className="border-line bg-paper sticky top-0 z-10 flex items-center justify-between gap-4 border-b px-4 py-3 sm:px-6">
      <Link href="/lotes" className="font-bold tracking-tight">
        Lote Limpio
      </Link>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setAbierto((estado) => !estado)}
          aria-expanded={abierto}
          aria-haspopup="menu"
          aria-label={`Menú de ${nombre}`}
          className="text-ink focus-ink flex min-h-13 items-center gap-2 rounded-md px-1"
        >
          {image ? (
            <img
              src={image}
              alt=""
              className="border-line size-10 rounded-md border object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="bg-ink text-paper flex size-10 items-center justify-center rounded-md text-sm font-bold"
            >
              {iniciales || "U"}
            </span>
          )}
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-semibold">{nombre}</span>
            <span className="text-ink-soft block max-w-40 truncate text-xs">
              {email}
            </span>
          </span>
          <ChevronDown aria-hidden="true" className="size-5" />
        </button>

        {abierto ? (
          <div
            role="menu"
            aria-label="Opciones de usuario"
            className="border-line bg-paper absolute top-full right-0 z-20 mt-2 w-64 border p-2"
          >
            <div className="border-line border-b px-3 py-3 sm:hidden">
              <p className="font-semibold">{nombre}</p>
              <p className="text-ink-soft mt-1 truncate text-xs">{email}</p>
            </div>
            <Link
              href="/api-keys"
              role="menuitem"
              onClick={() => setAbierto(false)}
              className="text-ink focus-ink flex min-h-13 items-center rounded-md px-3 text-sm font-semibold"
            >
              API keys
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={salir}
              disabled={saliendo}
              className="text-ink focus-ink flex min-h-13 w-full items-center rounded-md px-3 text-left text-sm font-semibold disabled:opacity-50"
            >
              {saliendo ? "Saliendo…" : "Salir"}
            </button>
          </div>
        ) : null}
      </div>
    </header>
  )
}
