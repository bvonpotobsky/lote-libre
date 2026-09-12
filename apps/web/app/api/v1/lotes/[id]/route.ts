import { requireApiKey } from "@/lib/auth/api-keys"
import { fail, ok, withRoute } from "@/lib/http/responses"
import { findLatestVerification, findLote } from "@/lib/lotes/service"

type Context = { params: Promise<{ id: string }> }

export const GET = withRoute(async (request: Request, context: Context) => {
  const identity = await requireApiKey(request, "lotes:read")
  const { id } = await context.params
  const lote = await findLote(identity.userId, id)

  if (!lote) return fail("NOT_FOUND")

  return ok({
    lote,
    verification: await findLatestVerification(identity.userId, id),
  })
})
