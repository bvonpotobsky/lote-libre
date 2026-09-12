import { relations, sql } from "drizzle-orm"
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"

/* -------------------------------------------------------------------------- */
/* Domain vocabulary                                                          */
/* -------------------------------------------------------------------------- */

/** Traffic-light verdict. Green requires positive evidence from BOTH layers. */
export type Verdict = "verde" | "amarillo" | "rojo"

/**
 * OTBN conservation category (Ley 26.331), normalized from the official
 * `cat_cons` Roman numerals: I -> rojo, II -> amarillo, III -> verde.
 *
 * `sin_cobertura` means the lote falls in a province whose OTBN layer we do not
 * ship. It is not "no restriction" — it is "we do not know", and the verdict
 * rules treat it accordingly.
 */
export type OtbnCategory = "rojo" | "amarillo" | "verde" | "sin_cobertura"

export type VerificationStatus = "pending" | "ready" | "failed"

export type LoteSource = "draw" | "kml" | "geojson"

/** One consulted layer, recorded so the PDF can cite what it was based on. */
export type SourceRef = {
  id: string
  label: string
  vintage: string
  consultedAt: string
  url?: string
  caveat?: string
}

/* -------------------------------------------------------------------------- */
/* Better Auth tables                                                          */
/*                                                                             */
/* Shape dictated by Better Auth. Note `verification` here is Better Auth's    */
/* own table for email/reset tokens — it has nothing to do with the EUDR       */
/* verification of a lote, which lives in `lote_verifications` below.          */
/* -------------------------------------------------------------------------- */

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
})

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
)

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
)

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
)

/* -------------------------------------------------------------------------- */
/* Lotes                                                                       */
/* -------------------------------------------------------------------------- */

export const lotes = sqliteTable(
  "lotes",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    nombre: text("nombre").notNull(),
    /** Province slug, e.g. "santiago-del-estero". Inferred from the centroid. */
    provincia: text("provincia").notNull(),
    /** Free text. Travels to the PDF and nowhere else — no SENASA integration. */
    renspa: text("renspa"),

    /** Canonical GeoJSON Polygon, WGS84 (EPSG:4326), lon/lat order. */
    geometry: text("geometry", { mode: "json" })
      .notNull()
      .$type<GeoJSON.Polygon>(),
    /** SHA-256 of the canonical geometry. Content-addresses the image cache. */
    geometryHash: text("geometry_hash").notNull(),

    areaHa: real("area_ha").notNull(),

    /* Derived and denormalized: Xweather queries by point, the list view must
       not run Turf per row, and the bbox rejects a province layer before it is
       ever read off disk. */
    centroidLon: real("centroid_lon").notNull(),
    centroidLat: real("centroid_lat").notNull(),
    bboxMinLon: real("bbox_min_lon").notNull(),
    bboxMinLat: real("bbox_min_lat").notNull(),
    bboxMaxLon: real("bbox_max_lon").notNull(),
    bboxMaxLat: real("bbox_max_lat").notNull(),

    source: text("source").notNull().$type<LoteSource>(),

    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index("lotes_user_id_idx").on(table.userId),
    index("lotes_geometry_hash_idx").on(table.geometryHash),
  ],
)

/* -------------------------------------------------------------------------- */
/* Verifications                                                               */
/* -------------------------------------------------------------------------- */

export const loteVerifications = sqliteTable(
  "lote_verifications",
  {
    id: text("id").primaryKey(),
    loteId: text("lote_id")
      .notNull()
      .references(() => lotes.id, { onDelete: "cascade" }),
    /**
     * Denormalized on purpose. Every read of this table can then carry
     * `where(eq(userId, session.user.id))` without a join, so ownership
     * isolation stops depending on someone remembering to write the join.
     */
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    status: text("status").notNull().$type<VerificationStatus>(),
    verdict: text("verdict").$type<Verdict>(),

    /** Share of the lote's area intersecting post-2020 loss, 0-100. */
    forestLossPct: real("forest_loss_pct"),
    forestLossHa: real("forest_loss_ha"),
    /** Earliest loss year found after the 2020-12-31 cutoff. */
    forestLossFirstYear: integer("forest_loss_first_year"),

    otbnCategory: text("otbn_category").$type<OtbnCategory>(),
    /** Share of the lote's area in the dominant OTBN category, 0-100. */
    otbnPct: real("otbn_pct"),

    sources: text("sources", { mode: "json" })
      .notNull()
      .$type<SourceRef[]>()
      .default(sql`'[]'`),

    /** Machine-readable evidence behind the verdict; rendered in the UI and PDF. */
    reasons: text("reasons", { mode: "json" })
      .notNull()
      .$type<string[]>()
      .default(sql`'[]'`),

    /** Set when status is "failed". Drives the retry copy shown to the user. */
    failureCode: text("failure_code"),

    /**
     * SHA-256 over the canonical document payload — NOT over the PDF bytes.
     * PDF bytes embed a creation timestamp, so their hash is not reproducible
     * and therefore not verifiable by anyone downstream.
     *
     * Written the first time the document is generated, alongside the exact
     * payload it was computed from. Storing the payload is what makes the hash
     * checkable later: anyone can re-serialize it and re-hash.
     */
    documentHash: text("document_hash"),
    documentPayload: text("document_payload", { mode: "json" }),

    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index("lote_verifications_lote_idx").on(table.loteId, table.createdAt),
    index("lote_verifications_user_idx").on(table.userId),
  ],
)

/* -------------------------------------------------------------------------- */
/* Satellite image cache                                                       */
/*                                                                             */
/* Content-addressed by geometry hash, deliberately NOT scoped to a user: two  */
/* identical polygons share a cached PNG. This is safe because the table is    */
/* never queried by user — the route that serves a PNG authorizes the LOTE     */
/* first and only then reads the file.                                         */
/* -------------------------------------------------------------------------- */

export const satelliteImages = sqliteTable(
  "satellite_images",
  {
    id: text("id").primaryKey(),
    geometryHash: text("geometry_hash").notNull(),
    /** "reference" = 2020 baseline, "current" = most recent clear window. */
    period: text("period").notNull().$type<"reference" | "current">(),
    layer: text("layer").notNull().$type<"trueColor" | "ndvi">(),

    /** The window actually requested from Copernicus, YYYY-MM-DD. */
    dateFrom: text("date_from").notNull(),
    dateTo: text("date_to").notNull(),

    /** Whether the window came from Xweather or from the wide-range fallback. */
    windowSource: text("window_source")
      .notNull()
      .$type<"xweather" | "fallback">(),
    /** Mean daily cloud cover over the chosen window, 0-100. Null on fallback. */
    cloudAvgPct: real("cloud_avg_pct"),

    filePath: text("file_path").notNull(),
    bytes: integer("bytes").notNull(),
    /** Sentinel answers 200 with a transparent PNG when nothing clears the
        cloud filter. That is a result, not an error — we record it. */
    isEmpty: integer("is_empty", { mode: "boolean" }).notNull().default(false),

    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex("satellite_images_key_idx").on(
      table.geometryHash,
      table.period,
      table.layer,
      table.dateFrom,
      table.dateTo,
    ),
  ],
)

/* -------------------------------------------------------------------------- */
/* Relations                                                                   */
/* -------------------------------------------------------------------------- */

export const userRelations = relations(user, ({ many }) => ({
  lotes: many(lotes),
}))

export const lotesRelations = relations(lotes, ({ one, many }) => ({
  owner: one(user, { fields: [lotes.userId], references: [user.id] }),
  verifications: many(loteVerifications),
}))

export const loteVerificationsRelations = relations(
  loteVerifications,
  ({ one }) => ({
    lote: one(lotes, {
      fields: [loteVerifications.loteId],
      references: [lotes.id],
    }),
  }),
)

export type Lote = typeof lotes.$inferSelect
export type NewLote = typeof lotes.$inferInsert
export type LoteVerification = typeof loteVerifications.$inferSelect
export type NewLoteVerification = typeof loteVerifications.$inferInsert
export type SatelliteImage = typeof satelliteImages.$inferSelect
export type NewSatelliteImage = typeof satelliteImages.$inferInsert
