"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import area from "@turf/area"
import { polygon as turfPolygon } from "@turf/helpers"

import { Comparador, type VentanaImagen } from "@/components/mapa/comparador"
import { Mapa } from "@/components/mapa/mapa"
import { FuentesConsultadas } from "@/components/verificacion/fuentes-consultadas"
import { PanelVeredicto } from "@/components/verificacion/panel-veredicto"
import type { Lote, LoteVerification } from "@/lib/db/schema"
import { isVerificationCurrent } from "@/lib/lotes/freshness"
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
  /*
   * Both carry the geometry hash they belong to. The imagery cache is content
   * addressed, so after an edit the previous field's pictures are simply not
   * this lote's pictures — tagging them is what makes that a comparison rather
   * than a reset inside an effect.
   */
  const [imagenes, setImagenes] = useState<{
    hash: string
    datos: Imagenes
  } | null>(null)
  const [hashQueFallo, setHashQueFallo] = useState<string | null>(null)

  const [editando, setEditando] = useState(false)
  /** The shape under the pointer. Null means the stored one is untouched. */
  const [borrador, setBorrador] = useState<GeoJSON.Polygon | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [avisoEdicion, setAvisoEdicion] = useState<{
    mensaje: string
    sugerencia?: string
  } | null>(null)

  const geometriaEnPantalla = borrador ?? lote.geometry

  const superficieBorrador = useMemo(() => {
    if (!borrador) return null
    try {
      return area(turfPolygon(borrador.coordinates)) / 10_000
    } catch {
      return null
    }
  }, [borrador])

  /**
   * A verdict computed from a polygon that has since changed is not a verdict
   * about this lote. It is withheld rather than annotated: an "outdated" label
   * next to a green tick is still read as a green tick.
   */
  const vencida =
    verificacion !== null &&
    !isVerificationCurrent(lote.geometryHash, verificacion.geometryHash)

  useEffect(() => {
    let vigente = true
    const hash = lote.geometryHash
    fetch(`/api/lotes/${lote.id}/imagery`)
      .then((r) => r.json())
      .then((cuerpo) => {
        if (!vigente) return
        if (cuerpo.ok) setImagenes({ hash, datos: cuerpo.data as Imagenes })
        else setHashQueFallo(hash)
      })
      .catch(() => vigente && setHashQueFallo(hash))
    return () => {
      vigente = false
    }
  }, [lote.id, lote.geometryHash])

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

  const guardarGeometria = useCallback(async () => {
    if (!borrador) return
    setGuardando(true)
    setAvisoEdicion(null)

    const respuesta = await fetch(`/api/lotes/${lote.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ geometry: borrador }),
    })
    const cuerpo = await respuesta.json()

    if (!respuesta.ok || cuerpo.ok === false) {
      // Keep the draft and stay in edit mode: the producer can nudge the vertex
      // the server objected to instead of tracing the whole field again.
      setAvisoEdicion({
        mensaje: cuerpo?.error?.message ?? "No pudimos guardar el contorno.",
        sugerencia: cuerpo?.error?.hint,
      })
      setGuardando(false)
      return
    }

    /*
     * Re-read rather than cleared. `verificacion` is state seeded from a prop,
     * so a refresh alone would not move it — but dropping it to null would make
     * the screen look like this lote was never checked. Keeping the superseded
     * row is what lets the page say WHY there is no verdict: it was about the
     * contour that just changed.
     */
    const relectura = await fetch(`/api/lotes/${lote.id}`)
      .then((r) => r.json())
      .catch(() => null)
    setVerificacion(
      relectura?.ok
        ? ((relectura.data.verification ?? null) as LoteVerification | null)
        : null
    )
    setBorrador(null)
    setEditando(false)
    setGuardando(false)
    router.refresh()
  }, [borrador, lote.id, router])

  const cancelarEdicion = useCallback(() => {
    setBorrador(null)
    setEditando(false)
    setAvisoEdicion(null)
  }, [])

  // Only this lote's own pictures count as loaded; anything tagged with an
  // older hash belongs to a shape that no longer exists.
  const imagenesActuales =
    imagenes?.hash === lote.geometryHash ? imagenes.datos : null
  const imagenesFallaron = hashQueFallo === lote.geometryHash

  const lista = verificacion?.status === "ready" && !vencida
  const fallo = verificacion?.status === "failed" && !vencida
  const sinCobertura =
    verificacion?.failureCode === "PROVINCE_NOT_COVERED" && !vencida

  /*
   * The verdict and its sources are two halves of one answer, split so the
   * satellite comparison can sit between them. One binding keeps them from ever
   * appearing apart: a heading of citations with no verdict above it says
   * nothing.
   */
  const veredicto = lista && verificacion?.verdict ? verificacion : null

  return (
    <div className="flex min-h-[calc(100svh-3.5rem)] flex-col lg:h-[calc(100svh-3.5rem)] lg:min-h-0 lg:flex-row">
      <div className="relative min-h-[40svh] flex-1 lg:min-h-0">
        <Mapa
          className="absolute inset-0 h-full w-full"
          etiqueta={`Mapa de ${lote.nombre}`}
          modo={editando ? "editar" : "ver"}
          editandoId={editando ? lote.id : null}
          lotes={[
            {
              id: lote.id,
              nombre: lote.nombre,
              geometry: geometriaEnPantalla,
              verdict: lista ? (verificacion?.verdict ?? null) : null,
              areaHa: superficieBorrador ?? lote.areaHa,
            },
          ]}
          onGeometria={(resultado) => {
            if (!resultado.ok) {
              setAvisoEdicion({
                mensaje: "Los lados del lote se cruzan.",
                sugerencia:
                  "Movelo de manera que el contorno no se corte a sí mismo.",
              })
              return
            }
            setBorrador(resultado.geometry)
            setAvisoEdicion(null)
          }}
        />
      </div>

      <aside className="flex w-full flex-col gap-6 border-t border-line bg-white p-4 sm:p-6 lg:w-[28rem] lg:overflow-y-auto lg:border-t-0 lg:border-l">
        {/*
         * `min-w-0 flex-1` on the text block is what actually keeps the action
         * in this row. A flex line is collected from each item's hypothetical
         * main size, and for an auto-width item that is its max-content — the
         * metadata laid out on one line, wider than the panel on its own. With
         * a shrinkable basis the button fits and the text wraps instead. It
         * wraps: nothing is truncated, the name of the lote is its identity.
         * `flex-wrap` stays as the escape hatch for a name of one very long
         * word, which no basis can shrink past.
         */}
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl leading-tight font-bold tracking-tight">
              {lote.nombre}
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
              {formatHa(lote.areaHa)} ha · {nombreProvincia(lote.provincia)}
              {lote.renspa ? ` · RENSPA ${lote.renspa}` : ""}
            </p>
            <p className="mt-0.5 text-sm text-ink-soft">
              {lote.centroidLat.toFixed(5)}, {lote.centroidLon.toFixed(5)}
            </p>
          </div>

          {editando ? null : (
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="flex tap-compacto focus-ink shrink-0 items-center justify-center rounded-md border-2 border-ink px-4 text-sm font-semibold text-ink"
            >
              Editar el contorno
            </button>
          )}
        </div>

        {editando ? (
          <section className="grid gap-3 rounded-lg border border-line p-3">
            <div>
              <h2 className="font-semibold">Estás editando el contorno</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                Arrastrá las esquinas para corregirlas. Tocá un punto del medio
                de un lado para agregar una esquina nueva.
              </p>
            </div>

            <p className="text-sm">
              Superficie:{" "}
              <span className="font-semibold">
                {superficieBorrador === null
                  ? `${formatHa(lote.areaHa)} ha`
                  : `${formatHa(superficieBorrador)} ha`}
              </span>
            </p>

            {/*
             * The consequence lives in the button label rather than behind a
             * confirmation step. There is no dialog primitive in the design
             * system, and a warning nobody can dismiss is read more often than
             * one they can.
             */}
            <p className="border-l-4 border-amarillo py-2 pl-3 text-sm leading-relaxed">
              Al guardar, la verificación actual deja de valer: el veredicto es
              sobre el contorno anterior, no sobre este.
            </p>

            {avisoEdicion ? (
              <div className="border-l-4 border-rojo py-2 pl-3">
                <p className="text-sm font-semibold">{avisoEdicion.mensaje}</p>
                {avisoEdicion.sugerencia ? (
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                    {avisoEdicion.sugerencia}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={guardarGeometria}
                disabled={guardando || borrador === null}
                className="flex tap focus-ink items-center justify-center rounded-md bg-ink px-4 text-base font-semibold text-paper disabled:opacity-50"
              >
                {guardando ? "Guardando…" : "Guardar y volver a verificar"}
              </button>
              <button
                type="button"
                onClick={cancelarEdicion}
                disabled={guardando}
                className="flex tap focus-ink items-center justify-center rounded-md border-2 border-ink px-4 text-base font-semibold text-ink disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </section>
        ) : null}

        {vencida && !editando ? (
          <div className="border-l-4 border-amarillo bg-white py-3 pl-3">
            <p className="font-semibold">Cambió el contorno del lote.</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              La verificación anterior era sobre el contorno viejo, así que ya
              no vale. Verificá de nuevo para tener un veredicto sobre este.
            </p>
          </div>
        ) : null}

        {veredicto ? <PanelVeredicto verificacion={veredicto} /> : null}

        {fallo ? (
          <div className="border-l-4 border-amarillo bg-white py-3 pl-3">
            <p className="font-semibold">
              {sinCobertura
                ? "Todavía no cubrimos esta provincia."
                : "La verificación quedó pendiente."}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              {sinCobertura
                ? "Por ahora tenemos las capas de Córdoba, Santiago del Estero y Chaco. Tu lote queda guardado y vas a poder verificarlo cuando sumemos la tuya."
                : "No pudimos consultar la capa de pérdida forestal. Tu lote está guardado: probá de nuevo cuando quieras."}
            </p>
          </div>
        ) : null}

        {/* Hidden while editing: both would act on a shape that is about to change. */}
        {!lista && !sinCobertura && !editando ? (
          <button
            type="button"
            onClick={verificar}
            disabled={verificando}
            className="flex tap focus-ink items-center justify-center rounded-md bg-ink px-4 text-base font-semibold text-paper disabled:opacity-50"
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
          {imagenesActuales?.reference.status === "ready" &&
          imagenesActuales.current.status === "ready" ? (
            <Comparador
              referencia={imagenesActuales.reference}
              actual={imagenesActuales.current}
            />
          ) : imagenesFallaron ? (
            <p className="text-sm leading-relaxed text-ink-soft">
              Copernicus no devolvió las imágenes. El veredicto no depende de
              ellas; volvé a entrar más tarde para verlas.
            </p>
          ) : (
            <div className="grid aspect-square place-items-center rounded-lg bg-field text-sm text-ink-soft">
              Buscando las ventanas más despejadas…
            </div>
          )}
        </section>

        {veredicto ? <FuentesConsultadas fuentes={veredicto.sources} /> : null}

        {lista && !editando ? (
          <a
            href={`/api/lotes/${lote.id}/document`}
            className="mt-auto flex tap focus-ink items-center justify-center rounded-md border-2 border-ink px-4 text-base font-semibold text-ink"
          >
            Descargar el documento
          </a>
        ) : null}
      </aside>
    </div>
  )
}
