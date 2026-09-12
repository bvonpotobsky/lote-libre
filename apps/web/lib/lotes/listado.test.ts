import { describe, expect, it } from "vitest"

import {
  CRITERIOS_VACIOS,
  contarPorEstado,
  estadoDeLote,
  filtrarLotes,
  hayCriteriosActivos,
  normalizarTexto,
  opcionesDeEstado,
  opcionesDeProvincia,
  type LoteListado,
} from "./listado"

const base: LoteListado = {
  id: "a",
  nombre: "La Amarga",
  provincia: "cordoba",
  areaHa: 290.3,
  verdict: null,
  verificationStatus: null,
  verificationStale: false,
  verifiedAt: null,
  failureCode: null,
}

const lote = (patch: Partial<LoteListado>): LoteListado => ({
  ...base,
  ...patch,
})

describe("estadoDeLote", () => {
  it("names each verdict with the label the product uses", () => {
    expect(estadoDeLote(lote({ verdict: "verde" })).etiqueta).toBe(
      "Sin observaciones"
    )
    expect(estadoDeLote(lote({ verdict: "amarillo" })).etiqueta).toBe(
      "Con observaciones"
    )
    expect(estadoDeLote(lote({ verdict: "rojo" })).etiqueta).toBe("No cumple")
  })

  it("marks a verdict as a verdict, so the row can fill it with colour", () => {
    expect(estadoDeLote(lote({ verdict: "verde" })).esVeredicto).toBe(true)
    expect(estadoDeLote(base).esVeredicto).toBe(false)
  })

  it("calls a lote nobody has checked yet unverified, with nothing to explain", () => {
    const estado = estadoDeLote(base)
    expect(estado.clave).toBe("sin_verificar")
    expect(estado.etiqueta).toBe("Sin verificar")
    expect(estado.nota).toBeNull()
  })

  /*
   * The three silences the row has always distinguished, plus the one it never
   * could. They are not interchangeable: an edited lote is one tap from an
   * answer, an uncovered province is not, and telling a producer to retry
   * something that cannot work is worse than saying nothing.
   */
  it("says the outline changed when a verdict was withheld by an edit", () => {
    const estado = estadoDeLote(
      lote({ verificationStale: true, verifiedAt: "2026-08-03T00:00:00.000Z" })
    )
    expect(estado.clave).toBe("contorno_cambiado")
    expect(estado.etiqueta).toBe("Sin verificar")
    expect(estado.nota).toBe("cambió el contorno")
  })

  it("separates an uncovered province from a failed attempt", () => {
    expect(
      estadoDeLote(
        lote({
          verificationStatus: "failed",
          failureCode: "PROVINCE_NOT_COVERED",
        })
      ).clave
    ).toBe("sin_cobertura")

    expect(
      estadoDeLote(
        lote({
          verificationStatus: "failed",
          failureCode: "FOREST_LOSS_UNAVAILABLE",
        })
      ).clave
    ).toBe("no_se_pudo")
  })

  it("never lets an uncovered province read as retryable", () => {
    const estado = estadoDeLote(
      lote({
        verificationStatus: "failed",
        failureCode: "PROVINCE_NOT_COVERED",
      })
    )
    expect(estado.etiqueta).toBe("Sin cobertura")
    expect(estado.esVeredicto).toBe(false)
  })

  /*
   * Staleness wins over everything else the row could say. The service already
   * nulls `verdict` and `verificationStatus` for a stale row, but reading the
   * flag first is what keeps that a belt-and-braces guarantee rather than a
   * dependency on someone else remembering.
   */
  it("treats a stale row as unverified even if a verdict came through", () => {
    const estado = estadoDeLote(
      lote({ verdict: "verde", verificationStale: true })
    )
    expect(estado.clave).toBe("contorno_cambiado")
    expect(estado.esVeredicto).toBe(false)
  })
})

describe("normalizarTexto", () => {
  it("ignores case and accents, so a producer can type without them", () => {
    expect(normalizarTexto("La Soñada")).toBe(normalizarTexto("la sonada"))
    expect(normalizarTexto("Córdoba")).toBe("cordoba")
  })

  it("collapses surrounding whitespace", () => {
    expect(normalizarTexto("  Norte  ")).toBe("norte")
  })
})

describe("filtrarLotes", () => {
  const lotes: LoteListado[] = [
    lote({
      id: "1",
      nombre: "Pellegrini Norte",
      provincia: "santiago-del-estero",
      verdict: "rojo",
    }),
    lote({
      id: "2",
      nombre: "La Soñada",
      provincia: "cordoba",
      verdict: "verde",
    }),
    lote({
      id: "3",
      nombre: "La Amarga",
      provincia: "cordoba",
      verdict: "verde",
    }),
    lote({ id: "4", nombre: "El Retiro", provincia: "chaco" }),
  ]

  it("returns everything when nothing is asked of it", () => {
    expect(filtrarLotes(lotes, CRITERIOS_VACIOS)).toHaveLength(4)
  })

  it("preserves the order it was given", () => {
    const ids = filtrarLotes(lotes, CRITERIOS_VACIOS).map((l) => l.id)
    expect(ids).toEqual(["1", "2", "3", "4"])
  })

  it("matches part of a name, accents aside", () => {
    const hallados = filtrarLotes(lotes, {
      ...CRITERIOS_VACIOS,
      texto: "sonada",
    })
    expect(hallados.map((l) => l.id)).toEqual(["2"])
  })

  it("matches in the middle of a name, not only at the start", () => {
    const hallados = filtrarLotes(lotes, {
      ...CRITERIOS_VACIOS,
      texto: "norte",
    })
    expect(hallados.map((l) => l.id)).toEqual(["1"])
  })

  it("searches the name only — a province has its own filter", () => {
    expect(
      filtrarLotes(lotes, { ...CRITERIOS_VACIOS, texto: "chaco" })
    ).toHaveLength(0)
  })

  it("filters by verdict", () => {
    expect(
      filtrarLotes(lotes, { ...CRITERIOS_VACIOS, estado: "verde" }).map(
        (l) => l.id
      )
    ).toEqual(["2", "3"])
  })

  /*
   * One bucket for every silence. A producer filtering for "Sin verificar" is
   * asking which lotes still stand between them and the paper; which flavour of
   * missing answer each one has is a row-level detail, not a filter.
   */
  it("groups every unverified flavour under one filter", () => {
    const mezcla: LoteListado[] = [
      lote({ id: "a" }),
      lote({ id: "b", verificationStale: true }),
      lote({
        id: "c",
        verificationStatus: "failed",
        failureCode: "PROVINCE_NOT_COVERED",
      }),
      lote({
        id: "d",
        verificationStatus: "failed",
        failureCode: "FOREST_LOSS_UNAVAILABLE",
      }),
      lote({ id: "e", verdict: "verde" }),
    ]
    expect(
      filtrarLotes(mezcla, {
        ...CRITERIOS_VACIOS,
        estado: "sin_verificar",
      }).map((l) => l.id)
    ).toEqual(["a", "b", "c", "d"])
  })

  it("filters by province", () => {
    expect(
      filtrarLotes(lotes, { ...CRITERIOS_VACIOS, provincia: "cordoba" }).map(
        (l) => l.id
      )
    ).toEqual(["2", "3"])
  })

  it("applies every criterion at once", () => {
    expect(
      filtrarLotes(lotes, {
        texto: "la",
        estado: "verde",
        provincia: "cordoba",
      }).map((l) => l.id)
    ).toEqual(["2", "3"])
  })

  it("can come back empty", () => {
    expect(
      filtrarLotes(lotes, { ...CRITERIOS_VACIOS, texto: "no existe" })
    ).toEqual([])
  })
})

describe("hayCriteriosActivos", () => {
  it("is false for the resting state", () => {
    expect(hayCriteriosActivos(CRITERIOS_VACIOS)).toBe(false)
  })

  it("ignores whitespace typed into the search box", () => {
    expect(hayCriteriosActivos({ ...CRITERIOS_VACIOS, texto: "   " })).toBe(
      false
    )
  })

  it("is true as soon as any one of them is set", () => {
    expect(hayCriteriosActivos({ ...CRITERIOS_VACIOS, texto: "a" })).toBe(true)
    expect(hayCriteriosActivos({ ...CRITERIOS_VACIOS, estado: "rojo" })).toBe(
      true
    )
    expect(
      hayCriteriosActivos({ ...CRITERIOS_VACIOS, provincia: "chaco" })
    ).toBe(true)
  })
})

describe("opcionesDeEstado", () => {
  it("offers only the states actually present, in verdict order", () => {
    const lotes = [
      lote({ verdict: "rojo" }),
      lote({}),
      lote({ verdict: "verde" }),
    ]
    expect(opcionesDeEstado(lotes)).toEqual(["verde", "rojo", "sin_verificar"])
  })

  it("says nothing when every lote sits in the same state", () => {
    expect(
      opcionesDeEstado([lote({ verdict: "verde" }), lote({ verdict: "verde" })])
    ).toEqual(["verde"])
  })

  it("handles an empty list", () => {
    expect(opcionesDeEstado([])).toEqual([])
  })
})

describe("opcionesDeProvincia", () => {
  it("lists each province once, by its display name", () => {
    const lotes = [
      lote({ provincia: "santiago-del-estero" }),
      lote({ provincia: "cordoba" }),
      lote({ provincia: "cordoba" }),
    ]
    expect(opcionesDeProvincia(lotes)).toEqual([
      { slug: "cordoba", nombre: "Córdoba" },
      { slug: "santiago-del-estero", nombre: "Santiago del Estero" },
    ])
  })

  it("sorts the way Spanish does, not the way ASCII does", () => {
    const lotes = [
      lote({ provincia: "desconocida" }),
      lote({ provincia: "chaco" }),
    ]
    expect(opcionesDeProvincia(lotes).map((p) => p.nombre)).toEqual([
      "Chaco",
      "Sin determinar",
    ])
  })
})

describe("contarPorEstado", () => {
  it("counts each filter bucket over the whole collection", () => {
    const lotes = [
      lote({ verdict: "verde" }),
      lote({ verdict: "verde" }),
      lote({ verdict: "rojo" }),
      lote({ verificationStale: true }),
    ]
    const conteo = contarPorEstado(lotes)
    expect(conteo.verde).toBe(2)
    expect(conteo.rojo).toBe(1)
    expect(conteo.amarillo).toBe(0)
    expect(conteo.sin_verificar).toBe(1)
  })
})
