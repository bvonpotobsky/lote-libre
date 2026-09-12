import { nanoid } from "nanoid"

import { db } from "@/lib/db"
import {
  loteVerifications,
  type Lote,
  type LoteVerification,
  type SourceRef,
} from "@/lib/db/schema"
import { lookupForestLoss } from "./forest-loss"
import { lookupOtbn } from "./otbn"
import { decideVerdict } from "./verdict"

/**
 * Runs both layers against a lote and records the outcome.
 *
 * The two layers are NOT symmetric. A missing OTBN layer is a reportable domain
 * state (`sin_cobertura`, which the verdict treats as amber). A missing
 * forest-loss layer is not: without it there is nothing to say about the
 * question EUDR actually asks, so the verification is recorded as failed and
 * stays retryable rather than producing a verdict that looks informed and isn't.
 */
export async function runVerification(
  userId: string,
  lote: Lote,
): Promise<LoteVerification> {
  const forestLoss = await lookupForestLoss(
    lote.geometry,
    lote.areaHa,
    lote.provincia,
  )

  if (forestLoss.status === "not_covered") {
    return persist({
      userId,
      loteId: lote.id,
      status: "failed",
      failureCode: "PROVINCE_NOT_COVERED",
      sources: [],
      reasons: [],
    })
  }

  if (forestLoss.status === "unavailable") {
    console.warn(
      `[verification] forest loss unavailable for lote ${lote.id}: ${forestLoss.reason}`,
    )
    return persist({
      userId,
      loteId: lote.id,
      status: "failed",
      failureCode: "FOREST_LOSS_UNAVAILABLE",
      sources: [],
      reasons: [],
    })
  }

  const otbn = await lookupOtbn(lote.geometry, lote.areaHa, lote.provincia)
  const { verdict, reasons } = decideVerdict({
    forestLossPct: forestLoss.pct,
    otbnCategory: otbn.category,
  })

  const sources = [forestLoss.source, otbn.source].filter(
    (source): source is SourceRef => source !== null,
  )

  return persist({
    userId,
    loteId: lote.id,
    status: "ready",
    verdict,
    reasons,
    forestLossPct: forestLoss.pct,
    forestLossHa: forestLoss.hectares,
    forestLossFirstYear: forestLoss.firstYear,
    otbnCategory: otbn.category,
    otbnPct: otbn.pct,
    sources,
  })
}

type PersistInput = Omit<
  typeof loteVerifications.$inferInsert,
  "id" | "createdAt"
>

async function persist(values: PersistInput): Promise<LoteVerification> {
  const [row] = await db
    .insert(loteVerifications)
    .values({ id: nanoid(12), ...values })
    .returning()

  return row!
}
