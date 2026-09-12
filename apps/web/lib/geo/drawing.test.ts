import { describe, expect, it } from "vitest"

import { aFeatureDeDibujo, firmaDeGeometria, lotesVisibles } from "./drawing"
import type { MapLote } from "./map-style"

function lote(id: string, lon: number): MapLote {
  return {
    id,
    nombre: `Lote ${id}`,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [lon, -27.5],
          [lon + 0.01, -27.5],
          [lon + 0.01, -27.49],
          [lon, -27.49],
          [lon, -27.5],
        ],
      ],
    },
    verdict: null,
    areaHa: 100,
  }
}

describe("lotesVisibles", () => {
  it("paints everything when nothing is being edited", () => {
    const lotes = [lote("a", -63), lote("b", -64)]
    expect(lotesVisibles(lotes, null)).toHaveLength(2)
  })

  // The double-render rule: while Terra Draw owns a polygon, the app's own
  // source must not paint it too.
  it("hides exactly the lote being edited", () => {
    const lotes = [lote("a", -63), lote("b", -64)]
    const visibles = lotesVisibles(lotes, "a")
    expect(visibles.map((l) => l.id)).toEqual(["b"])
  })

  it("hides nothing when the edited id is not on the map", () => {
    const lotes = [lote("a", -63)]
    expect(lotesVisibles(lotes, "fantasma")).toHaveLength(1)
  })

  it("does not mutate the array it was given", () => {
    const lotes = [lote("a", -63), lote("b", -64)]
    lotesVisibles(lotes, "a")
    expect(lotes).toHaveLength(2)
  })
})

describe("firmaDeGeometria", () => {
  it("matches for the same coordinates", () => {
    expect(firmaDeGeometria(lote("a", -63).geometry)).toBe(
      firmaDeGeometria(lote("otro-id", -63).geometry)
    )
  })

  // This is what stops an edit coming back as a prop from being re-loaded into
  // the draw store mid-drag.
  it("differs once a vertex moves", () => {
    expect(firmaDeGeometria(lote("a", -63).geometry)).not.toBe(
      firmaDeGeometria(lote("a", -63.5).geometry)
    )
  })
})

describe("aFeatureDeDibujo", () => {
  // Without this property addFeatures refuses the feature and says so only in
  // its return value: the polygon never appears and nothing is logged.
  it("always carries the mode property addFeatures requires", () => {
    expect(aFeatureDeDibujo(lote("a", -63)).properties.mode).toBe("polygon")
  })

  it("hands over the polygon untouched", () => {
    const original = lote("a", -63)
    expect(aFeatureDeDibujo(original).geometry).toEqual(original.geometry)
  })
})
