import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import {
  loteVerifications,
  type Lote,
  type LoteVerification,
} from "@/lib/db/schema"
import {
  buildPayload,
  hashPayload,
  type DocumentImagery,
  type DueDiligencePayload,
} from "./document"
import { readCachedImagery } from "./imagery"

/**
 * Returns the payload and hash for a verification, computing them once.
 *
 * The first call freezes both onto the verification row. Every later call
 * replays the stored payload, so re-downloading the document yields the same
 * hash — which is the entire point of printing one.
 */
export async function resolveDocument(
  lote: Lote,
  verification: LoteVerification,
  productor: { nombre: string; email: string },
): Promise<{ payload: DueDiligencePayload; hash: string }> {
  if (verification.documentPayload && verification.documentHash) {
    return {
      payload: verification.documentPayload as DueDiligencePayload,
      hash: verification.documentHash,
    }
  }

  const imagenes = await collectImagery(lote.geometryHash)
  const payload = buildPayload({ lote, verification, productor, imagenes })
  const hash = hashPayload(payload)

  await db
    .update(loteVerifications)
    .set({ documentPayload: payload, documentHash: hash })
    .where(eq(loteVerifications.id, verification.id))

  return { payload, hash }
}

async function collectImagery(
  geometryHash: string,
): Promise<DocumentImagery[]> {
  const cached = await readCachedImagery(geometryHash)

  return (
    [
      ["referencia", cached.reference],
      ["actual", cached.current],
    ] as const
  ).flatMap(([periodo, meta]) =>
    meta
      ? [
          {
            periodo,
            desde: meta.dateFrom,
            hasta: meta.dateTo,
            nubosidadMediaPct: meta.cloudAvgPct,
            origenVentana: meta.windowSource,
            sinImagen: meta.isEmpty,
          } satisfies DocumentImagery,
        ]
      : [],
  )
}
