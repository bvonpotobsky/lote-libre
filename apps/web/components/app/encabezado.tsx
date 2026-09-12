"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { authClient } from "@/lib/auth/client"

export function Encabezado({ nombre, cuit }: { nombre: string; cuit: string | null }) {
  const router = useRouter()
  const [saliendo, setSaliendo] = useState(false)

  async function salir() {
    setSaliendo(true)
    await authClient.signOut()
    router.push("/ingresar")
    router.refresh()
  }

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
      <div className="flex items-center gap-4">
        <Link href="/perfil" className="text-ink-soft block min-w-0 text-left text-xs sm:text-sm">
          <span className="block font-medium text-ink">{nombre}</span>
          <span>{cuit ? `CUIT ${cuit}` : "Sin CUIT cargado"}</span>
        </Link>
        <Link href="/verificacion-productor" className="text-ink focus-ink text-right text-xs font-semibold underline underline-offset-4 sm:text-sm">
          Verificar productor
        </Link>
        <button
          type="button"
          onClick={salir}
          disabled={saliendo}
          className="text-ink focus-ink text-sm font-semibold underline underline-offset-4 disabled:opacity-50"
        >
          {saliendo ? "Saliendo…" : "Salir"}
        </button>
      </div>
    </header>
  )
}
