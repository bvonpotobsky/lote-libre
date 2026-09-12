import { requireUser } from "@/lib/auth/guard"
import { fail, ok, withRoute } from "@/lib/http/responses"
import { findLote } from "@/lib/lotes/service"
import {
  getOrCreateImage,
  type ImageryMeta,
  type ImagePeriod,
} from "@/lib/services/imagery"

type Context = { params: Promise<{ id: string }> }

/**
 * Each period reports independently. A producer whose 2020 baseline came back
 * but whose recent pass did not should still see the baseline and be told what
 * is missing, rather than getting one opaque failure for the whole comparison.
 */
type Slot =
  | ({ status: "ready"; url: string } & ImageryMeta)
  | { status: "unavailable"; message: string; hint: string }

const UNAVAILABLE: Omit<Extract<Slot, { status: "unavailable" }>, "status"> = {
  message: "Copernicus no devolvió esta imagen.",
  hint: "El veredicto no depende de las imágenes. Probá de nuevo en un momento.",
}

async function buildSlot(
  loteId: string,
  geometry: GeoJSON.Polygon,
  geometryHash: string,
  centroid: { lon: number; lat: number },
  period: ImagePeriod,
): Promise<Slot> {
  try {
    const { meta } = await getOrCreateImage(
      geometry,
      geometryHash,
      centroid,
      period,
    )
    return {
      status: "ready",
      url: `/api/lotes/${loteId}/imagery/${period}`,
      ...meta,
    }
  } catch (error) {
    console.error(`[imagery] ${period} failed for lote ${loteId}`, error)
    return { status: "unavailable", ...UNAVAILABLE }
  }
}

export const GET = withRoute(async (_request: Request, context: Context) => {
  const user = await requireUser()
  const { id } = await context.params

  const lote = await findLote(user.id, id)
  if (!lote) return fail("NOT_FOUND")

  const centroid = { lon: lote.centroidLon, lat: lote.centroidLat }

  const [reference, current] = await Promise.all([
    buildSlot(lote.id, lote.geometry, lote.geometryHash, centroid, "reference"),
    buildSlot(lote.id, lote.geometry, lote.geometryHash, centroid, "current"),
  ])

  if (reference.status === "unavailable" && current.status === "unavailable") {
    return fail("SENTINEL_UNAVAILABLE")
  }

  return ok({ reference, current })
})
