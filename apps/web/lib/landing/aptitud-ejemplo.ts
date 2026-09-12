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

/**
 * The split the sheet's own verdict box requires.
 *
 * `HojaDocumento` prints a verde badge, so these figures have to be a split
 * that lib/services/verdict.ts actually scores verde. `dominantOtbnCategory`
 * tests rojo first and `MIN_OTBN_SHARE_PCT` is 1, so the governing category is
 * whichever of I, II or III first clears 1 % of the lote. Here the raw shares
 * are 0.641 % and 0.962 %: both slivers fall short, Categoría III governs, and
 * the verdict is verde. Four buckets still render, which is the point.
 *
 * The example therefore also shows, quietly, that a sliver under 1 % does not
 * decide the colour of the lote. Percentages are the one-decimal figures
 * `buildOtbnBreakdown` produces for these hectares over 312.
 */
export const APTITUD_EJEMPLO: readonly OtbnShare[] = [
  { bucket: "rojo", hectares: 2, pct: 0.6 },
  { bucket: "amarillo", hectares: 3, pct: 1 },
  { bucket: "verde", hectares: 306, pct: 98.1 },
  { bucket: "fuera_de_otbn", hectares: 1, pct: 0.3 },
]
