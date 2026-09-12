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
  TerraDrawSelectMode,
  ValidateNotSelfIntersecting,
} from "terra-draw"
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter"

import "maplibre-gl/dist/maplibre-gl.css"

import {
  aFeatureDeDibujo,
  firmaDeGeometria,
  lotesVisibles,
  type ModoMapa,
} from "@/lib/geo/drawing"
import {
  ANCHO_DEPARTAMENTO,
  ANCHO_HALO,
  ANCHO_LIMITE,
  ANCHO_MAXIMO_NOMBRE_DEPARTAMENTO,
  ANCHO_MAXIMO_NOMBRE_LIMITE,
  ANCLAS_DEPARTAMENTOS_URL,
  ANCLAS_LIMITES_URL,
  campoDeNombre,
  CAPA_DEPARTAMENTOS,
  CAPA_LIMITES,
  CAPA_NOMBRES_DEPARTAMENTOS,
  CAPA_NOMBRES_LIMITES,
  COLOR_HALO,
  COLOR_LIMITE,
  DEPARTAMENTOS_URL,
  DIFUMINADO_HALO,
  ESPACIADO_NOMBRE_DEPARTAMENTO,
  ESPACIADO_NOMBRE_LIMITE,
  FUENTE_ANCLAS_DEPARTAMENTOS,
  FUENTE_ANCLAS_LIMITES,
  FUENTE_DEPARTAMENTOS,
  FUENTE_LIMITES,
  GLIFOS_URL,
  GUION_DEPARTAMENTO,
  GUION_LIMITE,
  LIMITES_URL,
  OPACIDAD_DEPARTAMENTO,
  OPACIDAD_LIMITE,
  OPACIDAD_NOMBRE_DEPARTAMENTO,
  OPACIDAD_NOMBRE_LIMITE,
  PILA_TIPOGRAFICA,
  porZoom,
  TAMANIO_NOMBRE_DEPARTAMENTO,
  TAMANIO_NOMBRE_LIMITE,
  ZOOM_MAXIMO_NOMBRE_LIMITE,
  ZOOM_MINIMO_DEPARTAMENTO,
} from "@/lib/geo/limites"
import {
  ANCHO_BORDE_LOTE,
  ANCHO_CASING_LOTE,
  COLOR_CASING_LOTE,
  DIFUMINADO_CASING_LOTE,
  boundsOf,
  toFeatureCollection,
  verdictColorExpression,
  type MapLote,
} from "@/lib/geo/map-style"
import type { Camara } from "@/lib/geo/zonas"
import { VERDICT_UI } from "@/lib/ui/verdict"

import { BuscadorZona } from "./buscador-zona"

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

/**
 * What the map reports back after a trace or an adjustment.
 *
 * The failure code is the same string the API uses, so a caller keys one copy
 * table for what the browser refused and what the server refused.
 */
export type ResultadoDibujo =
  | { ok: true; geometry: GeoJSON.Polygon; nuevo: boolean }
  | { ok: false; code: "GEOMETRY_SELF_INTERSECTING" }

export type MapaProps = {
  /** Every lote to draw. One for the detail screen, many for the overview. */
  lotes?: MapLote[]
  /** Frames this lote when it changes. */
  seleccionadoId?: string | null
  /** When provided, tapping a lote reports which one. */
  onSeleccionar?: (id: string) => void
  /**
   * "ver" reads; "dibujar" traces a new polygon; "editar" reshapes an existing
   * one. A prop rather than the old mount-time flag, because the detail screen
   * has to cross from reading to editing without rebuilding the map.
   */
  modo?: ModoMapa
  /**
   * Which lote Terra Draw owns while drawing or editing. That lote is withheld
   * from this component's own source so the same field is never painted twice.
   */
  editandoId?: string | null
  /** Fires on every committed trace or adjustment, at pointer-up. */
  onGeometria?: (resultado: ResultadoDibujo) => void
  /**
   * What a screen reader calls this map. The overview shows every field and the
   * detail screen shows one, so the name cannot be hard-coded here.
   */
  etiqueta?: string
  /**
   * Shows the zone search over the top-left corner. Opt-in, and only
   * `/lotes/nuevo` turns it on.
   *
   * That is an architectural fact rather than caution. On `/lotes` and
   * `/lotes/[id]` the camera is driven by data — `seleccionadoId` frames
   * whichever lote the list picked — and a second camera driver would fight the
   * first. On `/lotes/nuevo` nothing drives it: `pintar` only re-frames while
   * `modo === "ver"`. The search is safe there, and there only.
   */
  conBuscador?: boolean
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
const CAPA_CASING = "lotes-casing"
const CAPA_BORDE = "lotes-borde"

const COLECCION_VACIA: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
}

/**
 * The colour of a polygon under the pointer — `--color-paper`, the same value
 * `NO_VERDICT_COLOR` carries in map-style.ts.
 *
 * A lote being drawn or reshaped has no standing verdict: either it does not
 * exist yet, or the edit is about to invalidate the one it had. Showing it in
 * the old verdict's colour would be claiming something about a shape nobody
 * has checked.
 */
const COLOR_DIBUJO = "#fafaf8"

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
  modo = "ver",
  editandoId = null,
  onGeometria,
  etiqueta = "Mapa",
  conBuscador = false,
  className,
}: MapaProps) {
  const contenedor = useRef<HTMLDivElement>(null)
  const mapaRef = useRef<maplibre.Map | null>(null)
  const dibujoRef = useRef<TerraDraw | null>(null)
  const marcadoresRef = useRef<maplibre.Marker[]>([])
  const listoRef = useRef(false)
  // Framing is a one-off per set of lotes, never a per-render reflex: re-fitting
  // while someone is panning yanks the map out from under them.
  const idsPrevios = useRef("")

  /**
   * The newest props, readable from callbacks that were created earlier.
   *
   * `pintar` used to be called from inside `on("load")`, where it closed over
   * the mount render's `lotes`; anything that arrived in between was dropped
   * until the next change. Reading through a ref means load always paints what
   * is current.
   */
  const datosRef = useRef({ lotes, modo, editandoId })
  datosRef.current = { lotes, modo, editandoId }

  // Held in refs so changing a callback never tears the map down.
  const onGeometriaRef = useRef(onGeometria)
  onGeometriaRef.current = onGeometria
  const onSeleccionarRef = useRef(onSeleccionar)
  onSeleccionarRef.current = onSeleccionar

  /** Terra Draw's own id for the polygon it currently holds, if any. */
  const borradorIdRef = useRef<string | number | null>(null)
  /**
   * The last geometry this map reported upward.
   *
   * The parent stores it and feeds it straight back through `lotes`. Without
   * this, that echo would be read as new data and re-loaded into the draw
   * store, snapping the polygon back from wherever the pointer just left it.
   */
  const reportadoRef = useRef<string | null>(null)

  useEffect(() => {
    if (!contenedor.current || mapaRef.current) return

    const mapa = new maplibre.Map({
      container: contenedor.current,
      center: CENTRO_INICIAL,
      zoom: 5,
      attributionControl: false,
      /*
       * The style is inline on purpose: no external style.json, no API key, no
       * vector-tile vendor.
       *
       * `glyphs` does not walk that back. It points at a fontstack this repo
       * ships in `public/geo/`, generated once and committed like the boundary
       * GeoJSONs — a file, not a service. Nothing here reaches a host this app
       * does not serve itself.
       */
      style: {
        version: 8,
        glyphs: GLIFOS_URL,
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

    /*
     * Esri's terms require the credit; it is not decoration. Bottom left, not
     * bottom right: the zoom controls own that corner now, and they are the
     * only thing on this map sized for a thumb.
     */
    mapa.addControl(
      new maplibre.AttributionControl({ compact: true }),
      "bottom-left"
    )
    /*
     * No `NavigationControl`. Its buttons are 29px of vendor chrome — under
     * half this system's 3.25rem floor, with a corner radius and an icon that
     * belong to no design here. The pair below replaces it in the system's own
     * language, and MapLibre's keyboard zoom keeps working either way.
     */

    mapa.on("load", () => {
      /*
       * Borders go in first, so every layer added after this one stacks above
       * them. A lote is the subject of this map; a border is the paper it is
       * drawn on, and must never cover it.
       *
       * MapLibre fetches these URLs itself — no `fetch`, no loading state, no
       * failure path to write. If a file 404s the map simply has no borders,
       * which is exactly the right degradation for a reference grid.
       *
       * Departments before provinces: finest grain at the bottom, so a shared
       * edge is painted by the more important of the two.
       */
      mapa.addSource(FUENTE_DEPARTAMENTOS, {
        type: "geojson",
        data: DEPARTAMENTOS_URL,
      })
      mapa.addLayer({
        id: CAPA_DEPARTAMENTOS,
        type: "line",
        source: FUENTE_DEPARTAMENTOS,
        minzoom: ZOOM_MINIMO_DEPARTAMENTO,
        paint: {
          "line-color": COLOR_LIMITE,
          "line-width": ANCHO_DEPARTAMENTO,
          "line-opacity": OPACIDAD_DEPARTAMENTO,
          "line-dasharray": GUION_DEPARTAMENTO,
        },
      })

      mapa.addSource(FUENTE_LIMITES, { type: "geojson", data: LIMITES_URL })
      mapa.addLayer({
        id: CAPA_LIMITES,
        type: "line",
        source: FUENTE_LIMITES,
        paint: {
          "line-color": COLOR_LIMITE,
          "line-width": ANCHO_LIMITE,
          "line-opacity": OPACIDAD_LIMITE,
          "line-dasharray": GUION_LIMITE,
        },
      })

      /*
       * The names, on their own point sources rather than on the polygons above.
       *
       * MapLibre anchors one symbol per polygon, and twelve of these
       * jurisdictions are MultiPolygons, so labelling the boundary sources
       * directly drew CORRIENTES twice and scattered BUENOS AIRES over the
       * Delta. The anchors are precomputed instead — see `limites.ts`.
       *
       * Still under the lotes, for the same reason the lines are: this is the
       * paper, not the subject.
       *
       * These are plain typographic labels with a halo, deliberately unlike the
       * lote markers, which are solid boxes in the DOM. A lote marker will cover
       * a name sometimes — that is the right outcome, and it only reads as
       * hierarchy because the two are not competing in the same visual register.
       */
      mapa.addSource(FUENTE_ANCLAS_DEPARTAMENTOS, {
        type: "geojson",
        data: ANCLAS_DEPARTAMENTOS_URL,
      })
      mapa.addLayer({
        id: CAPA_NOMBRES_DEPARTAMENTOS,
        type: "symbol",
        source: FUENTE_ANCLAS_DEPARTAMENTOS,
        minzoom: ZOOM_MINIMO_DEPARTAMENTO,
        layout: {
          "text-field": campoDeNombre() as never,
          "text-font": PILA_TIPOGRAFICA,
          "text-size": porZoom(TAMANIO_NOMBRE_DEPARTAMENTO) as never,
          "text-letter-spacing": ESPACIADO_NOMBRE_DEPARTAMENTO,
          "text-max-width": ANCHO_MAXIMO_NOMBRE_DEPARTAMENTO,
        },
        paint: {
          "text-color": COLOR_LIMITE,
          "text-opacity": porZoom(OPACIDAD_NOMBRE_DEPARTAMENTO) as never,
          "text-halo-color": COLOR_HALO,
          "text-halo-width": ANCHO_HALO,
          "text-halo-blur": DIFUMINADO_HALO,
        },
      })

      mapa.addSource(FUENTE_ANCLAS_LIMITES, {
        type: "geojson",
        data: ANCLAS_LIMITES_URL,
      })
      mapa.addLayer({
        id: CAPA_NOMBRES_LIMITES,
        type: "symbol",
        source: FUENTE_ANCLAS_LIMITES,
        maxzoom: ZOOM_MAXIMO_NOMBRE_LIMITE,
        layout: {
          "text-field": campoDeNombre() as never,
          "text-font": PILA_TIPOGRAFICA,
          "text-size": porZoom(TAMANIO_NOMBRE_LIMITE) as never,
          "text-transform": "uppercase",
          "text-letter-spacing": ESPACIADO_NOMBRE_LIMITE,
          "text-max-width": ANCHO_MAXIMO_NOMBRE_LIMITE,
        },
        paint: {
          "text-color": COLOR_LIMITE,
          "text-opacity": porZoom(OPACIDAD_NOMBRE_LIMITE) as never,
          "text-halo-color": COLOR_HALO,
          "text-halo-width": ANCHO_HALO,
          "text-halo-blur": DIFUMINADO_HALO,
        },
      })

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
      // Under the outline, never over it: `addLayer` paints in call order, and a
      // casing on top would simply be a black outline. See COLOR_CASING_LOTE for
      // why the outline needs one at all.
      mapa.addLayer({
        id: CAPA_CASING,
        type: "line",
        source: FUENTE_LOTES,
        paint: {
          "line-color": COLOR_CASING_LOTE,
          "line-width": ANCHO_CASING_LOTE,
          "line-blur": DIFUMINADO_CASING_LOTE,
        },
      })
      mapa.addLayer({
        id: CAPA_BORDE,
        type: "line",
        source: FUENTE_LOTES,
        paint: {
          "line-color": verdictColorExpression() as never,
          "line-width": ANCHO_BORDE_LOTE,
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

      // Built unconditionally and parked in "quieto". The detail screen starts
      // read-only and has to reach editing without rebuilding the map, and an
      // idle Terra Draw renders nothing until it is given something to hold.
      iniciarDibujo(mapa)

      listoRef.current = true
      pintar()
      sincronizarModo()
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
  }, [])

  function iniciarDibujo(mapa: maplibre.Map) {
    /*
     * Refused while the pointer is still down, not after releasing it. The
     * server checks again in validatePolygon — this one exists so the producer
     * finds out during the drag, which is when they can still fix it.
     *
     * Only self-intersection: the area limits are a property of the finished
     * lote, and enforcing them mid-trace would reject a two-vertex ring for
     * being too small while it is still being drawn.
     */
    const validar = (
      rasgo: Parameters<typeof ValidateNotSelfIntersecting>[0]
    ) => ValidateNotSelfIntersecting(rasgo)

    const dibujo = new TerraDraw({
      adapter: new TerraDrawMapLibreGLAdapter({ map: mapa }),
      modes: [
        new TerraDrawPolygonMode({
          validation: validar,
          styles: {
            fillColor: COLOR_DIBUJO,
            fillOpacity: 0.25,
            outlineColor: COLOR_DIBUJO,
            outlineWidth: 3,
            closingPointColor: COLOR_DIBUJO,
            closingPointWidth: 5,
            closingPointOutlineColor: "#000000",
            closingPointOutlineWidth: 1,
          },
        }),
        new TerraDrawSelectMode({
          flags: {
            // Keyed by the mode that produced the feature, not by geometry type.
            polygon: {
              feature: {
                validation: validar,
                draggable: true,
                coordinates: {
                  draggable: true,
                  midpoints: { draggable: true },
                  deletable: true,
                },
              },
            },
          },
          /*
           * Same fill, same outline, same widths as the polygon mode: entering
           * edit must not make the field look like a different field. All that
           * appears is the handles.
           *
           * Deliberately no rotateable/scaleable: a boundary on the ground is
           * traced, never spun or scaled as a whole.
           */
          styles: {
            selectedPolygonColor: COLOR_DIBUJO,
            selectedPolygonFillOpacity: 0.25,
            selectedPolygonOutlineColor: COLOR_DIBUJO,
            selectedPolygonOutlineWidth: 3,
            selectionPointColor: COLOR_DIBUJO,
            selectionPointOutlineColor: "#000000",
            selectionPointOutlineWidth: 1,
            selectionPointWidth: 6,
            midPointColor: COLOR_DIBUJO,
            midPointOutlineColor: "#000000",
            midPointWidth: 4,
          },
        }),
        // Terra Draw needs somewhere inert to sit when drawing is off.
        new TerraDrawRenderMode({ modeName: "quieto", styles: {} }),
      ],
    })

    dibujo.start()
    dibujo.setMode("quieto")

    dibujo.on("finish", (id, contexto) => {
      const rasgo = dibujo.getSnapshotFeature(id)
      if (!rasgo || rasgo.geometry.type !== "Polygon") return

      const geometry = rasgo.geometry as GeoJSON.Polygon

      /*
       * `finish` fires for every commit: a completed trace, a dragged vertex, a
       * deleted one, an inserted midpoint. All of them are edits worth
       * reporting — the old `action !== "draw"` guard here is exactly what made
       * the geometry write-once.
       */
      if (kinks(turfPolygon(geometry.coordinates)).features.length > 0) {
        onGeometriaRef.current?.({
          ok: false,
          code: "GEOMETRY_SELF_INTERSECTING",
        })
        return
      }

      const nuevo = contexto.action === "draw"
      if (nuevo) {
        /*
         * The trace used to be deleted here and re-rendered as a static layer,
         * which is why a fresh lote could not be adjusted. It stays in the draw
         * store now, selected, so a vertex that landed wrong can be nudged
         * instead of redrawing the whole field.
         */
        borradorIdRef.current = id
        dibujo.setMode("select")
        dibujo.selectFeature(id)
      }

      reportadoRef.current = firmaDeGeometria(geometry)
      onGeometriaRef.current?.({ ok: true, geometry, nuevo })
    })

    dibujoRef.current = dibujo
  }

  /** Push the current lotes into the source, the labels, and the viewport. */
  function pintar() {
    const mapa = mapaRef.current
    if (!mapa || !listoRef.current) return

    const { lotes, modo, editandoId } = datosRef.current
    // Whatever Terra Draw is holding is Terra Draw's to paint. Leaving it here
    // too would draw the same field twice, and only one of the two would follow
    // the pointer.
    const visibles = lotesVisibles(lotes, modo === "ver" ? null : editandoId)

    // `GeoJSONSource` exists in MapLibre's types but is not exported, so the
    // narrowest honest cast is the one method we call.
    const fuente = mapa.getSource(FUENTE_LOTES) as
      | { setData: (data: GeoJSON.FeatureCollection) => void }
      | undefined
    fuente?.setData(toFeatureCollection(visibles))

    marcadoresRef.current.forEach((marcador) => marcador.remove())
    marcadoresRef.current = visibles.map((lote) => {
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

    /*
     * Re-frame when the set of lotes changes, never when one of them merely
     * changes shape. The old count-based gate broke the moment editing hid a
     * lote: the visible count moved, and the map yanked itself mid-drag.
     */
    const ids = lotes.map((lote) => lote.id).join(",")
    const limites = boundsOf(visibles)
    if (limites && modo === "ver" && idsPrevios.current !== ids) {
      mapa.fitBounds(limites, {
        padding: rellenoDeEncuadre(mapa),
        maxZoom: 15,
      })
    }
    idsPrevios.current = ids
  }

  /**
   * Puts Terra Draw in the state the props ask for.
   *
   * Runs on every relevant change rather than only on transitions, so it has to
   * be idempotent: each branch checks what the store already holds before
   * touching it.
   */
  function sincronizarModo() {
    const dibujo = dibujoRef.current
    if (!dibujo || !listoRef.current) return

    const { lotes, modo, editandoId } = datosRef.current

    if (modo === "ver") {
      if (borradorIdRef.current !== null) {
        dibujo.clear()
        borradorIdRef.current = null
        reportadoRef.current = null
      }
      if (dibujo.getMode() !== "quieto") dibujo.setMode("quieto")
      return
    }

    const enEdicion = editandoId
      ? lotes.find((lote) => lote.id === editandoId)
      : undefined

    // Nothing to hold yet: offer a fresh trace.
    if (!enEdicion) {
      if (borradorIdRef.current !== null) {
        dibujo.clear()
        borradorIdRef.current = null
        reportadoRef.current = null
      }
      if (dibujo.getMode() !== "polygon") dibujo.setMode("polygon")
      return
    }

    // Our own edit coming back as a prop. Re-loading it would snap the polygon
    // back to where the pointer no longer is.
    if (firmaDeGeometria(enEdicion.geometry) === reportadoRef.current) return

    if (borradorIdRef.current !== null) {
      dibujo.clear()
      borradorIdRef.current = null
    }

    /*
     * addFeatures reports a refusal in its return value instead of throwing. A
     * stored polygon that fails the validator would otherwise leave the
     * producer pressing "Editar" and watching nothing happen.
     */
    const [resultado] = dibujo.addFeatures([aFeatureDeDibujo(enEdicion)])
    if (!resultado?.valid) {
      onGeometriaRef.current?.({
        ok: false,
        code: "GEOMETRY_SELF_INTERSECTING",
      })
      return
    }

    borradorIdRef.current = resultado.id ?? null
    reportadoRef.current = firmaDeGeometria(enEdicion.geometry)
    if (dibujo.getMode() !== "select") dibujo.setMode("select")
    if (resultado.id !== undefined) dibujo.selectFeature(resultado.id)
  }

  /*
   * Call sites build `lotes` inline, so the array is a new object on every
   * render. Depending on it directly would repaint and re-frame the map
   * constantly; this signature changes only when the data actually does.
   */
  const firma = useMemo(
    () =>
      JSON.stringify(
        lotes.map((lote) => [lote.id, lote.verdict, lote.geometry.coordinates])
      ),
    [lotes]
  )

  useEffect(() => {
    pintar()
    sincronizarModo()
  }, [firma, modo, editandoId])

  // Frame whichever lote was picked from the list.
  useEffect(() => {
    const mapa = mapaRef.current
    if (!mapa || !seleccionadoId) return
    const lote = lotes.find((candidato) => candidato.id === seleccionadoId)
    if (!lote) return
    const limites = boundsOf([lote])
    if (limites)
      mapa.fitBounds(limites, {
        padding: rellenoDeEncuadre(mapa),
        duration: 800,
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seleccionadoId])

  /** One step in or out, holding still for anyone who asked for no motion. */
  function acercar(pasos: 1 | -1) {
    const mapa = mapaRef.current
    if (!mapa) return
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const opciones = quieto ? { duration: 0 } : undefined
    if (pasos === 1) mapa.zoomIn(opciones)
    else mapa.zoomOut(opciones)
  }

  /** Fly to wherever the buscador pointed, holding still for anyone who asked. */
  function irA({ centro, zoom }: Camara) {
    const mapa = mapaRef.current
    if (!mapa) return
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    /*
     * `easeTo`, not `flyTo`. A flyTo's parabolic arc across the country from
     * zoom 5 to zoom 12 is a two-to-four second swoop that requests tiles along
     * the whole path, which on a rural link is a grey smear for most of the
     * flight. The 800 ms reuses the one duration already in this file, so the
     * search adds no new motion vocabulary; the guard is the same one
     * `acercar` uses. Never `essential: true` — that runs the animation in
     * spite of the producer's own preference, which is backwards.
     */
    mapa.easeTo({ center: centro, zoom, duration: quieto ? 0 : 800 })
  }

  return (
    /*
     * `isolate` is kept from the Leaflet original. MapLibre has no pane
     * z-index ladder to trap, but `estado-vacio` still overlays a card on
     * this map, and an explicit stacking context is what makes plain DOM
     * order decide who paints on top.
     *
     * The engine gets its own child rather than this element: MapLibre appends
     * into whatever container it is handed, and React must not be reconciling
     * siblings inside it.
     */
    <div className={`${className ?? ""} isolate`}>
      {/*
       * Its own positioning box, and the engine's container sized by `h-full`
       * rather than by insets. `maplibre-gl.css` sets `position: relative` on
       * `.maplibregl-map` and loads after Tailwind, so an `absolute inset-0`
       * here silently collapses to zero height — a blank map with no error.
       */}
      <div className="relative h-full w-full">
        <div
          ref={contenedor}
          className="h-full w-full"
          role="application"
          aria-label={etiqueta}
        />

        {/*
         * Before the zoom stack on purpose: DOM order is tab order, and the
         * search field is the primary action on the screen that shows it. The
         * two never overlap — one is pinned left, the other right, and the
         * field's own `right-20` is what keeps the gap.
         *
         * A sibling of the engine's container rather than a child of it, which
         * is what makes `stopPropagation` unnecessary anywhere in the widget:
         * a pointerdown on the field cannot reach MapLibre's handlers, and a
         * tap in the dropdown cannot reach Terra Draw. The zoom buttons already
         * rely on this.
         */}
        {conBuscador ? <BuscadorZona onIr={irA} /> : null}

        {/*
         * Top right, not the bottom corner a GIS console would use. On the
         * detail screen the map stretches to the height of a panel that is
         * taller than the window, so anything anchored to the map's bottom
         * edge is scrolled off the screen it belongs to. This corner is the
         * only one free on all four screens: the empty state parks its card
         * at the bottom and Esri's credit sits bottom left.
         */}
        <div className="border-line absolute top-3 right-3 flex flex-col overflow-hidden rounded-md border bg-white sm:top-4 sm:right-4">
          <BotonZoom accion="acercar" onClick={() => acercar(1)} />
          <span aria-hidden="true" className="bg-line h-px" />
          <BotonZoom accion="alejar" onClick={() => acercar(-1)} />
        </div>
      </div>
    </div>
  )
}

/**
 * Half of the zoom pair.
 *
 * Square at the tap floor, so the two of them stack into a control a gloved
 * thumb can hit without looking. The glyph is drawn rather than typed: a text
 * plus sign carries the font's own metrics and will not sit on the optical
 * centre of a 3.25rem box.
 */
function BotonZoom({
  accion,
  onClick,
}: {
  accion: "acercar" | "alejar"
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={accion === "acercar" ? "Acercar el mapa" : "Alejar el mapa"}
      className="tap focus-ink text-ink flex w-[3.25rem] items-center justify-center"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M5 12h14" />
        {accion === "acercar" ? <path d="M12 5v14" /> : null}
      </svg>
    </button>
  )
}

/**
 * How much room a fit leaves around the lotes.
 *
 * Framing the polygons is not framing the map: the label is centred on the
 * polygon, it is wider than the field is at this zoom, and it is the thing the
 * producer actually reads and taps. With two lotes four provinces apart each
 * one shrinks to a few pixels and its label hangs half off the edge, so the
 * padding has to clear a label rather than a field. Capped as a share of the
 * container so a phone still gets a fit instead of a refusal.
 */
function rellenoDeEncuadre(mapa: maplibre.Map) {
  const { clientWidth: ancho, clientHeight: alto } = mapa.getContainer()
  const vertical = Math.min(64, alto * 0.15)
  const horizontal = Math.min(96, ancho * 0.2)
  return {
    top: vertical,
    bottom: vertical,
    left: horizontal,
    right: horizontal,
  }
}

/** Average of the outer ring — good enough to hang a label on. */
function centroDe(geometry: GeoJSON.Polygon): [number, number] {
  const anillo = geometry.coordinates[0] ?? []
  if (anillo.length === 0) return CENTRO_INICIAL
  const total = anillo.reduce<[number, number]>(
    (suma, [lon, lat]) => [suma[0] + (lon ?? 0), suma[1] + (lat ?? 0)],
    [0, 0]
  )
  return [total[0] / anillo.length, total[1] / anillo.length]
}

/** Re-exported so call sites keep importing one name for the lote shape. */
export type { MapLote }
