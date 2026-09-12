"use client"

import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet-draw"

import "leaflet/dist/leaflet.css"
import "leaflet-draw/dist/leaflet.draw.css"

export type MapaProps = {
  /** Polygon to display. */
  geometry?: GeoJSON.Polygon | null
  /** When provided, the draw tool is enabled and reports what was traced. */
  onDibujar?: (geometry: GeoJSON.Polygon | null) => void
  className?: string
}

/** Satellite, not streets: a producer recognises their own field, not a road. */
const IMAGERY_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
const IMAGERY_ATTRIBUTION =
  "Imágenes: Esri, Maxar, Earthstar Geographics"

/** Centred on the dry Chaco, where most of this matters. */
const CENTRO_INICIAL: L.LatLngTuple = [-27.5, -63.5]

const ESTILO_LOTE: L.PathOptions = {
  color: "#ffffff",
  weight: 3,
  opacity: 1,
  fillColor: "#ffffff",
  fillOpacity: 0.12,
}

/** leaflet-draw ships English strings; this app speaks to producers in Spanish. */
function traducirControles(): void {
  const draw = L.drawLocal.draw
  draw.toolbar.actions.title = "Cancelar el dibujo"
  draw.toolbar.actions.text = "Cancelar"
  draw.toolbar.finish.title = "Terminar el lote"
  draw.toolbar.finish.text = "Terminar"
  draw.toolbar.undo.title = "Borrar el último punto"
  draw.toolbar.undo.text = "Borrar punto"
  draw.toolbar.buttons.polygon = "Dibujar el contorno del lote"
  draw.handlers.polygon.tooltip.start = "Tocá el mapa para empezar el contorno."
  draw.handlers.polygon.tooltip.cont = "Seguí tocando para marcar los vértices."
  draw.handlers.polygon.tooltip.end = "Tocá el primer punto para cerrar el lote."

  const edit = L.drawLocal.edit
  edit.toolbar.actions.save.title = "Guardar los cambios"
  edit.toolbar.actions.save.text = "Guardar"
  edit.toolbar.actions.cancel.title = "Descartar los cambios"
  edit.toolbar.actions.cancel.text = "Descartar"
  edit.toolbar.actions.clearAll.title = "Borrar el lote"
  edit.toolbar.actions.clearAll.text = "Borrar todo"
  edit.toolbar.buttons.edit = "Mover los vértices"
  edit.toolbar.buttons.editDisabled = "No hay nada para editar"
  edit.toolbar.buttons.remove = "Borrar el lote"
  edit.toolbar.buttons.removeDisabled = "No hay nada para borrar"
  edit.handlers.edit.tooltip.text = "Arrastrá los vértices para corregir."
  edit.handlers.edit.tooltip.subtext = "Tocá descartar para deshacer."
  edit.handlers.remove.tooltip.text = "Tocá el lote para borrarlo."
}

export default function MapaLeaflet({
  geometry,
  onDibujar,
  className,
}: MapaProps) {
  const contenedor = useRef<HTMLDivElement>(null)
  const mapaRef = useRef<L.Map | null>(null)
  const capaRef = useRef<L.FeatureGroup | null>(null)
  // Held in a ref so changing the callback never tears the map down.
  const onDibujarRef = useRef(onDibujar)
  onDibujarRef.current = onDibujar

  useEffect(() => {
    if (!contenedor.current || mapaRef.current) return

    traducirControles()

    const mapa = L.map(contenedor.current, {
      center: CENTRO_INICIAL,
      zoom: 6,
      zoomControl: true,
      attributionControl: true,
    })
    L.tileLayer(IMAGERY_URL, {
      maxZoom: 18,
      attribution: IMAGERY_ATTRIBUTION,
    }).addTo(mapa)

    const dibujados = new L.FeatureGroup().addTo(mapa)
    mapaRef.current = mapa
    capaRef.current = dibujados

    if (onDibujarRef.current) {
      const control = new L.Control.Draw({
        position: "topright",
        draw: {
          polygon: {
            allowIntersection: false,
            showArea: false,
            shapeOptions: ESTILO_LOTE,
            drawError: {
              color: "#b3161c",
              message: "Los lados no pueden cruzarse.",
            },
          },
          polyline: false,
          rectangle: false,
          circle: false,
          circlemarker: false,
          marker: false,
        },
        edit: { featureGroup: dibujados, edit: {}, remove: true },
      })
      mapa.addControl(control)

      const emitir = () => {
        const capas = dibujados.getLayers()
        const primera = capas[0] as L.Polygon | undefined
        if (!primera) {
          onDibujarRef.current?.(null)
          return
        }
        const feature = primera.toGeoJSON() as GeoJSON.Feature<GeoJSON.Polygon>
        onDibujarRef.current?.(feature.geometry)
      }

      mapa.on(L.Draw.Event.CREATED, (event) => {
        // One lote per drawing: a second trace replaces the first rather than
        // quietly adding a shape the producer cannot see they created.
        dibujados.clearLayers()
        dibujados.addLayer((event as L.DrawEvents.Created).layer)
        emitir()
      })
      mapa.on(L.Draw.Event.EDITED, emitir)
      mapa.on(L.Draw.Event.DELETED, emitir)
    }

    return () => {
      mapa.remove()
      mapaRef.current = null
      capaRef.current = null
    }
  }, [])

  // Render (or re-render) the polygon handed in from outside.
  useEffect(() => {
    const mapa = mapaRef.current
    const capa = capaRef.current
    if (!mapa || !capa) return

    capa.clearLayers()
    if (!geometry) return

    const forma = L.geoJSON(geometry, { style: () => ESTILO_LOTE })
    forma.eachLayer((layer) => capa.addLayer(layer))

    const limites = capa.getBounds()
    if (limites.isValid()) mapa.fitBounds(limites, { padding: [32, 32] })
  }, [geometry])

  return (
    <div
      ref={contenedor}
      className={className}
      role="application"
      aria-label="Mapa del lote"
    />
  )
}
