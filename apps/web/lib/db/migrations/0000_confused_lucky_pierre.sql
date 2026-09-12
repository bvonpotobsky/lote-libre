CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lote_verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"lote_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" text NOT NULL,
	"verdict" text,
	"forest_loss_pct" double precision,
	"forest_loss_ha" double precision,
	"forest_loss_first_year" integer,
	"otbn_category" text,
	"otbn_pct" double precision,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"failure_code" text,
	"document_hash" text,
	"document_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lotes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"nombre" text NOT NULL,
	"provincia" text NOT NULL,
	"renspa" text,
	"geometry" jsonb NOT NULL,
	"geometry_hash" text NOT NULL,
	"area_ha" double precision NOT NULL,
	"centroid_lon" double precision NOT NULL,
	"centroid_lat" double precision NOT NULL,
	"bbox_min_lon" double precision NOT NULL,
	"bbox_min_lat" double precision NOT NULL,
	"bbox_max_lon" double precision NOT NULL,
	"bbox_max_lat" double precision NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "satellite_images" (
	"id" text PRIMARY KEY NOT NULL,
	"geometry_hash" text NOT NULL,
	"period" text NOT NULL,
	"layer" text NOT NULL,
	"date_from" text NOT NULL,
	"date_to" text NOT NULL,
	"window_source" text NOT NULL,
	"cloud_avg_pct" double precision,
	"file_path" text NOT NULL,
	"bytes" integer NOT NULL,
	"is_empty" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lote_verifications" ADD CONSTRAINT "lote_verifications_lote_id_lotes_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."lotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lote_verifications" ADD CONSTRAINT "lote_verifications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "lote_verifications_lote_idx" ON "lote_verifications" USING btree ("lote_id","created_at");--> statement-breakpoint
CREATE INDEX "lote_verifications_user_idx" ON "lote_verifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "lotes_user_id_idx" ON "lotes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "lotes_geometry_hash_idx" ON "lotes" USING btree ("geometry_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "satellite_images_key_idx" ON "satellite_images" USING btree ("geometry_hash","period","layer","date_from","date_to");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");