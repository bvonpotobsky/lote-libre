import { eq } from "drizzle-orm"

import { requireUser } from "@/lib/auth/guard"
import { db, schema } from "@/lib/db"
import { esCuitValido, formatearCuit, normalizarCuit } from "@/lib/profile/cuit"
import { fail, ok, withRoute } from "@/lib/http/responses"

export const GET = withRoute(async () => {
  const currentUser = await requireUser()
  return ok({ cuit: currentUser.cuit ? formatearCuit(currentUser.cuit) : null })
})

export const PATCH = withRoute(async (request: Request) => {
  const currentUser = await requireUser()
  const body = (await request.json().catch(() => null)) as { cuit?: unknown } | null
  const cuit = typeof body?.cuit === "string" ? normalizarCuit(body.cuit) : ""
  if (!esCuitValido(cuit)) return fail("INVALID_CUIT")

  await db.update(schema.user).set({ cuit }).where(eq(schema.user.id, currentUser.id))
  return ok({ cuit: formatearCuit(cuit) })
})
