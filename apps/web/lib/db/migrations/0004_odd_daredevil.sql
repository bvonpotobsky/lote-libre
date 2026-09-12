-- Derived artifacts, all of them: every row here points at a PNG drawn by an
-- evalscript that no longer exists. The old NDVI ramp put pure yellow at 0.2,
-- there was no per-pixel cloud mask, every raster was forced to a 512x512
-- square, and the reference window was nailed to October-December 2020 whatever
-- season it actually is. Regenerating costs Copernicus calls and nothing else.
--
-- `evalscript_version` below is what makes this the last hand-written purge:
-- from here on, editing an evalscript means bumping that constant, and the old
-- rows simply stop matching.
--
-- The PNGs live in apps/web/.cache/sentinel (gitignored). New file names carry
-- `-v2-`, so the old files are unreachable rather than stale. Reclaim the disk
-- at leisure with:  rm -rf apps/web/.cache/sentinel
DELETE FROM "satellite_images";--> statement-breakpoint
DROP INDEX "satellite_images_key_idx";--> statement-breakpoint
ALTER TABLE "satellite_images" ADD COLUMN "evalscript_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "satellite_images" ADD COLUMN "pixel_width" integer DEFAULT 512 NOT NULL;--> statement-breakpoint
ALTER TABLE "satellite_images" ADD COLUMN "pixel_height" integer DEFAULT 512 NOT NULL;--> statement-breakpoint
ALTER TABLE "satellite_images" ADD COLUMN "clear_ratio" double precision;--> statement-breakpoint
CREATE UNIQUE INDEX "satellite_images_key_idx" ON "satellite_images" USING btree ("geometry_hash","period","layer","evalscript_version","date_from","date_to");