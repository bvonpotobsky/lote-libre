"use client"

import { useEffect, useMemo, useRef } from "react"
import { polygon as turfPolygon } from "@turf/helpers"
import kinks from "@turf/kinks"
// MapLibre 6 ships no default export, only named ones, so this is a namespace
// import rather than the `import maplibregl from` most examples show.
import * as maplibre from "maplibre-gl"
import {
  TerraDraw,
  TerraDrawPolygonMode,
  TerraDrawRenderMode,
} from "terra-draw"
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter"

import "maplibre-gl/dist/maplibre-gl.css"

import {
  boundsOf,
  toFeatureCollection,
  verdictColorExpression,
  type MapLote,
} from "@/lib/geo/map-style"
import { VERDICT_UI } from "@/lib/ui/verdict"

/**
 * MapLibre 6 requires this under a bundler: it cannot resolve its own worker
 * path, and without the call the worker never answers. Every GeoJSON source
 * then hangs with `_isUpdatingWorker` stuck true and no vector layer ever
 * paints — silently, because the raster basemap does not use the worker and
 * keeps rendering, and nothing is logged.
 *
 * The file is staged into public/maplibre by scripts/copy-maplibre-worker.ts,
 * which runs from predev and prebuild.
 *
 * Module scope, not inside the effect: it has to happen before any `new Map()`,
 * and calling it once per mount would be pointless work. The file is only
 * reached through `dynamic(ssr: false)`, so this never runs on the server.
 */
maplibre.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs")

export type MapaProps = {
  /** Every lote to draw. One for the detail screen, many for the overview. */
  lotes?: MapLote[]
  /** Frames this lote when it changes. */
  seleccionadoId?: string | null
  /** When provided, tapping a lote reports which one. */
  onSeleccionar?: (id: string) => void
  /** When provided, the draw tool is enabled and reports what was traced. */
  onDibujar?: (geometry: GeoJSON.Polygon | null) => void
  className?: string
}

/** Satellite, not streets: a producer recognises their own field, not a road. */
const IMAGERY_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
const IMAGERY_ATTRIBUTION = "Imágenes: Esri, Maxar, Earthstar Geographics"

/** Centred on the dry Chaco, where most of this matters. Lon,lat — not lat,lon. */
const CENTRO_INICIAL: [number, number] = [-63.5, -27.5]

const FUENTE_LOTES = "lotes"
const CAPA_RELLENO = "lotes-relleno"
const CAPA_BORDE = "lotes-borde"

const COLECCION_VACIA: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
}

/** How a lote announces itself on the map, in words and not only in colour. */
function etiquetaDe(lote: MapLote): { texto: string; clases: string } {
  if (!lote.verdict) {
    return { texto: "Sin verificar", clases: "bg-field text-ink-soft" }
  }
  const ui = VERDICT_UI[lote.verdict]
  return { texto: ui.titulo, clases: `${ui.bg} ${ui.texto}` }
}

export default function MapaMapLibre({
  lotes = [],
  seleccionadoId,
  onSeleccionar,
  onDibujar,
  className,
}: MapaProps) {
  const contenedor = useRef<HTMLDivElement>(null)
  const mapaRef = useRef<maplibre.Map | null>(null)
  const dibujoRef = useRef<TerraDraw | null>(null)
  const marcadoresRef = useRef<maplibre.Marker[]>([])
  const listoRef = useRef(false)
  // Framing is a one-off per set of lotes, never a per-render reflex: re-fitting
  // while someone is panning yanks the map out from under them.
  const cantidadPrevia = useRef(-1)

  // Held in refs so changing a callback never tears the map down.
  const onDibujarRef = useRef(onDibujar)
  onDibujarRef.current = onDibujar
  const onSeleccionarRef = useRef(onSeleccionar)
  onSeleccionarRef.current = onSeleccionar
  // Whether drawing is available is fixed at mount, like it was under Leaflet.
  const dibujable = useRef(Boolean(onDibujar)).current

  useEffect(() => {
    if (!contenedor.current || mapaRef.current) return

    const mapa = new maplibre.Map({
      container: contenedor.current,
      center: CENTRO_INICIAL,
      zoom: 5,
      attributionControl: false,
      // The style is inline on purpose: no external style.json, no glyph
      // server, no API key. Labels are HTML markers, so no font is needed.
      style: {
        version: 8,
        sources: {
          satelite: {
            type: "raster",
            tiles: [IMAGERY_URL],
            tileSize: 256,
            maxzoom: 19,
            attribution: IMAGERY_ATTRIBUTION,
          },
        },
        layers: [{ id: "satelite", type: "raster", source: "satelite" }],
      },
    })
    mapaRef.current = mapa

    // Esri's terms require the credit; it is not decoration.
    mapa.addControl(
      new maplibre.AttributionControl({ compact: true }),
      "bottom-right",
    )
    mapa.addControl(
      new maplibre.NavigationControl({ showCompass: false }),
      "top-left",
    )

    mapa.on("load", () => {
      mapa.addSource(FUENTE_LOTES, { type: "geojson", data: COLECCION_VACIA })
      mapa.addLayer({
        id: CAPA_RELLENO,
        type: "fill",
        source: FUENTE_LOTES,
        paint: {
          "fill-color": verdictColorExpression() as never,
          "fill-opacity": 0.25,
        },
      })
      mapa.addLayer({
        id: CAPA_BORDE,
        type: "line",
        source: FUENTE_LOTES,
        paint: {
          "line-color": verdictColorExpression() as never,
          "line-width": 3,
        },
      })

      mapa.on("click", CAPA_RELLENO, (evento) => {
        const id = evento.features?.[0]?.properties?.id
        if (typeof id === "string") onSeleccionarRef.current?.(id)
      })
      mapa.on("mouseenter", CAPA_RELLENO, () => {
        if (onSeleccionarRef.current) mapa.getCanvas().style.cursor = "pointer"
      })
      mapa.on("mouseleave", CAPA_RELLENO, () => {
        mapa.getCanvas().style.cursor = ""
      })

      if (dibujable) iniciarDibujo(mapa)

      listoRef.current = true
      pintar()
    })

    return () => {
      dibujoRef.current?.stop()
      dibujoRef.current = null
      marcadoresRef.current.forEach((marcador) => marcador.remove())
      marcadoresRef.current = []
      listoRef.current = false
      mapa.remove()
      mapaRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function iniciarDibujo(mapa: maplibre.Map) {
    const dibujo = new TerraDraw({
      adapter: new TerraDrawMapLibreGLAdapter({ map: mapa }),
      modes: [
        new TerraDrawPolygonMode({
          styles: {
            fillColor: "#fafaf8",
            fillOpacity: 0.25,
            outlineColor: "#fafaf8",
            outlineWidth: 3,
            closingPointColor: "#fafaf8",
            closingPointWidth: 5,
            closingPointOutlineColor: "#000000",
            closingPointOutlineWidth: 1,
          },
        }),
        // Terra Draw needs somewhere inert to sit when drawing is off.
        new TerraDrawRenderMode({ modeName: "quieto", styles: {} }),
      ],
    })

    dibujo.start()
    dibujo.setMode("polygon")

    dibujo.on("finish", (id, contexto) => {
      // `finish` also fires for drags and vertex edits; only a completed trace
      // is a new lote.
      if (contexto.action !== "draw") return

      const rasgo = dibujo
        .getSnapshot()
        .find((candidato) => candidato.id === id)
      if (!rasgo || rasgo.geometry.type !== "Polygon") return

      const geometry = rasgo.geometry as GeoJSON.Polygon

      // leaflet-draw refused self-intersections while tracing. Terra Draw does
      // not, so we check once here — the server checks again in validatePolygon,
      // but the producer deserves to hear it now, not after submitting.
      if (kinks(turfPolygon(geometry.coordinates)).features.length > 0) {
        dibujo.removeFeatures([id])
        onDibujarRef.current?.(null)
        return
      }

      // Hand the polygon over and clear the draft, so the lote exists exactly
      // once: in our own source, styled like every other lote.
      dibujo.removeFeatures([id])
      onDibujarRef.current?.(geometry)
    })

    dibujoRef.current = dibujo
  }

  /** Push the current lotes into the source, the labels, and the viewport. */
  function pintar() {
    const mapa = mapaRef.current
    if (!mapa || !listoRef.current) return

    // `GeoJSONSource` exists in MapLibre's types but is not exported, so the
    // narrowest honest cast is the one method we call.
    const fuente = mapa.getSource(FUENTE_LOTES) as
      | { setData: (data: GeoJSON.FeatureCollection) => void }
      | undefined
    fuente?.setData(toFeatureCollection(lotes))

    marcadoresRef.current.forEach((marcador) => marcador.remove())
    marcadoresRef.current = lotes.map((lote) => {
      const { texto, clases } = etiquetaDe(lote)
      const seleccionar = onSeleccionarRef.current
      const base = `${clases} rounded px-2 py-1 text-center text-xs font-bold leading-tight shadow-[0_1px_6px_rgba(0,0,0,0.45)]`

      /*
       * The label is the touch target, not the polygon. Zoomed out to see every
       * lote at once, a field is a couple of pixels across — unhittable with a
       * thumb. The label is always thumb-sized, so it carries the tap.
       */
      const elemento = seleccionar
        ? document.createElement("button")
        : document.createElement("div")
      elemento.className = seleccionar
        ? `${base} cursor-pointer`
        : `${base} pointer-events-none`
      elemento.textContent = `${lote.nombre} · ${texto}`

      if (seleccionar && elemento instanceof HTMLButtonElement) {
        elemento.type = "button"
        elemento.setAttribute("aria-label", `Abrir ${lote.nombre}. ${texto}.`)
        elemento.addEventListener("click", (evento) => {
          evento.stopPropagation()
          seleccionar(lote.id)
        })
      }

      return new maplibre.Marker({ element: elemento })
        .setLngLat(centroDe(lote.geometry))
        .addTo(mapa)
    })

    const limites = boundsOf(lotes)
    if (limites && cantidadPrevia.current !== lotes.length) {
      mapa.fitBounds(limites, { padding: 48, maxZoom: 15 })
    }
    cantidadPrevia.current = lotes.length
  }

  /*
   * Call sites build `lotes` inline, so the array is a new object on every
   * render. Depending on it directly would repaint and re-frame the map
   * constantly; this signature changes only when the data actually does.
   */
  const firma = useMemo(
    () =>
      JSON.stringify(
        lotes.map((lote) => [lote.id, lote.verdict, lote.geometry.coordinates]),
      ),
    [lotes],
  )

  useEffect(() => {
    pintar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firma])

  // Frame whichever lote was picked from the list.
  useEffect(() => {
    const mapa = mapaRef.current
    if (!mapa || !seleccionadoId) return
    const lote = lotes.find((candidato) => candidato.id === seleccionadoId)
    if (!lote) return
    const limites = boundsOf([lote])
    if (limites) mapa.fitBounds(limites, { padding: 48, duration: 800 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seleccionadoId])

  return (
    <div
      ref={contenedor}
      /*
       * `isolate` is kept from the Leaflet original. MapLibre has no pane
       * z-index ladder to trap, but `estado-vacio` still overlays a card on
       * this map, and an explicit stacking context is what makes plain DOM
       * order decide who paints on top.
       */
      className={`${className ?? ""} isolate`}
      role="application"
      aria-label="Mapa del lote"
    />
  )
}

/** Average of the outer ring — good enough to hang a label on. */
function centroDe(geometry: GeoJSON.Polygon): [number, number] {
  const anillo = geometry.coordinates[0] ?? []
  if (anillo.length === 0) return CENTRO_INICIAL
  const total = anillo.reduce<[number, number]>(
    (suma, [lon, lat]) => [suma[0] + (lon ?? 0), suma[1] + (lat ?? 0)],
    [0, 0],
  )
  return [total[0] / anillo.length, total[1] / anillo.length]
}

/** Re-exported so call sites keep importing one name for the lote shape. */
export type { MapLote }
