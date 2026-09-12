import { describe, expect, it } from "vitest"

import type { OtbnCategory } from "@/lib/db/schema"
import { decideVerdict, dominantOtbnCategory } from "./verdict"

describe("decideVerdict", () => {
  it("is red when there is forest loss after the cutoff", () => {
    const result = decideVerdict({ forestLossPct: 98.7, otbnCategory: "rojo" })
    expect(result.verdict).toBe("rojo")
    expect(result.reasons).toContain("FOREST_LOSS_AFTER_CUTOFF")
  })

  it("is red on loss even where the OTBN says the land is category III", () => {
    expect(
      decideVerdict({ forestLossPct: 12, otbnCategory: "verde" }).verdict,
    ).toBe("rojo")
  })

  it("treats a sliver of loss as amber, not red", () => {
    const result = decideVerdict({ forestLossPct: 0.2, otbnCategory: "verde" })
    expect(result.verdict).toBe("amarillo")
    expect(result.reasons).toContain("FOREST_LOSS_MARGINAL")
  })

  it("is amber for category I with no loss: flagged, not failed", () => {
    const result = decideVerdict({ forestLossPct: 0, otbnCategory: "rojo" })
    expect(result.verdict).toBe("amarillo")
    expect(result.reasons).toContain("OTBN_CATEGORY_I")
  })

  it("is amber for category II", () => {
    expect(
      decideVerdict({ forestLossPct: 0, otbnCategory: "amarillo" }).verdict,
    ).toBe("amarillo")
  })

  it("is amber when the province has no OTBN layer: unknown is not clean", () => {
    const result = decideVerdict({
      forestLossPct: 0,
      otbnCategory: "sin_cobertura",
    })
    expect(result.verdict).toBe("amarillo")
    expect(result.reasons).toContain("OTBN_NO_COVERAGE")
  })

  it("is green for a lote outside the zoning with no loss", () => {
    // The OTBN maps native forest. Land outside it was not classified as
    // forest, which is an answer — not the absence of one.
    const result = decideVerdict({
      forestLossPct: 0,
      otbnCategory: "fuera_de_otbn",
    })
    expect(result.verdict).toBe("verde")
    // Still says so out loud: the shipped layer is simplified.
    expect(result.reasons).toContain("OTBN_OUTSIDE")
  })

  it("is still red for a cleared lote outside the zoning", () => {
    expect(
      decideVerdict({ forestLossPct: 40, otbnCategory: "fuera_de_otbn" })
        .verdict,
    ).toBe("rojo")
  })

  it("separates a missing layer from a lote outside the zoning", () => {
    expect(
      decideVerdict({ forestLossPct: 0, otbnCategory: "sin_cobertura" })
        .verdict,
    ).toBe("amarillo")
    expect(
      decideVerdict({ forestLossPct: 0, otbnCategory: "fuera_de_otbn" })
        .verdict,
    ).toBe("verde")
  })

  it("is green only with positive evidence from both layers", () => {
    const result = decideVerdict({ forestLossPct: 0, otbnCategory: "verde" })
    expect(result.verdict).toBe("verde")
    expect(result.reasons).toEqual(["NO_FINDINGS"])
  })

  it("never returns green from missing data", () => {
    const categories: OtbnCategory[] = ["rojo", "amarillo", "sin_cobertura"]
    for (const otbnCategory of categories) {
      expect(decideVerdict({ forestLossPct: 0, otbnCategory }).verdict).not.toBe(
        "verde",
      )
    }
  })
})

describe("dominantOtbnCategory", () => {
  it("picks the most restrictive category, not the largest", () => {
    const shares = new Map<OtbnCategory, number>([
      ["verde", 60],
      ["rojo", 40],
    ])
    expect(dominantOtbnCategory(shares)).toEqual({ category: "rojo", pct: 40 })
  })

  it("ignores a share below the noise floor", () => {
    const shares = new Map<OtbnCategory, number>([
      ["verde", 99.7],
      ["rojo", 0.3],
    ])
    expect(dominantOtbnCategory(shares)).toEqual({ category: "verde", pct: 99.7 })
  })

  it("reports no coverage when nothing intersects", () => {
    expect(dominantOtbnCategory(new Map())).toEqual({
      category: "sin_cobertura",
      pct: 0,
    })
  })
})
