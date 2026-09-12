-- Backfill written by hand: drizzle-kit emits only the SET NOT NULL below,
-- which aborts on any existing row.
--
-- Stamping old verdicts with their lote's current hash is correct exactly once,
-- and this is that moment: until the migration that added this column, geometry
-- was write-once, so a stored verdict provably describes the polygon still on
-- file. Run this before shipping the edit feature and it stays true.
UPDATE "lote_verifications" AS v
SET "geometry_hash" = l."geometry_hash"
FROM "lotes" AS l
WHERE l."id" = v."lote_id" AND v."geometry_hash" IS NULL;
--> statement-breakpoint
ALTER TABLE "lote_verifications" ALTER COLUMN "geometry_hash" SET NOT NULL;
