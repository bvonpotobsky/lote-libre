import { describe, expect, it } from "vitest"

import manifiestoReal from "@/data/sources.json"

import {
  FUENTE_COPERNICUS,
  type ManifiestoFuentes,
  desincronizadas,
  formatearConsulta,
  mapearFuentes,
  vigenciaLegible,
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

/** The same manifest with one layer re-downloaded a day later. */
function conDeriva(): ManifiestoFuentes {
  return {
    ...manifiesto,
    otbn: {
      ...manifiesto.otbn,
      chaco: { ...manifiesto.otbn.chaco, downloadedAt: "2026-09-11" },
    },
  }
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
    expect(umsef.rol).toBe("verificacion")
  })

  it("reads the UMSEF vintage as a period range, not as the filter expression", () => {
    expect(fuentes[0]!.vigencia).toBe("Períodos 2021 a 2024")
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

  it("stamps each source with its own download date", () => {
    for (const f of fuentes) expect(f.consultadaEl).toBe("12/09/2026")
  })

  it("reports a drifted layer's real date instead of the manifest's", () => {
    const fuentes = mapearFuentes(conDeriva())
    const chaco = fuentes.find((f) => f.id === "otbn-chaco")!
    expect(chaco.consultadaEl).toBe("11/09/2026")
    expect(fuentes.find((f) => f.id === "ign")!.consultadaEl).toBe("12/09/2026")
  })

  it("renders a drifted manifest instead of throwing", () => {
    // The landing is a server component: a throw here is a 500 on the home
    // page. Drift is a fact about committed data, so a test guards it.
    expect(() => mapearFuentes(conDeriva())).not.toThrow()
  })
})

describe("desincronizadas", () => {
  it("is empty when every layer was downloaded on generatedAt", () => {
    expect(desincronizadas(manifiesto)).toEqual([])
  })

  it("names the layers whose download date drifted", () => {
    expect(desincronizadas(conDeriva())).toEqual([
      manifiesto.otbn.chaco.label,
    ])
  })

  it("ships a manifest whose layers were all downloaded on generatedAt", () => {
    // The invariant that used to run at render time, where it could only fail
    // in front of a visitor. It is a claim about committed data; it lives here.
    expect(desincronizadas(manifiestoReal as ManifiestoFuentes)).toEqual([])
  })
})

describe("vigenciaLegible", () => {
  it("turns the UMSEF filter expression into the periods actually used", () => {
    expect(vigenciaLegible("1998-2024 (filtrado a periodo >= 2021)")).toBe(
      "Períodos 2021 a 2024"
    )
  })

  it("leaves a plain year untouched", () => {
    expect(vigenciaLegible("2010")).toBe("2010")
    expect(vigenciaLegible("2015")).toBe("2015")
  })

  it("leaves anything it does not recognise verbatim", () => {
    expect(vigenciaLegible("1998-2024")).toBe("1998-2024")
    expect(vigenciaLegible("")).toBe("")
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
