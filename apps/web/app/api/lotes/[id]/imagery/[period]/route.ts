import { readFile } from "node:fs/promises"

import { requireUser } from "@/lib/auth/guard"
import { fail, withRoute } from "@/lib/http/responses"
import { findLote } from "@/lib/lotes/service"
import { EVALSCRIPT_VERSION } from "@/lib/services/sentinel"
import {
  getOrCreateImage,
  type ImageLayer,
  type ImagePeriod,
} from "@/lib/services/imagery"

type Context = { params: Promise<{ id: string; period: string }> }

const PERIODS = new Set<ImagePeriod>(["reference", "current"])

const isPeriod = (value: string): value is ImagePeriod =>
  PERIODS.has(value as ImagePeriod)

/** Anything but an explicit "ndvi" is the default view. */
const readLayer = (request: Request): ImageLayer =>
  new URL(request.url).searchParams.get("layer") === "ndvi"
    ? "ndvi"
    : "trueColor"

/**
 * The image cache is keyed by geometry, not by owner. Authorization happens
 * here, on the lote, before a single byte is read off disk.
 */
export const GET = withRoute(async (request: Request, context: Context) => {
  const user = await requireUser()
  const { id, period } = await context.params

  if (!isPeriod(period)) return fail("NOT_FOUND")

  const lote = await findLote(user.id, id)
  if (!lote) return fail("NOT_FOUND")

  const layer = readLayer(request)

  try {
    const { meta, filePath } = await getOrCreateImage(
      lote.geometry,
      lote.geometryHash,
      { lon: lote.centroidLon, lat: lote.centroidLat },
      period,
      layer,
    )

    const bytes = await readFile(filePath)

    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "private, max-age=3600",
        // The layer belongs in the ETag: without it both layers of a period
        // share one validator and the browser serves whichever it cached first.
        ETag: `"${lote.geometryHash}-${period}-${layer}-${meta.dateFrom}-${meta.dateTo}"`,
        "X-Window-From": meta.dateFrom,
        "X-Window-To": meta.dateTo,
        "X-Window-Source": meta.windowSource,
        "X-Image-Empty": String(meta.isEmpty),
        "X-Image-Clear":
          meta.clearRatio === null ? "unknown" : meta.clearRatio.toFixed(3),
        "X-Image-Size": `${meta.pixelWidth}x${meta.pixelHeight}`,
        "X-Evalscript-Version": String(EVALSCRIPT_VERSION),
      },
    })
  } catch (error) {
    console.error(`[imagery] serving ${period} for lote ${id}`, error)
    return fail("SENTINEL_UNAVAILABLE")
  }
})
