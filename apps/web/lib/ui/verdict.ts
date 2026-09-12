import type { OtbnCategory, Verdict } from "@/lib/db/schema"

/**
 * How a verdict presents itself.
 *
 * Colour never carries the meaning alone: roughly one man in twelve cannot
 * separate red from green, and this audience is mostly men working outdoors.
 * Every verdict ships with its own words.
 */
export const VERDICT_UI: Record<
  Verdict,
  { titulo: string; resumen: string; bg: string; texto: string; borde: string }
> = {
  verde: {
    titulo: "Sin observaciones",
    resumen: "No hay pérdida de bosque posterior al 31/12/2020 en este lote.",
    bg: "bg-verde",
    texto: "text-white",
    borde: "border-verde",
  },
  amarillo: {
    titulo: "Con observaciones",
    resumen: "Hay algo que el acopio va a querer mirar antes de comprar.",
    bg: "bg-amarillo",
    texto: "text-ink",
    borde: "border-amarillo",
  },
  rojo: {
    titulo: "No cumple",
    resumen:
      "Se detectó pérdida de bosque posterior a la fecha de corte dentro del lote.",
    bg: "bg-rojo",
    texto: "text-white",
    borde: "border-rojo",
  },
}

/**
 * The mark each verdict draws, on a 16-unit viewBox.
 *
 * It lives beside the words for the same reason the words exist: the swatch
 * carries the colour, the glyph carries the shape, and neither is asked to
 * mean anything on its own. Surfaces style their own `<svg>`; only the path
 * is shared, so the tick in the landing and the tick in the app are the
 * same tick.
 */
export const VERDICT_TRAZO: Record<Verdict, string> = {
  verde: "M3.5 8.5l3 3 6-6",
  amarillo: "M8 3.5v5.5M8 12.5h.01",
  rojo: "M4.5 4.5l7 7M11.5 4.5l-7 7",
}

export const OTBN_UI: Record<
  OtbnCategory,
  { etiqueta: string; detalle: string; swatch: string }
> = {
  rojo: {
    etiqueta: "Categoría I",
    detalle: "Conservación. No se puede desmontar.",
    swatch: "bg-otbn-i",
  },
  amarillo: {
    etiqueta: "Categoría II",
    detalle: "Uso sostenible. Sin desmonte.",
    swatch: "bg-otbn-ii",
  },
  verde: {
    etiqueta: "Categoría III",
    detalle: "Puede transformarse, con autorización.",
    swatch: "bg-otbn-iii",
  },
  fuera_de_otbn: {
    etiqueta: "Fuera del OTBN",
    detalle: "La provincia no clasificó esta tierra como bosque nativo.",
    swatch: "bg-field border border-line",
  },
  sin_cobertura: {
    etiqueta: "Sin capa cargada",
    detalle: "No tenemos el OTBN de esta provincia, así que no lo pudimos ver.",
    swatch: "bg-field border border-line",
  },
}

export const PROVINCIA_UI: Record<string, string> = {
  cordoba: "Córdoba",
  chaco: "Chaco",
  "santiago-del-estero": "Santiago del Estero",
  desconocida: "Sin determinar",
}

export const nombreProvincia = (slug: string): string =>
  PROVINCIA_UI[slug] ??
  slug.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase())

export const formatHa = (value: number): string =>
  value.toLocaleString("es-AR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })

export const formatPct = (value: number | null): string =>
  value === null
    ? "sin dato"
    : `${value.toLocaleString("es-AR", { maximumFractionDigits: 2 })} %`

export const formatFecha = (iso: string | Date): string =>
  new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
