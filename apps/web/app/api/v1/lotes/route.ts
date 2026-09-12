import { z } from "zod"

import { requireApiKey } from "@/lib/auth/api-keys"
import { validatePolygon } from "@/lib/geo/validate"
import { fail, ok, withRoute } from "@/lib/http/responses"
import { createLote, listLotes } from "@/lib/lotes/service"

const createSchema = z.object({
  nombre: z.string().trim().min(1).max(120),
  renspa: z.string().trim().max(40).nullish(),
  geometry: z.unknown(),
})

export const GET = withRoute(async (request: Request) => {
  const identity = await requireApiKey(request, "lotes:read")
  return ok(await listLotes(identity.userId))
})

export const POST = withRoute(async (request: Request) => {
  const identity = await requireApiKey(request, "lotes:create")

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail("INVALID_BODY")
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return fail("INVALID_BODY")

  const geometry = validatePolygon(parsed.data.geometry)
  if (!geometry.ok) return fail(geometry.code)

  const lote = await createLote(identity.userId, {
    nombre: parsed.data.nombre,
    renspa: parsed.data.renspa,
    source: "api",
    geometry: geometry.geometry,
    metrics: geometry.metrics,
  })

  return ok(lote, { status: 201 })
})
