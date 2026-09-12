import type { ImageLayer } from "@/lib/services/imagery"

/** Above this the lote is clean enough that a percentage is just noise. */
const FULLY_CLEAR = 0.98

export const otherLayer = (layer: ImageLayer): ImageLayer =>
  layer === "ndvi" ? "trueColor" : "ndvi"

export const LAYER_LEGEND: Record<ImageLayer, string> = {
  trueColor:
    "Color real, como se ve desde arriba. Mirá sobre todo la textura: el monte es moteado y despareja, el desmonte deja fajas rectas y un color parejo.",
  ndvi: "Índice de vegetación (NDVI): mide cuánta hoja verde hay. El verde oscuro es monte en pie, los tonos tierra son suelo desnudo o rastrojo. Sirve cuando el color real los muestra parecidos.",
}

export const toggleLabel = (current: ImageLayer): string =>
  current === "trueColor" ? "Ver el índice de vegetación" : "Ver el color real"

export const SEASONAL_NOTE =
  "Las dos ventanas caen en la misma época del año, así que la diferencia de color no es estacional. Aun así, el veredicto no sale de estas imágenes: sale de las capas oficiales citadas arriba."

export const HOLES_NOTE =
  "Los huecos negros son píxeles que quedaron nublados en todas las pasadas de la ventana. No son suelo: son falta de imagen."

/**
 * How much of the lote the image actually shows.
 *
 * This is measured on the Sentinel scene — the share of the polygon that came
 * back painted rather than left transparent by the cloud mask — so it goes
 * above the Xweather line, which is weather at the centroid and knows nothing
 * about the picture.
 */
export function clearLine(ratio: number | null): string | null {
  if (ratio === null) return null
  if (ratio >= FULLY_CLEAR) return "Sin nubes sobre el lote en esta ventana."

  const pct = Math.round(ratio * 100).toLocaleString("es-AR")
  return `Imagen limpia en el ${pct} % del lote.`
}

/**
 * Why this window was chosen, and on whose authority.
 *
 * Never a bare percentage: the figure is mean daily sky cover from a weather
 * provider, not cloud measured over the scene, and rendering it as "2,4 % de
 * nubes" next to a satellite image invites reading it as the latter.
 */
export function cloudLine(cloudAvgPct: number | null): string | null {
  if (cloudAvgPct === null) return null

  const pct = cloudAvgPct.toLocaleString("es-AR", { maximumFractionDigits: 1 })
  return `Ventana elegida por nubosidad meteorológica media de ${pct} %.`
}

/** The year the baseline actually came from, rather than a hardcoded "2020". */
export const referenceChip = (dateTo: string): string => dateTo.slice(0, 4)
