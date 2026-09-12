"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

import { Comparador, type VentanaImagen } from "@/components/mapa/comparador"
import { Mapa } from "@/components/mapa/mapa"
import { PanelVeredicto } from "@/components/verificacion/panel-veredicto"
import type { Lote, LoteVerification } from "@/lib/db/schema"
import { formatHa, nombreProvincia } from "@/lib/ui/verdict"

type Slot =
  | ({ status: "ready" } & VentanaImagen)
  | { status: "unavailable"; message: string; hint: string }

type Imagenes = { reference: Slot; current: Slot }

export function DetalleLote({
  lote,
  verificacionInicial,
}: {
  lote: Lote
  verificacionInicial: LoteVerification | null
}) {
  const router = useRouter()
  const [verificacion, setVerificacion] = useState(verificacionInicial)
  const [verificando, setVerificando] = useState(false)
  const [imagenes, setImagenes] = useState<Imagenes | null>(null)
  const [imagenesFallaron, setImagenesFallaron] = useState(false)

  useEffect(() => {
    let vigente = true
    fetch(`/api/lotes/${lote.id}/imagery`)
      .then((r) => r.json())
      .then((cuerpo) => {
        if (!vigente) return
        if (cuerpo.ok) setImagenes(cuerpo.data as Imagenes)
        else setImagenesFallaron(true)
      })
      .catch(() => vigente && setImagenesFallaron(true))
    return () => {
      vigente = false
    }
  }, [lote.id])

  const verificar = useCallback(async () => {
    setVerificando(true)
    const respuesta = await fetch(`/api/lotes/${lote.id}/verify`, {
      method: "POST",
    })
    const cuerpo = await respuesta.json()
    if (cuerpo.ok) setVerificacion(cuerpo.data as LoteVerification)
    setVerificando(false)
    router.refresh()
  }, [lote.id, router])

  const lista = verificacion?.status === "ready"
  const fallo = verificacion?.status === "failed"
  const sinCobertura = verificacion?.failureCode === "PROVINCE_NOT_COVERED"

  return (
    <div className="flex min-h-[calc(100svh-3.5rem)] flex-col lg:flex-row">
      <div className="relative min-h-[40svh] flex-1 lg:min-h-0">
        <Mapa
          className="absolute inset-0 h-full w-full"
          lotes={[
            {
              id: lote.id,
              nombre: lote.nombre,
              geometry: lote.geometry,
              verdict: lista ? (verificacion?.verdict ?? null) : null,
              areaHa: lote.areaHa,
            },
          ]}
        />
      </div>

      <aside className="border-line flex w-full flex-col gap-6 border-t bg-white p-4 sm:p-6 lg:w-[28rem] lg:overflow-y-auto lg:border-t-0 lg:border-l">
        <div>
          <h1 className="text-2xl leading-tight font-bold tracking-tight">
            {lote.nombre}
          </h1>
          <p className="text-ink-soft mt-1 text-sm">
            {formatHa(lote.areaHa)} ha · {nombreProvincia(lote.provincia)}
            {lote.renspa ? ` · RENSPA ${lote.renspa}` : ""}
          </p>
          <p className="text-ink-soft mt-0.5 text-sm">
            {lote.centroidLat.toFixed(5)}, {lote.centroidLon.toFixed(5)}
          </p>
        </div>

        {verificacion && lista ? (
          <PanelVeredicto verificacion={verificacion} />
        ) : null}

        {fallo ? (
          <div className="border-amarillo border-l-4 bg-white py-3 pl-3">
            <p className="font-semibold">
              {sinCobertura
                ? "Todavía no cubrimos esta provincia."
                : "La verificación quedó pendiente."}
            </p>
            <p className="text-ink-soft mt-1 text-sm leading-relaxed">
              {sinCobertura
                ? "Por ahora tenemos las capas de Córdoba, Santiago del Estero y Chaco. Tu lote queda guardado y vas a poder verificarlo cuando sumemos la tuya."
                : "No pudimos consultar la capa de pérdida forestal. Tu lote está guardado: probá de nuevo cuando quieras."}
            </p>
          </div>
        ) : null}

        {!lista && !sinCobertura ? (
          <button
            type="button"
            onClick={verificar}
            disabled={verificando}
            className="bg-ink text-paper tap flex items-center justify-center rounded-md px-4 text-base font-semibold disabled:opacity-50"
          >
            {verificando
              ? "Verificando…"
              : fallo
                ? "Reintentar la verificación"
                : "Verificar este lote"}
          </button>
        ) : null}

        <section className="grid gap-3">
          <h2 className="font-semibold">Comparación satelital</h2>
          {imagenes?.reference.status === "ready" &&
          imagenes.current.status === "ready" ? (
            <Comparador
              referencia={imagenes.reference}
              actual={imagenes.current}
            />
          ) : imagenesFallaron ? (
            <p className="text-ink-soft text-sm leading-relaxed">
              Copernicus no devolvió las imágenes. El veredicto no depende de
              ellas; volvé a entrar más tarde para verlas.
            </p>
          ) : (
            <div className="bg-field text-ink-soft grid aspect-square place-items-center rounded-lg text-sm">
              Buscando las ventanas más despejadas…
            </div>
          )}
        </section>

        {lista ? (
          <a
            href={`/api/lotes/${lote.id}/document`}
            className="border-ink text-ink tap mt-auto flex items-center justify-center rounded-md border-2 px-4 text-base font-semibold"
          >
            Descargar el documento
          </a>
        ) : null}
      </aside>
    </div>
  )
}
