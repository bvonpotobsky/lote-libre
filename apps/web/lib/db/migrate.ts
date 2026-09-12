import { mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import { migrate } from "drizzle-orm/better-sqlite3/migrator"

/**
 * Standalone migrator.
 *
 * Deliberately does NOT import lib/config/env.ts: migrating must not require
 * Copernicus or Xweather credentials. It also creates the database directory,
 * which drizzle-kit does not — without that, `db:migrate` fails on a fresh
 * clone, which is exactly the path the README promises works in one command.
 */
const databaseFile = resolve(
  process.cwd(),
  (process.env.DATABASE_URL ?? "file:./.data/lote-limpio.db").replace(
    /^file:/,
    "",
  ),
)

mkdirSync(dirname(databaseFile), { recursive: true })

const sqlite = new Database(databaseFile)
sqlite.pragma("journal_mode = WAL")
sqlite.pragma("foreign_keys = ON")

migrate(drizzle(sqlite), {
  migrationsFolder: resolve(process.cwd(), "lib/db/migrations"),
})

sqlite.close()

console.log(`[db] migrations applied -> ${databaseFile}`)
