import type { OtbnCategory, Verdict } from "@/lib/db/schema"

/**
 * Share of the lote below which a forest-loss overlap is treated as marginal
 * rather than as deforestation. Hansen and UMSEF polygons are raster derived,
 * so a lote boundary that grazes a cleared pixel picks up a sliver that is an
 * artefact of resolution, not a clearing.
 */
export const MARGINAL_LOSS_PCT = 0.5

/** Minimum share of the lote for an OTBN category to count at all. */
export const MIN_OTBN_SHARE_PCT = 1

export type VerdictInput = {
  /** Share of the lote intersecting tree-cover loss after 2020-12-31, 0-100. */
  forestLossPct: number
  otbnCategory: OtbnCategory
}

export type VerdictOutcome = {
  verdict: Verdict
  /** Machine-readable reasons, rendered as the evidence list in the UI. */
  reasons: VerdictReason[]
}

export type VerdictReason =
  | "FOREST_LOSS_AFTER_CUTOFF"
  | "FOREST_LOSS_MARGINAL"
  | "OTBN_CATEGORY_I"
  | "OTBN_CATEGORY_II"
  | "OTBN_NO_COVERAGE"
  | "OTBN_OUTSIDE"
  | "NO_FINDINGS"

/**
 * The traffic light.
 *
 * Green requires positive evidence from BOTH layers: zero post-cutoff forest
 * loss AND an OTBN answer that is not a restriction — either a confirmed
 * Categoría III, or the lote sitting outside the zoning entirely, which means
 * the province did not classify it as native forest. Absence of data is never green — an
 * unknown dressed up as a clean result is worse than an honest amber, because
 * the whole point of the document is that someone downstream can rely on it.
 *
 * A lote in Categoría I with no post-2020 loss is amber, not red: EUDR asks
 * about deforestation after 2020-12-31, and there was none. But Categoría I is
 * land where clearing is prohibited under Ley 26.331, so an acopio needs to see
 * it. Flag it; do not fail it.
 */
export function decideVerdict({
  forestLossPct,
  otbnCategory,
}: VerdictInput): VerdictOutcome {
  const reasons: VerdictReason[] = []

  if (forestLossPct >= MARGINAL_LOSS_PCT) {
    reasons.push("FOREST_LOSS_AFTER_CUTOFF")
    return { verdict: "rojo", reasons }
  }

  if (forestLossPct > 0) reasons.push("FOREST_LOSS_MARGINAL")
  if (otbnCategory === "rojo") reasons.push("OTBN_CATEGORY_I")
  if (otbnCategory === "amarillo") reasons.push("OTBN_CATEGORY_II")
  if (otbnCategory === "sin_cobertura") reasons.push("OTBN_NO_COVERAGE")
  // `fuera_de_otbn` adds no reason: it is the absence of a restriction, not a
  // finding, and it does not on its own keep a lote from being green.

  if (reasons.length > 0) return { verdict: "amarillo", reasons }

  return { verdict: "verde", reasons: ["NO_FINDINGS"] }
}

/** Spanish copy for each reason, shown in the evidence panel and the PDF. */
export const REASON_COPY: Record<VerdictReason, string> = {
  FOREST_LOSS_AFTER_CUTOFF:
    "Se detectó pérdida de cobertura arbórea dentro del lote posterior al 31/12/2020.",
  FOREST_LOSS_MARGINAL:
    "Hay una superposición mínima con pérdida de cobertura, compatible con el borde de un píxel.",
  OTBN_CATEGORY_I:
    "El lote está en Categoría I (rojo) del OTBN: bosque de conservación, no se puede desmontar.",
  OTBN_CATEGORY_II:
    "El lote está en Categoría II (amarillo) del OTBN: uso sostenible, sin desmonte.",
  OTBN_NO_COVERAGE:
    "No hay capa de OTBN cargada para esta provincia, así que no pudimos verificar la categoría.",
  OTBN_OUTSIDE:
    "El lote no está comprendido en el OTBN de la provincia: no fue clasificado como bosque nativo.",
  NO_FINDINGS:
    "Sin pérdida de cobertura posterior al 31/12/2020 y sin restricción del OTBN.",
}

/**
 * Most restrictive category present in the lote above a minimum share, not the
 * largest one. A lote that is 60% Categoría III and 40% Categoría I is a
 * Categoría I problem; reporting the dominant category would hide that.
 */
export function dominantOtbnCategory(
  shareByCategory: ReadonlyMap<OtbnCategory, number>,
): { category: OtbnCategory; pct: number } {
  const order: OtbnCategory[] = ["rojo", "amarillo", "verde"]

  for (const category of order) {
    const pct = shareByCategory.get(category) ?? 0
    if (pct >= MIN_OTBN_SHARE_PCT) {
      return { category, pct: Number.parseFloat(pct.toFixed(2)) }
    }
  }

  return { category: "sin_cobertura", pct: 0 }
}
