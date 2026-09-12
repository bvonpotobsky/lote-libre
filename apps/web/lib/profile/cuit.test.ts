import { describe, expect, it } from "vitest"

import { esCuitValido, formatearCuit, normalizarCuit } from "./cuit"

describe("CUIT", () => {
  it("normalizes and formats a CUIT", () => {
    expect(normalizarCuit("20-12345678-3")).toBe("20123456783")
    expect(formatearCuit("20123456783")).toBe("20-12345678-3")
  })

  it("validates the check digit", () => {
    expect(esCuitValido("20-00123456-1")).toBe(true)
    expect(esCuitValido("20-00123456-2")).toBe(false)
    expect(esCuitValido("123")).toBe(false)
  })
})
