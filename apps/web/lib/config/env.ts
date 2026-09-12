import { z } from "zod"

/**
 * Typed, fail-fast configuration.
 *
 * Every value here is server-side only. None of these names carry the
 * NEXT_PUBLIC_ prefix, so the bundler never inlines them into a client bundle:
 * a browser build sees `undefined`, never the secret. That guarantee comes from
 * the bundler, not from discipline.
 *
 * Parsing happens once, at module load. A missing credential stops the process
 * at boot with a message that says what is missing and where to get it, instead
 * of surfacing as an opaque 400 from a third-party API mid-demo.
 */

const DEFAULT_DATABASE_URL = "postgresql://lote:lote@localhost:5432/lote_limpio"
const DEFAULT_AUTH_URL = "http://localhost:3000"

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1)
    .refine((value) => /^postgres(ql)?:\/\//.test(value), {
      error: "must be a Postgres connection URL (postgresql://...)",
    })
    .default(DEFAULT_DATABASE_URL),
  BETTER_AUTH_SECRET: z.string().min(32, {
    error: "must be at least 32 characters",
  }),
  BETTER_AUTH_URL: z.url().default(DEFAULT_AUTH_URL),
  SH_CLIENT_ID: z.string().min(1),
  SH_CLIENT_SECRET: z.string().min(1),
  XWEATHER_CLIENT_ID: z.string().min(1),
  XWEATHER_CLIENT_SECRET: z.string().min(1),
})

/** Where a human actually obtains each credential, printed on failure. */
const PROVENANCE: Readonly<Record<string, string>> = {
  DATABASE_URL: "start the local database with: pnpm db:up",
  BETTER_AUTH_SECRET: "generate one locally: openssl rand -base64 32",
  SH_CLIENT_ID: "dataspace.copernicus.eu -> Dashboard -> OAuth clients",
  SH_CLIENT_SECRET: "dataspace.copernicus.eu -> Dashboard -> OAuth clients",
  XWEATHER_CLIENT_ID: "xweather.com -> account -> Apps",
  XWEATHER_CLIENT_SECRET: "xweather.com -> account -> Apps",
}

export type Env = {
  /** Postgres connection URL. Same shape locally (Docker) and in production. */
  databaseUrl: string
  auth: { secret: string; url: string }
  copernicus: { clientId: string; clientSecret: string }
  xweather: { clientId: string; clientSecret: string }
}

function describeFailure(error: z.ZodError): string {
  const lines = error.issues.map((issue) => {
    const name = String(issue.path[0] ?? "(root)")
    const provenance = PROVENANCE[name]
    const suffix = provenance ? `\n      get it at: ${provenance}` : ""
    return `  - ${name}: ${issue.message}${suffix}`
  })

  return [
    "Invalid environment configuration.",
    "Fix apps/web/.env.local (see .env.example for the full list):",
    "",
    ...lines,
    "",
  ].join("\n")
}

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) throw new Error(describeFailure(parsed.error))

  const raw = parsed.data
  return {
    databaseUrl: raw.DATABASE_URL,
    auth: { secret: raw.BETTER_AUTH_SECRET, url: raw.BETTER_AUTH_URL },
    copernicus: {
      clientId: raw.SH_CLIENT_ID,
      clientSecret: raw.SH_CLIENT_SECRET,
    },
    xweather: {
      clientId: raw.XWEATHER_CLIENT_ID,
      clientSecret: raw.XWEATHER_CLIENT_SECRET,
    },
  }
}

let cached: Env | null = null

/**
 * Validates the environment and caches the result.
 *
 * Called explicitly from instrumentation.ts so a misconfigured deployment still
 * dies at boot with a useful message. Everywhere else it resolves lazily, which
 * keeps a unit test of a pure helper from demanding Copernicus credentials just
 * because it lives in a module that also talks to Copernicus.
 */
export function assertEnvironment(): Env {
  cached ??= loadEnv()
  return cached
}

/** Lazily validated. Reading any property triggers `assertEnvironment()`. */
export const env: Env = new Proxy({} as Env, {
  get: (_target, property) => assertEnvironment()[property as keyof Env],
})
