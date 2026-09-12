import { z } from "zod"

import { requireUser } from "@/lib/auth/guard"
import { fail, ok, withRoute } from "@/lib/http/responses"
import {
  deleteLote,
  findLatestVerification,
  findLote,
  updateLote,
} from "@/lib/lotes/service"

/** Next 16: route params arrive as a Promise. The sync form was removed. */
type Context = { params: Promise<{ id: string }> }

const patchLoteSchema = z
  .object({
    nombre: z.string().min(1).max(120).optional(),
    renspa: z.string().max(40).nullish(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    error: "nothing to update",
  })

export const GET = withRoute(async (_request: Request, context: Context) => {
  const user = await requireUser()
  const { id } = await context.params

  const lote = await findLote(user.id, id)
  // 404 rather than 403 for someone else's lote: a 403 would confirm the id
  // exists, which is an enumeration oracle.
  if (!lote) return fail("NOT_FOUND")

  return ok({
    lote,
    verification: await findLatestVerification(user.id, id),
  })
})

export const PATCH = withRoute(async (request: Request, context: Context) => {
  const user = await requireUser()
  const { id } = await context.params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail("INVALID_BODY")
  }

  const parsed = patchLoteSchema.safeParse(body)
  if (!parsed.success) return fail("INVALID_BODY")

  const lote = await updateLote(user.id, id, parsed.data)
  if (!lote) return fail("NOT_FOUND")

  return ok(lote)
})

export const DELETE = withRoute(async (_request: Request, context: Context) => {
  const user = await requireUser()
  const { id } = await context.params

  if (!(await deleteLote(user.id, id))) return fail("NOT_FOUND")
  return new Response(null, { status: 204 })
})
