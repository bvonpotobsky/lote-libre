import { readFile } from "node:fs/promises"

import { requireUser } from "@/lib/auth/guard"
import { fail, withRoute } from "@/lib/http/responses"
import { findLote } from "@/lib/lotes/service"
import { getOrCreateImage, type ImagePeriod } from "@/lib/services/imagery"

type Context = { params: Promise<{ id: string; period: string }> }

const PERIODS = new Set<ImagePeriod>(["reference", "current"])

const isPeriod = (value: string): value is ImagePeriod =>
  PERIODS.has(value as ImagePeriod)

/**
 * The image cache is keyed by geometry, not by owner. Authorization happens
 * here, on the lote, before a single byte is read off disk.
 */
export const GET = withRoute(async (_request: Request, context: Context) => {
  const user = await requireUser()
  const { id, period } = await context.params

  if (!isPeriod(period)) return fail("NOT_FOUND")

  const lote = await findLote(user.id, id)
  if (!lote) return fail("NOT_FOUND")

  try {
    const { meta, filePath } = await getOrCreateImage(
      lote.geometry,
      lote.geometryHash,
      { lon: lote.centroidLon, lat: lote.centroidLat },
      period,
    )

    const bytes = await readFile(filePath)

    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "private, max-age=3600",
        ETag: `"${lote.geometryHash}-${period}-${meta.dateFrom}-${meta.dateTo}"`,
        "X-Window-From": meta.dateFrom,
        "X-Window-To": meta.dateTo,
        "X-Window-Source": meta.windowSource,
        "X-Image-Empty": String(meta.isEmpty),
      },
    })
  } catch (error) {
    console.error(`[imagery] serving ${period} for lote ${id}`, error)
    return fail("SENTINEL_UNAVAILABLE")
  }
})
