import { beforeEach, describe, expect, it } from "vitest"

import { primeLayerCache, type PolygonFeature } from "@/lib/geo/layers"
import { measure } from "@/lib/geo/metrics"
import { lookupForestLoss } from "./forest-loss"
import { lookupOtbn } from "./otbn"
import { decideVerdict } from "./verdict"

/** A rectangle near Pellegrini, Santiago del Estero. */
const LOTE: GeoJSON.Polygon = {
  type: "Polygon",
  coordinates: [
    [
      [-64.0, -25.86],
      [-63.98, -25.86],
      [-63.98, -25.84],
      [-64.0, -25.84],
      [-64.0, -25.86],
    ],
  ],
}

const LOTE_HA = measure(LOTE).areaHa

const rect = (
  west: number,
  east: number,
  props: Record<string, unknown>,
): PolygonFeature => ({
  type: "Feature",
  properties: props,
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [west, -25.86],
        [east, -25.86],
        [east, -25.84],
        [west, -25.84],
        [west, -25.86],
      ],
    ],
  },
})

const PROVINCE = "santiago-del-estero"
const LOSS_LAYER = `forest-loss/${PROVINCE}.geojson`
const OTBN_LAYER = `otbn/${PROVINCE}.geojson`

beforeEach(() => {
  primeLayerCache(LOSS_LAYER, null)
  primeLayerCache(OTBN_LAYER, null)
})

describe("lookupForestLoss", () => {
  it("measures the western half of the lote as roughly 50%", async () => {
    primeLayerCache(LOSS_LAYER, [rect(-64.0, -63.99, { periodo: 2023 })])

    const result = await lookupForestLoss(LOTE, LOTE_HA, PROVINCE)
    expect(result.status).toBe("ok")
    if (result.status !== "ok") return

    expect(result.pct).toBeGreaterThan(45)
    expect(result.pct).toBeLessThan(55)
    expect(result.firstYear).toBe(2023)
  })

  it("ignores clearing from before the 2020 cutoff", async () => {
    primeLayerCache(LOSS_LAYER, [rect(-64.0, -63.99, { periodo: 2019 })])

    const result = await lookupForestLoss(LOTE, LOTE_HA, PROVINCE)
    expect(result.status).toBe("ok")
    if (result.status !== "ok") return

    expect(result.pct).toBe(0)
    expect(result.firstYear).toBeNull()
  })

  it("reports the earliest post-cutoff year when several overlap", async () => {
    primeLayerCache(LOSS_LAYER, [
      rect(-64.0, -63.995, { periodo: 2023 }),
      rect(-63.995, -63.99, { periodo: 2021 }),
      rect(-63.99, -63.985, { periodo: 2019 }),
    ])

    const result = await lookupForestLoss(LOTE, LOTE_HA, PROVINCE)
    if (result.status !== "ok") throw new Error("expected ok")

    expect(result.firstYear).toBe(2021)
    expect(result.yearsFound).toEqual([2021, 2023])
  })

  it("skips a polygon that does not touch the lote", async () => {
    primeLayerCache(LOSS_LAYER, [rect(-60.0, -59.99, { periodo: 2023 })])

    const result = await lookupForestLoss(LOTE, LOTE_HA, PROVINCE)
    if (result.status !== "ok") throw new Error("expected ok")
    expect(result.pct).toBe(0)
  })

  it("reports an uncovered province as permanent, not retryable", async () => {
    // Telling a producer in Chubut to "try again in a moment" is a lie: we do
    // not ship that province and retrying can never succeed.
    const result = await lookupForestLoss(LOTE, LOTE_HA, "chubut")
    expect(result.status).toBe("not_covered")
  })

  it("reports a covered province whose layer failed to load as retryable", async () => {
    primeLayerCache(LOSS_LAYER, null)
    const result = await lookupForestLoss(LOTE, LOTE_HA, PROVINCE)
    expect(result.status).toBe("unavailable")
  })
})

describe("lookupOtbn", () => {
  it("reports the category covering the lote", async () => {
    primeLayerCache(OTBN_LAYER, [
      rect(-64.01, -63.97, { categoria: "amarillo", cat_cons_original: "II" }),
    ])

    const result = await lookupOtbn(LOTE, LOTE_HA, PROVINCE)
    expect(result.category).toBe("amarillo")
    expect(result.pct).toBeGreaterThan(95)
  })

  it("takes the most restrictive category, not the largest", async () => {
    primeLayerCache(OTBN_LAYER, [
      rect(-64.0, -63.985, { categoria: "verde" }),
      rect(-63.985, -63.98, { categoria: "rojo" }),
    ])

    const result = await lookupOtbn(LOTE, LOTE_HA, PROVINCE)
    expect(result.category).toBe("rojo")
    expect(result.pct).toBeGreaterThan(20)
    expect(result.pct).toBeLessThan(30)
  })

  it("says it does not know when the province has no layer", async () => {
    const result = await lookupOtbn(LOTE, LOTE_HA, "chubut")
    expect(result.category).toBe("sin_cobertura")
    expect(result.pct).toBe(0)
  })

  it("reports a lote outside the zoning as outside, not as unknown", async () => {
    // Layer present, but the lote touches none of it: exactly a long-standing
    // Córdoba field, in a province that zones no Categoría III at all.
    primeLayerCache(OTBN_LAYER, [rect(-60.0, -59.99, { categoria: "rojo" })])

    const result = await lookupOtbn(LOTE, LOTE_HA, PROVINCE)
    expect(result.category).toBe("fuera_de_otbn")
  })
})

describe("both layers feeding the verdict", () => {
  it("is red for a cleared lote, even inside category III", async () => {
    primeLayerCache(LOSS_LAYER, [rect(-64.0, -63.99, { periodo: 2023 })])
    primeLayerCache(OTBN_LAYER, [rect(-64.01, -63.97, { categoria: "verde" })])

    const loss = await lookupForestLoss(LOTE, LOTE_HA, PROVINCE)
    const otbn = await lookupOtbn(LOTE, LOTE_HA, PROVINCE)
    if (loss.status !== "ok") throw new Error("expected ok")

    expect(
      decideVerdict({ forestLossPct: loss.pct, otbnCategory: otbn.category })
        .verdict,
    ).toBe("rojo")
  })

  it("is green for a cropland lote outside the zoning", async () => {
    primeLayerCache(LOSS_LAYER, [])
    primeLayerCache(OTBN_LAYER, [rect(-60.0, -59.99, { categoria: "rojo" })])

    const loss = await lookupForestLoss(LOTE, LOTE_HA, PROVINCE)
    const otbn = await lookupOtbn(LOTE, LOTE_HA, PROVINCE)
    if (loss.status !== "ok") throw new Error("expected ok")

    expect(otbn.category).toBe("fuera_de_otbn")
    expect(
      decideVerdict({ forestLossPct: loss.pct, otbnCategory: otbn.category })
        .verdict,
    ).toBe("verde")
  })

  it("is green only with no loss and a confirmed category III", async () => {
    primeLayerCache(LOSS_LAYER, [])
    primeLayerCache(OTBN_LAYER, [rect(-64.01, -63.97, { categoria: "verde" })])

    const loss = await lookupForestLoss(LOTE, LOTE_HA, PROVINCE)
    const otbn = await lookupOtbn(LOTE, LOTE_HA, PROVINCE)
    if (loss.status !== "ok") throw new Error("expected ok")

    expect(
      decideVerdict({ forestLossPct: loss.pct, otbnCategory: otbn.category })
        .verdict,
    ).toBe("verde")
  })
})
