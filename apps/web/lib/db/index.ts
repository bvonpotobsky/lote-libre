import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { env } from "@/lib/config/env"
import * as schema from "./schema"

/**
 * Postgres over postgres.js.
 *
 * Geometry still never touches the database: every geometric operation runs in
 * Turf.js against GeoJSON layers on disk, so PostGIS would contribute nothing
 * but setup cost. Postgres is here because the app deploys to a serverless
 * runtime, where the filesystem is ephemeral and a SQLite file would not
 * survive between invocations.
 *
 * One driver for both environments on purpose: the same DATABASE_URL points at
 * the Docker container in development and at the managed pooler in production,
 * so there is no per-environment branch to get wrong.
 *
 * The `foreign_keys` pragma that used to live here is gone because Postgres
 * enforces foreign keys natively. Every `onDelete: "cascade"` in the schema is
 * live without any opt-in.
 */
function createConnection() {
  const client = postgres(env.databaseUrl, {
    // Poolers in transaction mode (Neon, Supabase, pgbouncer) hand a different
    // backend connection to each statement, so a prepared statement is never
    // found where it was created. Disabling prefetch is what keeps the same
    // code working against both the container and the pooler.
    prepare: false,
    // A serverless instance handles one request at a time and is frozen right
    // after; a pool per instance would multiply idle connections by the number
    // of live instances and exhaust the server's limit.
    max: process.env.VERCEL ? 1 : 10,
  })

  return drizzle(client, { schema })
}

type Connection = ReturnType<typeof createConnection>

// Next's dev server re-evaluates modules on hot reload; without this the
// process accumulates open connection pools until Postgres refuses new ones.
const globalForDb = globalThis as unknown as { __loteLimpioDb?: Connection }

export const db: Connection = globalForDb.__loteLimpioDb ?? createConnection()

if (process.env.NODE_ENV !== "production") globalForDb.__loteLimpioDb = db

export { schema }
