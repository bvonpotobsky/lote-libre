import type {
  OtbnBucket,
  OtbnCategory,
  OtbnShare,
  SourceRef,
} from "@/lib/db/schema"
import { loadLayer, loadSourceManifest, overlapByKey } from "@/lib/geo/layers"
import { dominantOtbnCategory } from "./verdict"

const CATEGORIES = new Set<OtbnCategory>(["rojo", "amarillo", "verde"])

export type OtbnResult = {
  category: OtbnCategory
  /** Share of the lote in that category, 0-100. */
  pct: number
  source: SourceRef | null
  /** Empty when the province has no layer: we do not know is not a share. */
  breakdown: OtbnShare[]
}

/** Print order: most restrictive first, unzoned last. */
const BUCKET_ORDER: readonly OtbnBucket[] = [
  "rojo",
  "amarillo",
  "verde",
  "fuera_de_otbn",
]

/**
 * Below this, a bucket is arithmetic rather than territory.
 *
 * The zoned totals come from unrounded intersection areas while `loteAreaHa`
 * arrives rounded — `measure()` in lib/geo/metrics.ts applies `toFixed(4)` to
 * `areaHa`, so the worst rounding artifact the derived remainder can carry is
 * half of the last kept digit, 5e-5 ha. This threshold sits about 200× above
 * that worst case. (`COORD_DECIMALS = 6` in that module rounds coordinates,
 * not areas.) Emitting the artifact would print "Fuera del OTBN" on a lote
 * that is entirely zoned.
 *
 * The filter runs on all four buckets, not only the derived one, and the same
 * reasoning covers a measured bucket: the OTBN layers are 1:250 000 — one
 * millimetre on that map is 250 m on the ground — so 100 m² is below what the
 * source resolves in any category. A sliver that small is the boundary's own
 * uncertainty, whichever bucket it lands in.
 */
const MIN_BUCKET_HA = 0.01

/**
 * How far the zoned total may exceed the lote before the split is discarded.
 *
 * Relative, so ordinary float and rounding noise does not trip it: the zoned
 * areas are unrounded and `loteAreaHa` is not, so an exactly-covered lote can
 * land a hair either side of 100 %.
 */
const MAX_ZONED_OVERSHOOT = 1.01

/**
 * How the lote's surface divides across the OTBN, in hectares.
 *
 * `dominantOtbnCategory` answers "which restriction governs this lote", which
 * is what the verdict needs. This answers "how much of it is under each one",
 * which is what prices it: Categoría I cannot be cleared at all, so a field
 * that is 40 % Categoría I has a permanent ceiling on its productive surface.
 * Both come from the same intersection; only the first was being kept.
 *
 * `overlapByKey` sums per-feature intersections without unioning them, so a
 * published layer whose polygons overlap can zone more surface than the lote
 * has. When that happens the whole split is dropped, not clamped: a reparto
 * that sums past the whole field is not a measurement of anything, and the
 * product's rule is that a missing datum is never dressed up as a clean
 * result. Showing nothing is honest; showing 137 % of the lote is not.
 */
export function buildOtbnBreakdown(
  hectaresByKey: ReadonlyMap<string, number>,
  loteAreaHa: number,
): OtbnShare[] {
  if (loteAreaHa <= 0) return []

  const byBucket = new Map<OtbnBucket, number>()
  let zoned = 0

  for (const [key, hectares] of hectaresByKey) {
    if (!CATEGORIES.has(key as OtbnCategory)) continue
    const bucket = key as OtbnBucket
    byBucket.set(bucket, (byBucket.get(bucket) ?? 0) + hectares)
    zoned += hectares
  }

  // Rescaling the buckets back down to the lote is not an option either: it
  // would move hectares between categories the layer never claimed, inventing
  // data to make a sum look tidy.
  if (zoned > loteAreaHa * MAX_ZONED_OVERSHOOT) return []

  byBucket.set("fuera_de_otbn", Math.max(0, loteAreaHa - zoned))

  return BUCKET_ORDER.flatMap((bucket) => {
    const hectares = byBucket.get(bucket) ?? 0
    if (hectares < MIN_BUCKET_HA) return []

    return [
      {
        bucket,
        hectares: Math.round(hectares),
        pct: Number.parseFloat(((hectares / loteAreaHa) * 100).toFixed(1)),
      },
    ]
  })
}

/**
 * OTBN category for a lote (Ordenamiento Territorial de Bosques Nativos,
 * Ley 26.331).
 *
 * A province whose layer we do not ship yields `sin_cobertura`, which the
 * verdict treats as amber: the legal category of a parcel is not observable
 * from any satellite, so without the map we genuinely do not know.
 *
 * A lote that falls outside every zoned polygon of a layer we DO have yields
 * `fuera_de_otbn`, which is different in kind. The OTBN zones native forest;
 * land outside it was not classified as forest. Collapsing the two would make
 * a green verdict unreachable in Córdoba, which zones no Categoría III at all.
 */
export async function lookupOtbn(
  lote: GeoJSON.Polygon,
  loteAreaHa: number,
  provincia: string,
): Promise<OtbnResult> {
  const layer = await loadLayer(`otbn/${provincia}.geojson`)
  if (!layer || loteAreaHa <= 0) {
    return { category: "sin_cobertura", pct: 0, source: null, breakdown: [] }
  }

  const { hectaresByKey } = overlapByKey(lote, layer, (props) => {
    const value = props.categoria
    return typeof value === "string" && CATEGORIES.has(value as OtbnCategory)
      ? value
      : null
  })

  const shareByCategory = new Map<OtbnCategory, number>()
  for (const [category, hectares] of hectaresByKey) {
    shareByCategory.set(category as OtbnCategory, (hectares / loteAreaHa) * 100)
  }

  const { category, pct } = dominantOtbnCategory(shareByCategory)
  // The layer answered; the lote simply is not inside any zoned polygon.
  // That is an answer, not a gap, and it must not read as "we do not know".
  const resolved = category === "sin_cobertura" ? "fuera_de_otbn" : category

  return {
    category: resolved,
    pct,
    source: await describeSource(provincia),
    breakdown: buildOtbnBreakdown(hectaresByKey, loteAreaHa),
  }
}

async function describeSource(provincia: string): Promise<SourceRef | null> {
  const manifest = await loadSourceManifest()
  const entry = manifest?.otbn?.[provincia] as Record<string, unknown> | undefined

  return {
    id: `otbn-${provincia}`,
    label:
      (entry?.label as string) ??
      "Ordenamiento Territorial de Bosques Nativos (Ley 26.331)",
    vintage: (entry?.vintage as string) ?? "desconocida",
    consultedAt: new Date().toISOString(),
    url: entry?.sourceUrl as string | undefined,
    caveat: entry?.caveat as string | undefined,
  }
}
