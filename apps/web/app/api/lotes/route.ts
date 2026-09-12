import { z } from "zod"

import { requireUser } from "@/lib/auth/guard"
import { validatePolygon } from "@/lib/geo/validate"
import { fail, ok, withRoute } from "@/lib/http/responses"
import { createLote, listLotes } from "@/lib/lotes/service"

const createLoteSchema = z.object({
  nombre: z.string().min(1).max(120),
  renspa: z.string().max(40).nullish(),
  provincia: z.string().max(60).optional(),
  source: z.enum(["draw", "kml", "geojson"]),
  // Left unknown on purpose: validatePolygon owns geometry rules and produces
  // the specific, actionable error, which a generic Zod shape could not.
  geometry: z.unknown(),
})

export const GET = withRoute(async () => {
  const user = await requireUser()
  return ok(await listLotes(user.id))
})

export const POST = withRoute(async (request: Request) => {
  const user = await requireUser()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail("INVALID_BODY")
  }

  const parsed = createLoteSchema.safeParse(body)
  if (!parsed.success) return fail("INVALID_BODY")

  const geometry = validatePolygon(parsed.data.geometry)
  if (!geometry.ok) return fail(geometry.code)

  const lote = await createLote(user.id, {
    nombre: parsed.data.nombre,
    renspa: parsed.data.renspa,
    provincia: parsed.data.provincia,
    source: parsed.data.source,
    geometry: geometry.geometry,
    metrics: geometry.metrics,
  })

  return ok(lote, { status: 201 })
})
