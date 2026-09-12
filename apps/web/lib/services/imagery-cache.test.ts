import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import type { SatelliteImage } from "@/lib/db/schema"
import { cacheFileName, stillOnDisk } from "./imagery-cache"

const HASH = "a".repeat(64)

/** A 1x1 PNG signature is enough: nothing here decodes the bytes. */
const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

let dir: string

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "imagery-cache-"))
})

afterAll(async () => {
  await rm(dir, { recursive: true, force: true })
})

function row(filePath: string, period: "reference" | "current"): SatelliteImage {
  return {
    id: "img1",
    geometryHash: HASH,
    period,
    layer: "ndvi",
    dateFrom: "2020-10-01",
    dateTo: "2020-12-31",
    windowSource: "xweather",
    cloudAvgPct: 4.2,
    filePath,
    bytes: PNG_BYTES.byteLength,
    isEmpty: false,
    createdAt: new Date("2026-09-12T00:00:00Z"),
  } as unknown as SatelliteImage
}

describe("stillOnDisk", () => {
  it("keeps a row whose PNG is where the row says it is", async () => {
    const filePath = join(dir, "present.png")
    await writeFile(filePath, PNG_BYTES)

    expect(await stillOnDisk(row(filePath, "current"))).not.toBeNull()
  })

  /**
   * The regression this exists for. A deploy recycles the filesystem, the row
   * survives, and the 2020 baseline never expires by age — so without this the
   * lote answers SENTINEL_UNAVAILABLE forever instead of refetching once.
   */
  it("drops a reference row whose PNG a deploy took with it", async () => {
    expect(await stillOnDisk(row(join(dir, "evicted.png"), "reference"))).toBe(
      null,
    )
  })

  it("drops a current row whose PNG is gone", async () => {
    expect(await stillOnDisk(row(join(dir, "gone.png"), "current"))).toBe(null)
  })

  it("passes a cache miss straight through", async () => {
    expect(await stillOnDisk(null)).toBe(null)
  })
})

describe("cacheFileName", () => {
  it("keys the file by everything that changes the pixels", () => {
    expect(
      cacheFileName(HASH, "reference", "ndvi", 2, "2020-10-01", "2020-12-31"),
    ).toBe(`${HASH}-reference-ndvi-v2-2020-10-01_2020-12-31.png`)
  })

  it("gives an edited evalscript a name of its own", () => {
    // Without the version in the name, changing a ramp leaves every PNG on disk
    // reachable under the name the new renderer would write to.
    expect(
      cacheFileName(HASH, "reference", "ndvi", 3, "2020-10-01", "2020-12-31"),
    ).not.toBe(
      cacheFileName(HASH, "reference", "ndvi", 2, "2020-10-01", "2020-12-31"),
    )
  })
})
