import type { SourceRef } from "@/lib/db/schema"
import { loadLayer, loadSourceManifest, overlapByKey } from "@/lib/geo/layers"

/** EUDR cutoff: goods must not come from land deforested after this date. */
export const CUTOFF_YEAR = 2020

/** Provinces whose layers ship with the app. */
export const COVERED_PROVINCES = new Set([
  "cordoba",
  "chaco",
  "santiago-del-estero",
])

export type ForestLossResult =
  | {
      status: "ok"
      /** Share of the lote intersecting post-cutoff loss, 0-100. */
      pct: number
      hectares: number
      /** Earliest loss year found after the cutoff. */
      firstYear: number | null
      yearsFound: number[]
      source: SourceRef | null
    }
  | {
      /** A transient read failure. Retrying can succeed. */
      status: "unavailable"
      reason: string
    }
  | {
      /** We do not ship this province at all. Retrying will never succeed. */
      status: "not_covered"
      provincia: string
    }

/**
 * Post-cutoff tree cover loss intersecting a lote.
 *
 * Unlike the OTBN lookup, a missing layer here is NOT a domain state we can
 * report on. Without it there is nothing to say about the question EUDR
 * actually asks, so the verification fails and stays retryable rather than
 * producing a verdict that looks informed and is not.
 */
export async function lookupForestLoss(
  lote: GeoJSON.Polygon,
  loteAreaHa: number,
  provincia: string,
): Promise<ForestLossResult> {
  // Telling someone to retry something that cannot succeed is worse than
  // telling them nothing. An uncovered province is a permanent answer.
  if (!COVERED_PROVINCES.has(provincia)) {
    return { status: "not_covered", provincia }
  }

  const layer = await loadLayer(`forest-loss/${provincia}.geojson`)
  if (!layer) {
    return {
      status: "unavailable",
      reason: `forest-loss layer for "${provincia}" could not be read`,
    }
  }
  if (loteAreaHa <= 0) {
    return { status: "unavailable", reason: "lote has no measurable area" }
  }

  const { hectaresByKey } = overlapByKey(lote, layer, (props) => {
    const year = Number(props.periodo ?? props.anio ?? props.year)
    return Number.isFinite(year) && year > CUTOFF_YEAR ? String(year) : null
  })

  let hectares = 0
  const yearsFound: number[] = []
  for (const [year, value] of hectaresByKey) {
    hectares += value
    yearsFound.push(Number(year))
  }
  yearsFound.sort((a, b) => a - b)

  return {
    status: "ok",
    pct: Number.parseFloat(((hectares / loteAreaHa) * 100).toFixed(2)),
    hectares: Number.parseFloat(hectares.toFixed(2)),
    firstYear: yearsFound[0] ?? null,
    yearsFound,
    source: await describeSource(provincia),
  }
}

async function describeSource(provincia: string): Promise<SourceRef | null> {
  const manifest = await loadSourceManifest()
  const entry = manifest?.forestLoss?.[provincia] as
    | Record<string, unknown>
    | undefined

  return {
    id: `forest-loss-${provincia}`,
    label:
      (entry?.label as string) ??
      "Monitoreo de Superficie de Bosque Nativo (UMSEF)",
    vintage: (entry?.vintage as string) ?? "desconocida",
    consultedAt: new Date().toISOString(),
    url: entry?.sourceUrl as string | undefined,
    caveat: entry?.caveat as string | undefined,
  }
}
