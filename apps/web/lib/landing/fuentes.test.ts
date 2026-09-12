import { describe, expect, it } from "vitest"

import {
  CALENDARIO_EUDR,
  FECHA_VERIFICACION_CALENDARIO,
  FUENTE_COPERNICUS,
  type ManifiestoFuentes,
  URL_COMISION_EUROPEA,
  formatearConsulta,
  mapearFuentes,
} from "./fuentes"

const CAVEAT_CORDOBA =
  "Córdoba no tiene ninguna zona de Categoría III en su OTBN. Cerca de un límite, la intersección es indicativa."

function otbn(
  provincia: string,
  vintage: string,
  legalInstrument: string,
  caveat: string
) {
  return {
    label: `OTBN ${provincia} — Ordenamiento Territorial de Bosques Nativos`,
    sourceUrl: `https://geo.ambiente.gob.ar/documentos/sinia/bosque_OTBN/${provincia}.rar`,
    publisher: "Dirección Nacional de Bosques / MAyDS — IDE Ambiental / SINIA",
    vintage,
    vintageDate: `${vintage}-01-01`,
    legalInstrument,
    license: "Creative Commons — licencia libre",
    downloadedAt: "2026-09-12",
    caveat,
  }
}

function forestLoss(provincia: string) {
  return {
    label: `Pérdida de bosque nativo post-2020 — ${provincia} (UMSEF)`,
    sourceUrl:
      "https://geo.ambiente.gob.ar/geoserver/wfs?typeNames=bosques%3Amonitoreo_pch_1998_2024",
    publisher:
      "UMSEF — Unidad de Manejo del Sistema de Evaluación Forestal, Dirección Nacional de Bosques / MAyDS",
    vintage: "1998-2024 (filtrado a periodo >= 2021)",
    license: "Creative Commons — licencia libre",
    downloadedAt: "2026-09-12",
    caveat:
      "La capa no incluye ningún atributo de categoría OTBN; la categoría debe cruzarse espacialmente.",
  }
}

const manifiesto: ManifiestoFuentes = {
  generatedAt: "2026-09-12",
  otbn: {
    cordoba: otbn("Córdoba", "2010", "Ley provincial 9814", CAVEAT_CORDOBA),
    chaco: otbn(
      "Chaco",
      "2009",
      "Ley provincial 6409",
      "Ordenamiento de 2009."
    ),
    "santiago-del-estero": otbn(
      "Santiago del Estero",
      "2015",
      "Ley provincial 6942 + Decreto 3133",
      "Simplificada."
    ),
  },
  forestLoss: {
    cordoba: forestLoss("cordoba"),
    chaco: forestLoss("chaco"),
    "santiago-del-estero": forestLoss("santiago-del-estero"),
  },
  provincias: {
    label: "Límites provinciales de la República Argentina",
    sourceUrl: "https://wms.ign.gob.ar/geoserver/wfs?typeNames=ign%3Aprovincia",
    publisher: "Instituto Geográfico Nacional (IGN)",
    license: "Uso libre — Artículo 2, Ley 27.275",
    downloadedAt: "2026-09-12",
    caveat: "Se usa únicamente para resolver la provincia de un lote.",
  },
}

describe("mapearFuentes", () => {
  const fuentes = mapearFuentes(manifiesto)

  it("lists UMSEF once, then the three OTBN layers, then the IGN", () => {
    expect(fuentes.map((f) => f.id)).toEqual([
      "umsef",
      "otbn-cordoba",
      "otbn-chaco",
      "otbn-santiago-del-estero",
      "ign",
    ])
  })

  it("collapses the three forest-loss blocks into one entry covering all provinces", () => {
    const umsef = fuentes[0]!
    expect(umsef.cobertura).toEqual(["Córdoba", "Chaco", "Santiago del Estero"])
    expect(umsef.vigencia).toBe("1998-2024 (filtrado a periodo >= 2021)")
    expect(umsef.rol).toBe("verificacion")
  })

  it("carries the manifest wording verbatim", () => {
    const cordoba = fuentes.find((f) => f.id === "otbn-cordoba")!
    expect(cordoba.caveat).toBe(CAVEAT_CORDOBA)
    expect(cordoba.instrumento).toBe("Ley provincial 9814")
    expect(cordoba.vigencia).toBe("2010")
    expect(cordoba.url).toBe(manifiesto.otbn.cordoba.sourceUrl)
    expect(cordoba.organismo).toBe(manifiesto.otbn.cordoba.publisher)
    expect(cordoba.rol).toBe("verificacion")
  })

  it("keeps the IGN as a reference source with its licence", () => {
    const ign = fuentes.find((f) => f.id === "ign")!
    expect(ign.rol).toBe("referencia")
    expect(ign.licencia).toBe("Uso libre — Artículo 2, Ley 27.275")
    expect(ign.instrumento).toBeNull()
  })

  it("exposes the consultation date from the manifest", () => {
    for (const f of fuentes) expect(f.consultadaEl).toBe("12/09/2026")
  })

  it("refuses a manifest whose download dates drifted from generatedAt", () => {
    const roto: ManifiestoFuentes = {
      ...manifiesto,
      otbn: {
        ...manifiesto.otbn,
        chaco: { ...manifiesto.otbn.chaco, downloadedAt: "2026-09-11" },
      },
    }
    expect(() => mapearFuentes(roto)).toThrow(/downloadedAt/)
  })
})

describe("FUENTE_COPERNICUS", () => {
  it("is evidence, not a verification layer", () => {
    expect(FUENTE_COPERNICUS.rol).toBe("evidencia")
    expect(FUENTE_COPERNICUS.url).toBe("https://dataspace.copernicus.eu/")
    expect(FUENTE_COPERNICUS.caveat).toMatch(/evidencia visual/)
  })
})

describe("formatearConsulta", () => {
  it("prints dd/mm/yyyy", () => {
    expect(formatearConsulta("2026-09-12")).toBe("12/09/2026")
    expect(formatearConsulta("2026-01-05")).toBe("05/01/2026")
  })
})

describe("CALENDARIO_EUDR", () => {
  it("carries the two Commission dates and their instrument", () => {
    const fechas = CALENDARIO_EUDR.map((e) => e.fecha)
    expect(fechas).toEqual(["30/12/2026", "30/06/2027"])
    for (const e of CALENDARIO_EUDR) {
      expect(e.instrumento).toMatch(/2025\/2650/)
    }
    expect(FECHA_VERIFICACION_CALENDARIO).toBe("12/09/2026")
    expect(URL_COMISION_EUROPEA).toBe(
      "https://green-forum.ec.europa.eu/deforestation-regulation-implementation_en"
    )
  })
})
