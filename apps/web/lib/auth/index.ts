import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { nextCookies } from "better-auth/next-js"

import { env } from "@/lib/config/env"
import { db } from "@/lib/db"
import { account, session, user, verification } from "@/lib/db/schema"

export const auth = betterAuth({
  secret: env.auth.secret,
  baseURL: env.auth.url,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // No mail provider in scope, so verification would lock every new account
    // out of an app whose whole point is being usable in one sitting.
    requireEmailVerification: false,
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  plugins: [nextCookies()],
})

export type AuthSession = typeof auth.$Infer.Session
