import { defineConfig } from "drizzle-kit"

/**
 * Reads process.env directly rather than lib/config/env.ts on purpose: running
 * a migration must not require Copernicus or Xweather credentials to be set.
 */
const DEFAULT_DATABASE_URL = "postgresql://lote:lote@localhost:5432/lote_limpio"

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL },
  casing: "snake_case",
})
