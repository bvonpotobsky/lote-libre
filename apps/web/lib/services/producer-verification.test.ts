import { describe, expect, it } from "vitest"

import { verificarProductor } from "./producer-verification"

describe("verificación simulada del productor", () => {
  it("returns the three expected preliminary checks", () => {
    const resultado = verificarProductor("20123456783", new Date("2026-01-01T12:00:00Z"))

    expect(resultado.simulado).toBe(true)
    expect(resultado.cuit).toBe("20-12345678-3")
    expect(resultado.checks.map((check) => check.id)).toEqual(["sisa", "renspa", "carta-porte"])
    expect(resultado.checks.map((check) => check.estado)).toEqual(["Habilitado", "Vigente", "Habilitado"])
  })
})
