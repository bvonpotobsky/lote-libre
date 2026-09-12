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
import { isVerificationCurrent } from "./freshness"

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
  /** Null once the polygon has been edited: a verdict about an older shape is not a verdict about this one. */
  verdict: Verdict | null
  verificationStatus: VerificationStatus | null
  verifiedAt: string | null
  /** True when a verdict exists but was computed from a polygon that has since changed. */
  verificationStale: boolean
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
  verification: LoteVerification | undefined
): LoteSummary {
  // Withheld rather than flagged: a caller that has to remember to check a
  // boolean before trusting `verdict` will eventually forget, and the failure
  // mode is a green light on an unverified polygon.
  const stale =
    verification !== undefined &&
    !isVerificationCurrent(lote.geometryHash, verification.geometryHash)

  return {
    id: lote.id,
    nombre: lote.nombre,
    provincia: lote.provincia,
    areaHa: lote.areaHa,
    centroid: { lon: lote.centroidLon, lat: lote.centroidLat },
    renspa: lote.renspa,
    verdict: stale ? null : (verification?.verdict ?? null),
    verificationStatus: stale ? null : (verification?.status ?? null),
    verifiedAt: verification?.createdAt.toISOString() ?? null,
    verificationStale: stale,
    updatedAt: lote.updatedAt.toISOString(),
  }
}

/**
 * Every column that is derived from the polygon, in one place.
 *
 * Create and update both need the full set, and the schema's own warning is
 * that letting them drift apart leaves the geometry hash pointing at
 * coordinates that no longer produce it. Writing them from a single helper is
 * what keeps that impossible rather than merely unlikely.
 *
 * `provincia` is deliberately NOT here: it is inferred, not derived, and the
 * two callers want different behaviour when the lookup comes back empty.
 */
function derivedColumns(geometry: GeoJSON.Polygon, metrics: LoteMetrics) {
  return {
    geometry,
    geometryHash: metrics.geometryHash,
    areaHa: metrics.areaHa,
    centroidLon: metrics.centroid.lon,
    centroidLat: metrics.centroid.lat,
    bboxMinLon: metrics.bbox.minLon,
    bboxMinLat: metrics.bbox.minLat,
    bboxMaxLon: metrics.bbox.maxLon,
    bboxMaxLat: metrics.bbox.maxLat,
  }
}

/** Latest verification per lote, in one query rather than N. */
async function latestVerifications(
  userId: string,
  loteIds: string[]
): Promise<Map<string, LoteVerification>> {
  if (loteIds.length === 0) return new Map()

  const rows = await db
    .select()
    .from(loteVerifications)
    .where(
      and(
        eq(loteVerifications.userId, userId),
        inArray(loteVerifications.loteId, loteIds)
      )
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
    rows.map((row) => row.id)
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
  userId: string
): Promise<LoteConGeometria[]> {
  const { rows, latest } = await loadLotes(userId)
  return rows.map((row) => ({
    ...toSummary(row, latest.get(row.id)),
    geometry: row.geometry,
  }))
}

export async function findLote(
  userId: string,
  loteId: string
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
  loteId: string
): Promise<LoteVerification | null> {
  const [row] = await db
    .select()
    .from(loteVerifications)
    .where(
      and(
        eq(loteVerifications.userId, userId),
        eq(loteVerifications.loteId, loteId)
      )
    )
    .orderBy(desc(loteVerifications.createdAt))
    .limit(1)

  return row ?? null
}

export async function createLote(
  userId: string,
  input: CreateLoteInput
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
      ...derivedColumns(input.geometry, metrics),
      source: input.source,
    })
    .returning()

  return row!
}

export type UpdateLotePatch = {
  nombre?: string
  renspa?: string | null
  /**
   * Geometry and its metrics travel as one value because the hash has to match
   * the coordinates it was computed from. Passing them separately would make a
   * mismatched pair expressible, and that pair is precisely the bug the schema
   * warns about.
   */
  polygon?: { geometry: GeoJSON.Polygon; metrics: LoteMetrics }
}

export async function updateLote(
  userId: string,
  loteId: string,
  patch: UpdateLotePatch
): Promise<Lote | null> {
  // Re-inferred rather than carried over: an edited lote can cross a provincial
  // border, and `provincia` gates COVERED_PROVINCES in the forest-loss lookup
  // and selects which OTBN layer file is read.
  //
  // Applied only when the lookup actually resolves, so a missing province layer
  // cannot quietly downgrade a known province to "desconocida" — that value
  // would then fail the coverage gate and turn a verifiable lote into an
  // unverifiable one.
  const resolved = patch.polygon
    ? await resolveProvince(patch.polygon.metrics.centroid)
    : null

  const [row] = await db
    .update(lotes)
    .set({
      ...(patch.nombre !== undefined ? { nombre: patch.nombre.trim() } : {}),
      ...(patch.renspa !== undefined
        ? { renspa: patch.renspa?.trim() || null }
        : {}),
      ...(patch.polygon
        ? derivedColumns(patch.polygon.geometry, patch.polygon.metrics)
        : {}),
      ...(resolved ? { provincia: resolved.slug } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(lotes.id, loteId), eq(lotes.userId, userId)))
    .returning()

  return row ?? null
}

export async function deleteLote(
  userId: string,
  loteId: string
): Promise<boolean> {
  const rows = await db
    .delete(lotes)
    .where(and(eq(lotes.id, loteId), eq(lotes.userId, userId)))
    .returning({ id: lotes.id })

  return rows.length > 0
}
