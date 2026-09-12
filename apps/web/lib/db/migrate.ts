import { resolve } from "node:path"
import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import postgres from "postgres"

/**
 * Standalone migrator.
 *
 * Deliberately does NOT import lib/config/env.ts: migrating must not require
 * Copernicus or Xweather credentials.
 */
const DEFAULT_DATABASE_URL = "postgresql://lote:lote@localhost:5432/lote_limpio"

const databaseUrl = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL

const UNREACHABLE = new Set(["ECONNREFUSED", "CONNECT_TIMEOUT", "ENOTFOUND"])

/**
 * Drizzle wraps driver failures in a DrizzleQueryError, so the network code
 * sits on `cause` rather than on the error itself. Walking the chain is what
 * keeps this working no matter how many layers end up wrapping it.
 */
function isUnreachable(error: unknown): boolean {
  let current: unknown = error

  for (let depth = 0; current != null && depth < 5; depth += 1) {
    const code = (current as { code?: unknown }).code
    if (typeof code === "string" && UNREACHABLE.has(code)) return true
    current = (current as { cause?: unknown }).cause
  }

  return false
}

/** Keeps the password out of logs that people paste into issues. */
function redact(url: string): string {
  return url.replace(/\/\/([^:]+):[^@]*@/, "//$1:***@")
}

// `max: 1` because a migration is a single serial conversation with the server,
// and running DDL over a pool risks statements landing on different backends.
const client = postgres(databaseUrl, { max: 1, onnotice: () => {} })

try {
  await migrate(drizzle(client), {
    migrationsFolder: resolve(process.cwd(), "lib/db/migrations"),
  })
  console.log(`[db] migrations applied -> ${redact(databaseUrl)}`)
  await client.end()
} catch (error) {
  await client.end({ timeout: 1 }).catch(() => {})

  // By far the most likely failure on a fresh clone is a database that is not
  // running yet. An ECONNREFUSED stack trace does not tell anyone that, so it
  // gets translated into the command that actually fixes it.
  if (!isUnreachable(error)) throw error

  console.error(
    [
      "",
      `[db] no se pudo conectar a Postgres en ${redact(databaseUrl)}`,
      "",
      "     Lo más probable es que la base no esté levantada. Arrancala con:",
      "",
      "       pnpm db:up",
      "",
      "     Si el puerto 5432 ya está ocupado en tu máquina, usá otro:",
      "",
      "       DB_PORT=5433 pnpm db:up",
      "",
      "     y ajustá DATABASE_URL en apps/web/.env.local para que coincida.",
      "",
    ].join("\n")
  )
  process.exit(1)
}
