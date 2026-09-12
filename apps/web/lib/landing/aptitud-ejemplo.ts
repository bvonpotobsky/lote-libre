import type { OtbnShare } from "@/lib/db/schema"

/**
 * A fictional lote, for the landing only.
 *
 * Invented on purpose. `ejemplo-capas.generated.ts` states the rule this obeys:
 * the example illustrates the method, never a result about a real place. Real
 * per-category hectares for a real department would be exactly the result that
 * file refuses to publish — and nobody outside this product would read it as
 * illustrative. Every surface the landing shows says so in words.
 */
export const SUPERFICIE_EJEMPLO_HA = 312

export const APTITUD_EJEMPLO: readonly OtbnShare[] = [
  { bucket: "rojo", hectares: 58, pct: 18.59 },
  { bucket: "amarillo", hectares: 133, pct: 42.63 },
  { bucket: "verde", hectares: 74, pct: 23.72 },
  { bucket: "fuera_de_otbn", hectares: 47, pct: 15.06 },
]
