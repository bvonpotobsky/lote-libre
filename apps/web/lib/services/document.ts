import { createHash } from "node:crypto"

import type { Lote, LoteVerification, SourceRef } from "@/lib/db/schema"
import type { VerdictReason } from "./verdict"
import { REASON_COPY } from "./verdict"

export const PAYLOAD_VERSION = 1 as const

export type DocumentImagery = {
  periodo: "referencia" | "actual"
  desde: string
  hasta: string
  nubosidadMediaPct: number | null
  origenVentana: "xweather" | "fallback"
  sinImagen: boolean
}

/**
 * Exactly what the due-diligence document asserts. The SHA-256 in the footer is
 * taken over this object, never over the PDF bytes: a PDF embeds its creation
 * timestamp, so hashing the file would produce a value nobody could ever
 * recompute — decorative, not verifiable.
 *
 * The payload is stored with the verification so that re-issuing the document
 * reproduces the same hash, and so a third party can re-serialize it and check.
 */
export type DueDiligencePayload = {
  version: typeof PAYLOAD_VERSION
  emitidoEl: string
  productor: { nombre: string; email: string }
  lote: {
    id: string
    nombre: string
    provincia: string
    renspa: string | null
    superficieHa: number
    centroide: { lon: number; lat: number }
    geometriaHash: string
  }
  verificacion: {
    id: string
    fecha: string
    veredicto: string
    motivos: Array<{ codigo: string; texto: string }>
    perdidaForestal: {
      porcentajeSuperficie: number | null
      hectareas: number | null
      primerAnio: number | null
      fechaDeCorte: string
    }
    otbn: { categoria: string | null; porcentajeSuperficie: number | null }
  }
  imagenes: DocumentImagery[]
  fuentes: SourceRef[]
}

/**
 * Deterministic serialization: object keys sorted at every depth so that two
 * runs over equal data produce byte-identical input to the hash. Plain
 * JSON.stringify preserves insertion order, which would make the hash depend on
 * the order fields happened to be assigned.
 */
export function canonicalJson(value: unknown): string {
  const normalize = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(normalize)
    if (input && typeof input === "object") {
      return Object.fromEntries(
        Object.entries(input as Record<string, unknown>)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, entry]) => [key, normalize(entry)]),
      )
    }
    return input
  }

  return JSON.stringify(normalize(value))
}

export function hashPayload(payload: DueDiligencePayload): string {
  return createHash("sha256").update(canonicalJson(payload)).digest("hex")
}

export function buildPayload(input: {
  lote: Lote
  verification: LoteVerification
  productor: { nombre: string; email: string }
  imagenes: DocumentImagery[]
  emitidoEl?: Date
}): DueDiligencePayload {
  const { lote, verification, productor, imagenes } = input
  const reasons = verification.reasons as VerdictReason[]

  return {
    version: PAYLOAD_VERSION,
    emitidoEl: (input.emitidoEl ?? new Date()).toISOString(),
    productor,
    lote: {
      id: lote.id,
      nombre: lote.nombre,
      provincia: lote.provincia,
      renspa: lote.renspa,
      superficieHa: lote.areaHa,
      centroide: { lon: lote.centroidLon, lat: lote.centroidLat },
      geometriaHash: lote.geometryHash,
    },
    verificacion: {
      id: verification.id,
      fecha: verification.createdAt.toISOString(),
      veredicto: verification.verdict ?? "pendiente",
      motivos: reasons.map((codigo) => ({
        codigo,
        texto: REASON_COPY[codigo] ?? codigo,
      })),
      perdidaForestal: {
        porcentajeSuperficie: verification.forestLossPct,
        hectareas: verification.forestLossHa,
        primerAnio: verification.forestLossFirstYear,
        fechaDeCorte: "2020-12-31",
      },
      otbn: {
        categoria: verification.otbnCategory,
        porcentajeSuperficie: verification.otbnPct,
      },
    },
    imagenes: imagenes.map((imagen) => ({ ...imagen })),
    // Copied, not aliased. The payload gets hashed and persisted; sharing a
    // reference with the verification row means a later mutation of either one
    // silently invalidates a hash that was already printed on a document.
    fuentes: verification.sources.map((fuente) => ({ ...fuente })),
  }
}
