import { requireUser } from "@/lib/auth/guard"
import { revokeApiKey } from "@/lib/auth/api-keys"
import { fail, ok, withRoute } from "@/lib/http/responses"

type Context = { params: Promise<{ id: string }> }

export const DELETE = withRoute(async (_request: Request, context: Context) => {
  const user = await requireUser()
  const { id } = await context.params

  if (!(await revokeApiKey(user.id, id))) return fail("API_KEY_NOT_FOUND")
  return ok({ revoked: true })
})
