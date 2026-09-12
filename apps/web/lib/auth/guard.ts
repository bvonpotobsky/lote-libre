import { headers } from "next/headers"

import { ApiError } from "@/lib/http/responses"
import { auth } from "./index"

export type CurrentUser = { id: string; email: string; name: string }

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const result = await auth.api.getSession({ headers: await headers() })
  if (!result) return null

  const { id, email, name } = result.user
  return { id, email, name }
}

/**
 * Use in route handlers. Throws an ApiError that `withRoute` turns into a
 * typed 401, so no handler has to remember to build that response itself.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) throw new ApiError("UNAUTHORIZED")
  return user
}
