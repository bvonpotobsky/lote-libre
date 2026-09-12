import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import {
  EVALSCRIPTS,
  EVALSCRIPT_VERSION,
  MAX_TILE_CLOUD_PCT,
} from "./sentinel"

/** Hexes the OTBN legend owns, rendered elsewhere on the same screen. */
const OTBN_PALETTE = ["f10000", "eff60b", "38a800"]

describe("evalscripts", () => {
  it("offers the two app layers plus the frozen one the landing bake needs", () => {
    expect(Object.keys(EVALSCRIPTS).sort()).toEqual([
      "ndvi",
      "trueColor",
      "trueColorFlat",
    ])
  })

  for (const layer of ["trueColor", "ndvi"] as const) {
    it(`composites ${layer} across orbits with a per-pixel cloud mask`, () => {
      // maxCloudCoverage filters whole tiles. Without SCL a cloud sitting over
      // this one lote passes the filter and paints as ground.
      expect(EVALSCRIPTS[layer]).toContain('mosaicking: "ORBIT"')
      expect(EVALSCRIPTS[layer]).toContain('"SCL"')
    })

    it(`leaves an unresolved ${layer} pixel transparent`, () => {
      // Painting a hole opaque would make a fully clouded window look like a
      // real image, and the widening path in imagery.ts would stop firing.
      expect(EVALSCRIPTS[layer]).toContain("return [0, 0, 0, 0]")
    })
  }

  it("keeps trueColorFlat frozen for the committed landing artwork", () => {
    // build-landing-assets.ts compensates this exact flat gain in sharp.
    expect(EVALSCRIPTS.trueColorFlat).toContain("2.5*s.B04")
    expect(EVALSCRIPTS.trueColorFlat).not.toContain("mosaicking")
    expect(EVALSCRIPTS.trueColorFlat).not.toContain("SCL")
  })
})

describe("the NDVI ramp", () => {
  it("drops the saturated yellow that made dry monte look cleared", () => {
    expect(EVALSCRIPTS.ndvi).not.toContain("ffff66")
    expect(EVALSCRIPTS.ndvi).not.toContain("d2b48c")
  })

  it("does not borrow the OTBN legend's colours", () => {
    // An index ramp in the legal palette invites reading a legal category out
    // of a leaf-greenness measurement.
    for (const hex of OTBN_PALETTE) {
      expect(EVALSCRIPTS.ndvi.toLowerCase()).not.toContain(hex)
    }
  })

  it("puts the swing into green above 0.3, where the dry Chaco separates", () => {
    const stops = [...EVALSCRIPTS.ndvi.matchAll(/\[(-?\d+\.\d+),\s*0x([0-9a-f]{6})\]/g)]
    expect(stops.length).toBeGreaterThanOrEqual(6)

    const greenest = (hex: string) => {
      const value = Number.parseInt(hex, 16)
      const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255]
      return g > r && g > b
    }

    for (const [, value, hex] of stops) {
      const ndvi = Number.parseFloat(value!)
      if (ndvi <= 0.25) expect(greenest(hex!)).toBe(false)
      if (ndvi >= 0.45) expect(greenest(hex!)).toBe(true)
    }
  })
})

describe("request defaults", () => {
  it("stops discarding tiles the per-pixel mask can now rescue", () => {
    expect(MAX_TILE_CLOUD_PCT).toBe(70)
  })
})

describe("EVALSCRIPT_VERSION", () => {
  it("matches the scripts it labels", () => {
    // The cache keys images by this number and nothing else about the request.
    // If this fails you edited an evalscript: bump EVALSCRIPT_VERSION and
    // update the digest below together, or every cached PNG keeps being served
    // by the old renderer for ever.
    //
    // Note what this test CANNOT see. It hashes the scripts, so a change to the
    // bounds — which is what v3 was, and not a character of any script moved —
    // leaves the digest identical and this assertion green. Change what pixels
    // you ask Copernicus for and you have to bump the number by hand.
    const digest = createHash("sha256")
      .update(JSON.stringify(EVALSCRIPTS))
      .digest("hex")
      .slice(0, 16)

    expect({ version: EVALSCRIPT_VERSION, digest }).toEqual({
      version: 3,
      digest: "1f1b479e8e7bb786",
    })
  })
})

describe("the request bounds", () => {
  it("asks for a rectangle, never for a masked polygon", () => {
    // Passing `geometry` here makes Sentinel Hub return everything outside the
    // polygon as alpha 0, which the comparador rendered as a black diamond. The
    // type has one arm so the mistake cannot be made again; this pins the type.
    const source = readFileSync(
      new URL("./sentinel.ts", import.meta.url),
      "utf8",
    )
    const tipo = source.slice(
      source.indexOf("type ProcessBounds"),
      source.indexOf("type ProcessRequest"),
    )

    expect(tipo).toContain("bbox: number[]")
    expect(tipo).not.toContain("geometry:")
  })
})
