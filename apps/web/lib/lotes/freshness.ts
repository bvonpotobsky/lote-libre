/**
 * Whether a recorded verdict still describes the lote's current polygon.
 *
 * A verification stores the geometry hash it was computed from. Once geometry
 * became editable, that stamp is the only thing standing between the producer
 * and a verdict that looks authoritative while describing a shape that no
 * longer exists — which, in a document destined for an EUDR declaration, is not
 * a stale cache but a false claim.
 *
 * Derived rather than stored as a flag, so it cannot drift out of sync with the
 * thing it describes. A plain comparison, because the column is NOT NULL and
 * the rows that predate it were backfilled: there is no third state to reason
 * about, which is the point — a nullable stamp would have needed a rule, and
 * both available rules are wrong (treating null as valid lies about an edited
 * lote; treating it as stale re-verifies polygons nobody touched).
 */
export function isVerificationCurrent(
  loteGeometryHash: string,
  verificationGeometryHash: string
): boolean {
  return verificationGeometryHash === loteGeometryHash
}
