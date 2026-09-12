import { access } from "node:fs/promises"
import { resolve } from "node:path"

import type { SatelliteImage } from "@/lib/db/schema"

/** Relative to the process cwd, which is apps/web in every environment. */
export const CACHE_DIR = resolve(process.cwd(), ".cache/sentinel")

export function cacheFileName(
  geometryHash: string,
  period: "reference" | "current",
  layer: "trueColor" | "ndvi",
  from: string,
  to: string,
): string {
  return `${geometryHash}-${period}-${layer}-${from}_${to}.png`
}

/**
 * Narrows a cache row to one whose PNG can actually still be served.
 *
 * The row and the bytes live in different places, and only one of them
 * survives a deploy: the path in `file_path` is absolute and the cache
 * directory is ephemeral unless a volume is mounted over it. A reference row
 * never expires by age — the 2020 baseline does not change — so a row left
 * pointing at bytes that are gone is permanent, and every request for that
 * lote answers SENTINEL_UNAVAILABLE forever.
 *
 * Treating the miss as a miss costs one Copernicus request and heals the row,
 * because the insert upserts on the same window.
 */
export async function stillOnDisk(
  row: SatelliteImage | null,
): Promise<SatelliteImage | null> {
  if (!row) return null

  try {
    await access(row.filePath)
    return row
  } catch {
    return null
  }
}
