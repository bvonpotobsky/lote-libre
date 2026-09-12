import { describe, expect, it } from "vitest"

import { buildOtbnBreakdown } from "./otbn"

describe("buildOtbnBreakdown", () => {
  it("splits the lote across the categories the layer reported", () => {
    const result = buildOtbnBreakdown(
      new Map([
        ["rojo", 150],
        ["amarillo", 340],
        ["verde", 310],
      ]),
      800,
    )

    expect(result).toEqual([
      { bucket: "rojo", hectares: 150, pct: 18.75 },
      { bucket: "amarillo", hectares: 340, pct: 42.5 },
      { bucket: "verde", hectares: 310, pct: 38.75 },
    ])
  })

  it("reports unzoned surface as its own bucket, last", () => {
    // Córdoba zones no Categoría III: without this bucket every field there
    // would report zero usable hectares, which is false.
    const result = buildOtbnBreakdown(new Map([["rojo", 200]]), 800)

    expect(result).toEqual([
      { bucket: "rojo", hectares: 200, pct: 25 },
      { bucket: "fuera_de_otbn", hectares: 600, pct: 75 },
    ])
  })

  it("puts the whole lote outside the zoning when nothing intersected", () => {
    expect(buildOtbnBreakdown(new Map(), 500)).toEqual([
      { bucket: "fuera_de_otbn", hectares: 500, pct: 100 },
    ])
  })

  it("clamps the remainder instead of rescaling when polygons overlap", () => {
    // A published layer with overlapping polygons can total more than the lote.
    // Rescaling would silently move hectares between categories the layer never
    // claimed; clamping only refuses to invent a negative bucket.
    const result = buildOtbnBreakdown(
      new Map([
        ["rojo", 600],
        ["amarillo", 500],
      ]),
      800,
    )

    expect(result.find((share) => share.bucket === "fuera_de_otbn")).toBeUndefined()
    expect(result).toHaveLength(2)
  })

  it("rounds hectares to whole numbers", () => {
    const result = buildOtbnBreakdown(new Map([["verde", 12.4]]), 100)
    expect(result[0]!.hectares).toBe(12)
  })

  it("keeps a sliver visible as zero hectares rather than dropping it", () => {
    // 0 ha with a non-zero share is how the UI learns to say "menos de 1 ha".
    const result = buildOtbnBreakdown(new Map([["rojo", 0.4]]), 500)
    expect(result[0]).toEqual({ bucket: "rojo", hectares: 0, pct: 0.08 })
  })

  it("ignores keys the OTBN layer does not define", () => {
    const result = buildOtbnBreakdown(new Map([["celeste", 100]]), 500)
    expect(result).toEqual([
      { bucket: "fuera_de_otbn", hectares: 500, pct: 100 },
    ])
  })

  it("returns nothing for a lote with no area", () => {
    expect(buildOtbnBreakdown(new Map([["rojo", 10]]), 0)).toEqual([])
  })
})
