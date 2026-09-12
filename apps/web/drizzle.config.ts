import { defineConfig } from "drizzle-kit"

/**
 * Reads process.env directly rather than lib/config/env.ts on purpose: running
 * a migration must not require Copernicus or Xweather credentials to be set.
 */
const databaseFile = (
  process.env.DATABASE_URL ?? "file:./.data/lote-limpio.db"
).replace(/^file:/, "")

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "sqlite",
  dbCredentials: { url: databaseFile },
  casing: "snake_case",
})
