import { requireUser } from "@/lib/auth/guard"
import { verificarProductor } from "@/lib/services/producer-verification"
import { fail, ok, withRoute } from "@/lib/http/responses"

export const GET = withRoute(async () => {
  const user = await requireUser()
  if (!user.cuit) return fail("MISSING_CUIT")
  return ok(verificarProductor(user.cuit))
})
