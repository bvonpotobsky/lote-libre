import { describe, expect, it } from "vitest"

import { APTITUD_EJEMPLO, SUPERFICIE_EJEMPLO_HA } from "./aptitud-ejemplo"

describe("APTITUD_EJEMPLO", () => {
  it("adds up to the surface it claims", () => {
    // A fictional example still has to be arithmetically honest: a reader who
    // checks the sum and finds it wrong learns to distrust the real figures.
    const total = APTITUD_EJEMPLO.reduce(
      (sum, share) => sum + share.hectares,
      0,
    )
    expect(total).toBe(SUPERFICIE_EJEMPLO_HA)
  })

  it("adds up to a hundred percent", () => {
    const total = APTITUD_EJEMPLO.reduce((sum, share) => sum + share.pct, 0)
    expect(total).toBeCloseTo(100, 1)
  })

  it("shows all four buckets, including unzoned land", () => {
    expect(APTITUD_EJEMPLO.map((share) => share.bucket)).toEqual([
      "rojo",
      "amarillo",
      "verde",
      "fuera_de_otbn",
    ])
  })

  it("uses whole hectares, like every figure the product prints", () => {
    for (const share of APTITUD_EJEMPLO) {
      expect(Number.isInteger(share.hectares)).toBe(true)
    }
  })
})
