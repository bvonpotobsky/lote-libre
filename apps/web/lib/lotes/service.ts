import { and, desc, eq, inArray } from "drizzle-orm"
import { nanoid } from "nanoid"

import { db } from "@/lib/db"
import {
  loteVerifications,
  lotes,
  type Lote,
  type LoteSource,
  type LoteVerification,
  type Verdict,
  type VerificationStatus,
} from "@/lib/db/schema"
import { resolveProvince } from "@/lib/geo/provinces"
import type { LoteMetrics } from "@/lib/geo/metrics"

/**
 * Every function here takes `userId` as its first argument and every query
 * filters on it. Ownership is enforced in the data access layer rather than in
 * the route handlers, so no endpoint can forget it — a 404 for someone else's
 * lote is a property of the query, not of a check someone remembered to write.
 */

export type LoteSummary = {
  id: string
  nombre: string
  provincia: string
  areaHa: number
  centroid: { lon: number; lat: number }
  renspa: string | null
  verdict: Verdict | null
  verificationStatus: VerificationStatus | null
  verifiedAt: string | null
  updatedAt: string
}

export type CreateLoteInput = {
  nombre: string
  renspa?: string | null
  provincia?: string
  source: LoteSource
  geometry: GeoJSON.Polygon
  metrics: LoteMetrics
}

function toSummary(
  lote: Lote,
  verification: LoteVerification | undefined,
): LoteSummary {
  return {
    id: lote.id,
    nombre: lote.nombre,
    provincia: lote.provincia,
    areaHa: lote.areaHa,
    centroid: { lon: lote.centroidLon, lat: lote.centroidLat },
    renspa: lote.renspa,
    verdict: verification?.verdict ?? null,
    verificationStatus: verification?.status ?? null,
    verifiedAt: verification?.createdAt.toISOString() ?? null,
    updatedAt: lote.updatedAt.toISOString(),
  }
}

/** Latest verification per lote, in one query rather than N. */
async function latestVerifications(
  userId: string,
  loteIds: string[],
): Promise<Map<string, LoteVerification>> {
  if (loteIds.length === 0) return new Map()

  const rows = await db
    .select()
    .from(loteVerifications)
    .where(
      and(
        eq(loteVerifications.userId, userId),
        inArray(loteVerifications.loteId, loteIds),
      ),
    )
    .orderBy(desc(loteVerifications.createdAt))

  const latest = new Map<string, LoteVerification>()
  for (const row of rows) {
    if (!latest.has(row.loteId)) latest.set(row.loteId, row)
  }
  return latest
}

/** The one read both list shapes below are built from. */
async function loadLotes(userId: string) {
  const rows = await db
    .select()
    .from(lotes)
    .where(eq(lotes.userId, userId))
    .orderBy(desc(lotes.updatedAt))

  const latest = await latestVerifications(
    userId,
    rows.map((row) => row.id),
  )

  return { rows, latest }
}

export async function listLotes(userId: string): Promise<LoteSummary[]> {
  const { rows, latest } = await loadLotes(userId)
  return rows.map((row) => toSummary(row, latest.get(row.id)))
}

/**
 * The summary plus the geometry, for screens that draw the lotes on a map.
 *
 * `LoteSummary` omits `geometry` deliberately — it is the heaviest column in the
 * row and the text list has no use for it. A map does, so it asks for it here
 * rather than widening the shape every other caller pays for.
 */
export type LoteConGeometria = LoteSummary & { geometry: GeoJSON.Polygon }

export async function listLotesConGeometria(
  userId: string,
): Promise<LoteConGeometria[]> {
  const { rows, latest } = await loadLotes(userId)
  return rows.map((row) => ({
    ...toSummary(row, latest.get(row.id)),
    geometry: row.geometry,
  }))
}

export async function findLote(
  userId: string,
  loteId: string,
): Promise<Lote | null> {
  const [row] = await db
    .select()
    .from(lotes)
    .where(and(eq(lotes.id, loteId), eq(lotes.userId, userId)))
    .limit(1)

  return row ?? null
}

export async function findLatestVerification(
  userId: string,
  loteId: string,
): Promise<LoteVerification | null> {
  const [row] = await db
    .select()
    .from(loteVerifications)
    .where(
      and(
        eq(loteVerifications.userId, userId),
        eq(loteVerifications.loteId, loteId),
      ),
    )
    .orderBy(desc(loteVerifications.createdAt))
    .limit(1)

  return row ?? null
}

export async function createLote(
  userId: string,
  input: CreateLoteInput,
): Promise<Lote> {
  const { metrics } = input
  const resolved = await resolveProvince(metrics.centroid)

  const [row] = await db
    .insert(lotes)
    .values({
      id: nanoid(12),
      userId,
      nombre: input.nombre.trim(),
      provincia: resolved?.slug ?? input.provincia?.trim() ?? "desconocida",
      renspa: input.renspa?.trim() || null,
      geometry: input.geometry,
      geometryHash: metrics.geometryHash,
      areaHa: metrics.areaHa,
      centroidLon: metrics.centroid.lon,
      centroidLat: metrics.centroid.lat,
      bboxMinLon: metrics.bbox.minLon,
      bboxMinLat: metrics.bbox.minLat,
      bboxMaxLon: metrics.bbox.maxLon,
      bboxMaxLat: metrics.bbox.maxLat,
      source: input.source,
    })
    .returning()

  return row!
}

export async function updateLote(
  userId: string,
  loteId: string,
  patch: { nombre?: string; renspa?: string | null },
): Promise<Lote | null> {
  const [row] = await db
    .update(lotes)
    .set({
      ...(patch.nombre !== undefined ? { nombre: patch.nombre.trim() } : {}),
      ...(patch.renspa !== undefined
        ? { renspa: patch.renspa?.trim() || null }
        : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(lotes.id, loteId), eq(lotes.userId, userId)))
    .returning()

  return row ?? null
}

export async function deleteLote(
  userId: string,
  loteId: string,
): Promise<boolean> {
  const rows = await db
    .delete(lotes)
    .where(and(eq(lotes.id, loteId), eq(lotes.userId, userId)))
    .returning({ id: lotes.id })

  return rows.length > 0
}
