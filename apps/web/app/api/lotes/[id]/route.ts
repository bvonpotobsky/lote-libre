import { z } from "zod"

import { requireUser } from "@/lib/auth/guard"
import { validatePolygon } from "@/lib/geo/validate"
import { fail, ok, withRoute } from "@/lib/http/responses"
import {
  deleteLote,
  findLatestVerification,
  findLote,
  updateLote,
  type UpdateLotePatch,
} from "@/lib/lotes/service"

/** Next 16: route params arrive as a Promise. The sync form was removed. */
type Context = { params: Promise<{ id: string }> }

const patchLoteSchema = z
  .object({
    nombre: z.string().min(1).max(120).optional(),
    renspa: z.string().max(40).nullish(),
    // Left unknown on purpose, exactly as in POST: validatePolygon owns the
    // geometry rules and produces the specific, actionable error that a generic
    // Zod shape could not.
    geometry: z.unknown(),
  })
  // Checked field by field rather than by counting keys: `z.unknown()` accepts
  // a missing key, so a key count would call an empty body an update.
  .refine(
    (value) =>
      value.nombre !== undefined ||
      value.renspa !== undefined ||
      value.geometry !== undefined,
    { error: "nothing to update" }
  )

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

  // Same contract as POST: the geometry is validated and canonicalized here and
  // the service is handed the resulting metrics rather than deriving its own,
  // so creating and editing can never disagree about what a polygon measures.
  let polygon: UpdateLotePatch["polygon"]
  if (parsed.data.geometry !== undefined) {
    const validated = validatePolygon(parsed.data.geometry)
    if (!validated.ok) return fail(validated.code)
    polygon = { geometry: validated.geometry, metrics: validated.metrics }
  }

  const lote = await updateLote(user.id, id, {
    nombre: parsed.data.nombre,
    renspa: parsed.data.renspa,
    polygon,
  })
  if (!lote) return fail("NOT_FOUND")

  return ok(lote)
})

export const DELETE = withRoute(async (_request: Request, context: Context) => {
  const user = await requireUser()
  const { id } = await context.params

  if (!(await deleteLote(user.id, id))) return fail("NOT_FOUND")
  return new Response(null, { status: 204 })
})
