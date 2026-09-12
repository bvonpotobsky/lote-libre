import { describe, expect, it } from "vitest"

import { CAVEAT_APTITUD, filasAptitud } from "./aptitud"

describe("filasAptitud", () => {
  it("gives every bucket its legal sentence, never just a colour", () => {
    const [fila] = filasAptitud([{ bucket: "rojo", hectares: 150, pct: 18.75 }])

    expect(fila!.etiqueta).toBe("Categoría I")
    expect(fila!.detalle).toBe("Conservación. No se puede desmontar.")
  })

  it("formats hectares as whole numbers in es-AR", () => {
    const [fila] = filasAptitud([
      { bucket: "verde", hectares: 1310, pct: 38.75 },
    ])
    expect(fila!.hectareas).toBe("1.310 ha")
  })

  it("says 'menos de 1 ha' instead of printing a bare zero", () => {
    // A sliver that rounds to zero is still a sliver; "0 ha" reads as none.
    const [fila] = filasAptitud([{ bucket: "rojo", hectares: 0, pct: 0.08 }])
    expect(fila!.hectareas).toBe("menos de 1 ha")
  })

  it("formats the share with at most two decimals", () => {
    const [fila] = filasAptitud([
      { bucket: "amarillo", hectares: 340, pct: 42.5 },
    ])
    expect(fila!.porcentaje).toBe("42,5 %")
  })

  it("preserves the order it was given", () => {
    const filas = filasAptitud([
      { bucket: "rojo", hectares: 1, pct: 1 },
      { bucket: "fuera_de_otbn", hectares: 99, pct: 99 },
    ])
    expect(filas.map((fila) => fila.bucket)).toEqual(["rojo", "fuera_de_otbn"])
  })

  it("returns nothing for an empty breakdown", () => {
    expect(filasAptitud([])).toEqual([])
  })
})

describe("CAVEAT_APTITUD", () => {
  it("names the scale, because the number invites more trust than it earns", () => {
    expect(CAVEAT_APTITUD).toContain("1:250 000")
  })
})
