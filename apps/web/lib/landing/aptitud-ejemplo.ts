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
export const SUPERFICIE_EJEMPLO_HA = 800

export const APTITUD_EJEMPLO: readonly OtbnShare[] = [
  { bucket: "rojo", hectares: 150, pct: 18.75 },
  { bucket: "amarillo", hectares: 340, pct: 42.5 },
  { bucket: "verde", hectares: 190, pct: 23.75 },
  { bucket: "fuera_de_otbn", hectares: 120, pct: 15 },
]
