import { requireUser } from "@/lib/auth/guard"
import { fail, ok, withRoute } from "@/lib/http/responses"
import { findLote } from "@/lib/lotes/service"
import { runVerification } from "@/lib/services/verification"

type Context = { params: Promise<{ id: string }> }

/**
 * Answers 200 even when the verification could not be completed.
 *
 * A failed verification is a persisted domain fact that the producer can retry,
 * not a broken request. A 500 would tell the client the problem was on its side
 * and hide the fact that the attempt was recorded.
 */
export const POST = withRoute(async (_request: Request, context: Context) => {
  const user = await requireUser()
  const { id } = await context.params

  const lote = await findLote(user.id, id)
  if (!lote) return fail("NOT_FOUND")

  return ok(await runVerification(user.id, lote))
})
