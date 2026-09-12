import { mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"

import { env } from "@/lib/config/env"
import * as schema from "./schema"

/**
 * SQLite was chosen over Postgres deliberately: every geometric operation in
 * this app runs in Turf.js against GeoJSON layers on disk, so PostGIS would
 * contribute nothing but setup cost. See README for the migration path.
 */
function createConnection() {
  const file = resolve(process.cwd(), env.databaseFile)
  mkdirSync(dirname(file), { recursive: true })

  const sqlite = new Database(file)
  sqlite.pragma("journal_mode = WAL")
  // SQLite ships with foreign key enforcement OFF. Every `onDelete: "cascade"`
  // in the schema is inert without this line.
  sqlite.pragma("foreign_keys = ON")

  return drizzle(sqlite, { schema })
}

type Connection = ReturnType<typeof createConnection>

// Next's dev server re-evaluates modules on hot reload; without this the
// process accumulates open SQLite handles until it runs out of descriptors.
const globalForDb = globalThis as unknown as { __loteLimpioDb?: Connection }

export const db: Connection = globalForDb.__loteLimpioDb ?? createConnection()

if (process.env.NODE_ENV !== "production") globalForDb.__loteLimpioDb = db

export { schema }
