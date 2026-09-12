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
      { bucket: "rojo", hectares: 150, pct: 18.8 },
      { bucket: "amarillo", hectares: 340, pct: 42.5 },
      { bucket: "verde", hectares: 310, pct: 38.8 },
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

  it("gives no split at all when overlapping polygons zone more than the lote", () => {
    // `overlapByKey` sums per-feature intersections without unioning them, so a
    // published layer whose polygons overlap double-counts. This fixture zones
    // 1 100 ha of an 800 ha lote — 137,5 % — which is what the layer would
    // report, not a measurement of the field. Rescaling would move hectares
    // between categories the layer never claimed, so the split is dropped.
    const result = buildOtbnBreakdown(
      new Map([
        ["rojo", 600],
        ["amarillo", 500],
      ]),
      800,
    )

    expect(result).toEqual([])
  })

  it("tolerates a zoned total that overshoots only by rounding noise", () => {
    // The zoned areas are unrounded and `loteAreaHa` is not, so an exactly
    // covered lote can land a hair over 100 %. That is not an overlap.
    const result = buildOtbnBreakdown(new Map([["verde", 800.05]]), 800)

    expect(result.map((share) => share.bucket)).toEqual(["verde"])
  })

  it("rounds hectares to whole numbers", () => {
    const result = buildOtbnBreakdown(new Map([["verde", 12.4]]), 100)
    expect(result[0]!.hectares).toBe(12)
  })

  it("keeps a sliver visible as zero hectares rather than dropping it", () => {
    // 0 ha with a non-zero share is how the UI learns to say "menos de 1 ha".
    const result = buildOtbnBreakdown(new Map([["rojo", 0.4]]), 500)
    expect(result[0]).toEqual({ bucket: "rojo", hectares: 0, pct: 0.1 })
  })

  it("drops a remainder that is only a rounding artefact", () => {
    // `loteAreaHa` arrives rounded while the zoned areas do not, so a fully
    // zoned lote leaves a few millionths of a hectare behind. Printing that as
    // "Fuera del OTBN" would claim unzoned land on a lote that has none.
    const result = buildOtbnBreakdown(
      new Map([
        ["verde", 333.81456824111524],
        ["rojo", 111.27152274702925],
      ]),
      445.0861,
    )

    expect(result.map((share) => share.bucket)).toEqual(["rojo", "verde"])
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
