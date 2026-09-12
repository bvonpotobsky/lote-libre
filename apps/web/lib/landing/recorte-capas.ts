/**
 * Clips the committed official layers to the example frame and projects the
 * survivors into SVG path strings.
 *
 * SCRIPT-ONLY. This module imports @turf/turf; it exists for
 * scripts/build-landing-assets.ts and its output is committed as
 * lib/landing/ejemplo-capas.generated.ts. Never import it from a component,
 * or the whole geo library ships to the browser.
 *
 * Order of operations, per feature: clip to the frame, then simplify (so the
 * straight clip edges are what gets thinned, never the frame itself), then
 * measure. Anything under `areaMinimaM2` is dropped: bboxClip turns a
 * dissolved province-wide MultiPolygon into hundreds of zero-area slivers
 * along the frame edge, and the floor is what keeps them out of the page.
 */
import * as turf from "@turf/turf"
import type {
  Feature,
  FeatureCollection,
  MultiPolygon,
  Polygon,
  Position,
} from "geojson"

import { type Bbox, type Vista, anilloAPath } from "./proyeccion"

export type CapaRecortada = {
  clave: string
  /** One SVG path, every surviving ring as its own subpath. */
  d: string
  anillos: number
  areaM2: number
}

export type OpcionesRecorte = {
  /** Which bucket a feature belongs to. null drops it. */
  clave: (props: Record<string, unknown>) => string | null
  /** Kills bboxClip's zero-area slivers. Default 5 000 m² (0.5 ha). */
  areaMinimaM2?: number
  /** turf.simplify tolerance in degrees. Omit to keep every vertex. */
  tolerancia?: number
  decimales?: number
}

type Anillo = Position[]

export function recortarYProyectar(
  fc: FeatureCollection,
  marco: Bbox,
  vista: Vista,
  opciones: OpcionesRecorte
): CapaRecortada[] {
  const { clave, areaMinimaM2 = 5_000, tolerancia, decimales = 1 } = opciones
  const bbox: [number, number, number, number] = [...marco]
  const porClave = new Map<string, { anillos: Anillo[]; areaM2: number }>()

  for (const feature of fc.features) {
    const geometria = feature.geometry
    if (!geometria) continue
    if (geometria.type !== "Polygon" && geometria.type !== "MultiPolygon") {
      continue
    }
    const key = clave(feature.properties ?? {})
    if (key === null) continue

    // bboxClip is typed for lines too; a polygon in is a polygon out.
    const recortado = turf.bboxClip(
      feature as Feature<Polygon | MultiPolygon>,
      bbox
    ) as Feature<Polygon | MultiPolygon>
    const afinado = tolerancia
      ? turf.simplify(recortado, { tolerance: tolerancia, highQuality: true })
      : recortado

    for (const poligono of poligonosDe(afinado.geometry)) {
      if (poligono.length === 0 || poligono[0]!.length < 4) continue
      const area = turf.area(turf.polygon(poligono))
      if (area < areaMinimaM2) continue
      const cubeta = porClave.get(key) ?? { anillos: [], areaM2: 0 }
      cubeta.anillos.push(...poligono)
      cubeta.areaM2 += area
      porClave.set(key, cubeta)
    }
  }

  return [...porClave.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, { anillos, areaM2 }]) => ({
      clave: key,
      d: anillos
        .map((anillo) =>
          anilloAPath(
            marco,
            vista,
            anillo.map(([lon, lat]) => [lon!, lat!] as const),
            decimales
          )
        )
        .join(""),
      anillos: anillos.length,
      areaM2: Math.round(areaM2),
    }))
}

function poligonosDe(geometria: Polygon | MultiPolygon): Anillo[][] {
  return geometria.type === "Polygon"
    ? [geometria.coordinates]
    : geometria.coordinates
}
