ALTER TABLE "lote_verifications" ADD COLUMN IF NOT EXISTS "geometry_hash" text;

UPDATE "lote_verifications" AS v
SET "geometry_hash" = l."geometry_hash"
FROM "lotes" AS l
WHERE l."id" = v."lote_id" AND v."geometry_hash" IS NULL;

ALTER TABLE "lote_verifications" ALTER COLUMN "geometry_hash" SET NOT NULL;
