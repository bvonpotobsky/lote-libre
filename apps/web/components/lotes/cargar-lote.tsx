"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useMemo, useRef, useState, type FormEvent } from "react"
import area from "@turf/area"
import { polygon as turfPolygon } from "@turf/helpers"
import { kml } from "@tmcw/togeojson"

import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { Mapa } from "@/components/mapa/mapa"
import { extractPolygon } from "@/lib/geo/parse"
import { formatHa } from "@/lib/ui/verdict"

type Origen = "draw" | "kml" | "geojson"
type Aviso = { mensaje: string; sugerencia?: string }

const COPY_ARCHIVO: Record<string, Aviso> = {
  FILE_UNREADABLE: {
    mensaje: "No pudimos leer el archivo.",
    sugerencia:
      "Tiene que ser un KML o un GeoJSON. Si lo exportaste como KMZ, descomprimilo y subí el KML de adentro.",
  },
  FILE_MULTIPLE_POLYGONS: {
    mensaje: "El archivo tiene más de un polígono.",
    sugerencia: "Se carga un lote por vez. Exportá solo el que querés cargar.",
  },
  GEOMETRY_NOT_POLYGON: {
    mensaje: "El archivo no contiene un polígono.",
    sugerencia:
      "Un lote tiene que ser un área cerrada. Si el KML trae puntos o recorridos, exportá el contorno del lote.",
  },
}

export function CargarLote() {
  const router = useRouter()
  const modoInicial = useSearchParams().get("modo")
  const archivoRef = useRef<HTMLInputElement>(null)

  const [geometry, setGeometry] = useState<GeoJSON.Polygon | null>(null)
  const [origen, setOrigen] = useState<Origen>("draw")
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const [guardando, setGuardando] = useState(false)

  const superficieHa = useMemo(() => {
    if (!geometry) return null
    try {
      return area(turfPolygon(geometry.coordinates)) / 10_000
    } catch {
      return null
    }
  }, [geometry])

  function leerArchivo(file: File) {
    setAviso(null)
    const lector = new FileReader()

    lector.onerror = () => setAviso(COPY_ARCHIVO.FILE_UNREADABLE!)
    lector.onload = () => {
      const texto = String(lector.result ?? "")
      const esKml = /\.kml$/i.test(file.name)

      let crudo: unknown
      try {
        crudo = esKml
          ? kml(new DOMParser().parseFromString(texto, "application/xml"))
          : JSON.parse(texto)
      } catch {
        setAviso(COPY_ARCHIVO.FILE_UNREADABLE!)
        return
      }

      const extraido = extractPolygon(crudo)
      if (!extraido.ok) {
        setAviso(COPY_ARCHIVO[extraido.code] ?? COPY_ARCHIVO.FILE_UNREADABLE!)
        return
      }

      setGeometry(extraido.geometry)
      setOrigen(esKml ? "kml" : "geojson")
    }

    lector.readAsText(file)
  }

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!geometry) {
      setAviso({
        mensaje: "Todavía no marcaste el lote.",
        sugerencia: "Dibujá el contorno en el mapa o importá un archivo.",
      })
      return
    }

    setAviso(null)
    setGuardando(true)

    const datos = new FormData(event.currentTarget)
    const respuesta = await fetch("/api/lotes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        nombre: String(datos.get("nombre") ?? "").trim(),
        renspa: String(datos.get("renspa") ?? "").trim() || null,
        source: origen,
        geometry,
      }),
    })

    const cuerpo = await respuesta.json()
    if (!respuesta.ok || cuerpo.ok === false) {
      setAviso({
        mensaje: cuerpo?.error?.message ?? "No pudimos guardar el lote.",
        sugerencia: cuerpo?.error?.hint,
      })
      setGuardando(false)
      return
    }

    router.push(`/lotes/${cuerpo.data.id}`)
    router.refresh()
  }

  return (
    <div className="flex h-[calc(100svh-3.5rem)] flex-col lg:flex-row">
      <div className="relative min-h-[42svh] flex-1 lg:min-h-0">
        <Mapa
          className="absolute inset-0 h-full w-full"
          geometry={origen === "draw" ? null : geometry}
          onDibujar={(dibujado) => {
            setGeometry(dibujado)
            setOrigen("draw")
            setAviso(null)
          }}
        />
      </div>

      <form
        onSubmit={guardar}
        className="border-line flex flex-col gap-5 overflow-y-auto border-t bg-white p-4 sm:p-6 lg:w-[26rem] lg:border-t-0 lg:border-l"
      >
        <div>
          <h1 className="text-xl font-bold tracking-tight">Cargar un lote</h1>
          <p className="text-ink-soft mt-1 text-sm leading-relaxed">
            Dibujá el contorno con la herramienta de arriba a la derecha del
            mapa, o importá el archivo que ya tenés.
          </p>
        </div>

        <div>
          <input
            ref={archivoRef}
            type="file"
            accept=".kml,.geojson,.json,application/geo+json,application/vnd.google-earth.kml+xml"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) leerArchivo(file)
              event.target.value = ""
            }}
          />
          <button
            type="button"
            onClick={() => archivoRef.current?.click()}
            className="border-ink text-ink tap flex w-full items-center justify-center rounded-md border-2 px-4 text-base font-semibold"
            autoFocus={modoInicial === "importar"}
          >
            Importar KML o GeoJSON
          </button>
        </div>

        <div
          className={`rounded-md px-4 py-3 ${superficieHa ? "bg-field" : "border-line border border-dashed"}`}
        >
          {superficieHa ? (
            <>
              <p className="text-2xl font-bold">{formatHa(superficieHa)} ha</p>
              <p className="text-ink-soft text-sm">
                {origen === "draw"
                  ? "Dibujado sobre el mapa"
                  : `Importado desde ${origen === "kml" ? "KML" : "GeoJSON"}`}
              </p>
            </>
          ) : (
            <p className="text-ink-soft text-sm">
              La superficie aparece acá cuando marques el lote.
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="nombre" className="text-base">
            Nombre del lote
          </Label>
          <Input
            id="nombre"
            name="nombre"
            required
            maxLength={120}
            placeholder="Lote 4 — Campo El Ceibo"
            className="tap text-base"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="renspa" className="text-base">
            RENSPA <span className="text-ink-soft font-normal">(opcional)</span>
          </Label>
          <Input
            id="renspa"
            name="renspa"
            maxLength={40}
            placeholder="01.234.5.67890/AB"
            className="tap text-base"
          />
          <p className="text-ink-soft text-sm">
            Se imprime en el documento tal cual lo escribas. No lo validamos
            contra SENASA.
          </p>
        </div>

        {aviso ? (
          <div
            role="alert"
            className="border-rojo border-l-4 bg-white py-2 pl-3 text-sm"
          >
            <p className="text-rojo font-semibold">{aviso.mensaje}</p>
            {aviso.sugerencia ? (
              <p className="text-ink-soft mt-1">{aviso.sugerencia}</p>
            ) : null}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={guardando}
          className="bg-ink text-paper tap mt-auto flex items-center justify-center rounded-md px-4 text-base font-semibold disabled:opacity-50"
        >
          {guardando ? "Guardando…" : "Guardar lote"}
        </button>
      </form>
    </div>
  )
}
