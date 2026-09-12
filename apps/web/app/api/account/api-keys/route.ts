import { z } from "zod"

import { requireUser } from "@/lib/auth/guard"
import { createApiKey, listApiKeys } from "@/lib/auth/api-keys"
import { fail, ok, withRoute } from "@/lib/http/responses"

const scope = z.enum(["lotes:read", "lotes:create"])
const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  scopes: z.array(scope).min(1).max(2),
  expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
})

export const GET = withRoute(async () => {
  const user = await requireUser()
  return ok(await listApiKeys(user.id))
})

export const POST = withRoute(async (request: Request) => {
  const user = await requireUser()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail("INVALID_BODY")
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return fail("INVALID_BODY")

  const expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null
  if (expiresAt && expiresAt <= new Date()) return fail("INVALID_BODY")

  return ok(
    await createApiKey(user.id, {
      name: parsed.data.name,
      scopes: parsed.data.scopes,
      expiresAt,
    }),
    { status: 201 },
  )
})
