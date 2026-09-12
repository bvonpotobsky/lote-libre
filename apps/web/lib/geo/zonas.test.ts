import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

import { normalizarTexto } from "@/lib/lotes/listado"
import { ARGENTINA_BBOX } from "./validate"
import {
  ZONAS_VERSION,
  ZOOM_LOCALIDAD,
  ZOOM_PUNTO,
  buscarSugerencias,
  decodificarZonas,
  zoomParaTramo,
  type FilaZona,
  type TipoZona,
  type Zona,
  type ZonasCrudas,
} from "./zonas"

/**
 * `clave` and `claveCompleta` are DERIVED, so a fixture that sets `nombre`
 * without re-deriving them is inconsistent and every ranking assertion below
 * becomes a lie that passes. This helper folds them the same way the decoder
 * does, through the same primitive, so the two cannot drift.
 */
function zona(
  nombre: string,
  patch: { tipo?: TipoZona; contexto?: string; centro?: [number, number] } = {}
): Zona {
  const contexto = patch.contexto ?? ""
  return {
    nombre,
    centro: patch.centro ?? [-60.5, -33.8],
    zoom: ZOOM_LOCALIDAD,
    contexto,
    tipo: patch.tipo ?? "localidad",
    clave: normalizarTexto(nombre),
    claveCompleta: normalizarTexto(`${nombre} ${contexto}`),
  }
}

describe("zoomParaTramo", () => {
  /*
   * The expected values are PINNED, not recomputed from the formula. A change to
   * the formula has to fail this suite rather than quietly move where every
   * search in the country lands — the same posture limites.test.ts takes toward
   * the boundary assets.
   */
  it.each([
    [{ oeste: -64, sur: -34.1, este: -63.8, norte: -33.9 }, 10.4],
    [{ oeste: -63, sur: -41, este: -57, norte: -33 }, 5.1],
  ])("%j frames at zoom %s", (tramo, esperado) => {
    expect(zoomParaTramo(tramo)).toBe(esperado)
  })

  it("clamps a tiny jurisdiction at 12, where the imagery stops resolving", () => {
    expect(
      zoomParaTramo({ oeste: -64, sur: -34.005, este: -63.99, norte: -33.995 })
    ).toBe(12)
  })

  it("never zooms out past the map's own initial view", () => {
    // The widget's contract is "get me closer, or at least over the right
    // place" — never "show me less than I already had".
    expect(zoomParaTramo({ oeste: -180, sur: -85, este: 180, norte: 85 })).toBe(
      5
    )
  })

  it.each([
    [-22, 6.2],
    [-52, 6.8],
  ])(
    "corrects longitude by latitude: the same 4° span at %s° frames at %s",
    (latitud, esperado) => {
      // cos(-22) ~ 0.93 against cos(-52) ~ 0.62. Without this a southern
      // province arrives a whole level too loose.
      expect(
        zoomParaTramo({
          oeste: -64,
          sur: latitud - 0.25,
          este: -60,
          norte: latitud + 0.25,
        })
      ).toBe(esperado)
    }
  )
})

describe("decodificarZonas", () => {
  const crudo = {
    version: ZONAS_VERSION,
    generado: "2026-09-12",
    provincias: [["Chaco", -60.9, -26.073, 5.9, ""]],
    departamentos: [["9 de Julio", -60.8, -27.1, 8.2, "Chaco"]],
    localidades: [["La Soñada", -60.5, -27.5, 12, "General Donovan, Chaco"]],
  }

  it("stamps each row with the kind of place it came from", () => {
    const zonas = decodificarZonas(crudo)
    expect(zonas.map((z) => z.tipo)).toEqual([
      "provincia",
      "departamento",
      "localidad",
    ])
  })

  it("reads the pair as lon then lat, which is MapLibre's order and not a human's", () => {
    const [chaco] = decodificarZonas(crudo)
    expect(chaco?.centro).toEqual([-60.9, -26.073])
  })

  it("folds the name once, here, so a keystroke never pays for 4.500 of them", () => {
    const sonada = decodificarZonas(crudo).find((z) => z.tipo === "localidad")
    expect(sonada?.clave).toBe("la sonada")
    expect(sonada?.claveCompleta).toBe("la sonada general donovan, chaco")
  })

  it("accepts an empty gazetteer, which is valid rather than malformed", () => {
    expect(
      decodificarZonas({
        version: ZONAS_VERSION,
        generado: "2026-09-12",
        provincias: [],
        departamentos: [],
        localidades: [],
      })
    ).toEqual([])
  })

  it("names the version in the message, so a stale asset says so out loud", () => {
    expect(() => decodificarZonas({ ...crudo, version: 99 })).toThrow(/99/)
  })

  it.each([
    [null, "null"],
    [[], "an array"],
    ["zonas", "a string"],
    [{ version: ZONAS_VERSION }, "a payload with no rows"],
    [
      { ...crudo, localidades: [["Solo", -60.5, -33.8, 12]] },
      "a four-field row",
    ],
    [
      { ...crudo, localidades: [["Solo", "-60.5", -33.8, 12, ""]] },
      "a longitude that is a string",
    ],
  ])("refuses %j (%s)", (payload, descripcion) => {
    expect(() => decodificarZonas(payload), descripcion).toThrow()
  })
})

describe("buscarSugerencias — names", () => {
  it.each(["", "   "])(
    "returns nothing for %j, because an empty query is not a request for 4.500 places",
    (consulta) => {
      expect(buscarSugerencias(consulta, [zona("Pergamino")])).toEqual({
        sugerencias: [],
        total: 0,
        aviso: null,
      })
    }
  )

  it("ranks exact, then prefix, then word-prefix, then substring", () => {
    const zonas = [
      zona("Resauce"),
      zona("El Sauce"),
      zona("Sauce Viejo"),
      zona("Sauce"),
    ]
    expect(
      buscarSugerencias("sauce", zonas).sugerencias.map((s) => s.titulo)
    ).toEqual(["Sauce", "Sauce Viejo", "El Sauce", "Resauce"])
  })

  it("finds «La Soñada» when a thumb in the sun types «sonada»", () => {
    const hallado = buscarSugerencias("sonada", [zona("La Soñada")])
    expect(hallado.sugerencias[0]?.titulo).toBe("La Soñada")
  })

  it("ignores the case the keyboard happened to be in", () => {
    expect(
      buscarSugerencias("PERGAMINO", [zona("Pergamino")]).sugerencias[0]?.titulo
    ).toBe("Pergamino")
  })

  it("puts the bigger container first when the score ties", () => {
    /*
     * 4.037 localidades against 552 areas: specificity-first buries Santa Fe
     * under eighty towns the moment someone types «sant». Arriving one level
     * too wide costs a pinch; arriving at the wrong San José of 36 is a
     * navigation failure.
     */
    const zonas = [
      zona("Santa Fe", { tipo: "localidad", contexto: "La Capital, Santa Fe" }),
      zona("Santa Fe", { tipo: "provincia" }),
      zona("Santa Fe", { tipo: "departamento", contexto: "Catamarca" }),
    ]
    expect(
      buscarSugerencias("sant", zonas).sugerencias.map((s) => s.detalle)
    ).toEqual(["", "Catamarca", "La Capital, Santa Fe"])
  })

  it("puts the shorter name first when score and kind both tie", () => {
    const zonas = [zona("San José de la Dormida"), zona("San José")]
    expect(
      buscarSugerencias("san", zonas).sugerencias.map((s) => s.titulo)
    ).toEqual(["San José", "San José de la Dormida"])
  })

  it("gives the same answer however the gazetteer happened to be ordered", () => {
    // Without a total order the output depends on the asset's own row order, and
    // every ranking test above goes flaky the first time it is regenerated.
    const zonas = [
      zona("San José", { contexto: "Entre Ríos" }),
      zona("San José", { contexto: "Buenos Aires" }),
      zona("San José", { contexto: "Catamarca" }),
    ]
    const derecho = buscarSugerencias("san jose", zonas).sugerencias
    const alReves = buscarSugerencias(
      "san jose",
      [...zonas].reverse()
    ).sugerencias
    expect(alReves).toEqual(derecho)
  })

  it("tells 36 San Josés apart, which is the whole product requirement", () => {
    const zonas = [
      zona("San José", { contexto: "Buenos Aires" }),
      zona("San José", { contexto: "Catamarca" }),
      zona("San José", { contexto: "Entre Ríos" }),
    ]
    const { sugerencias } = buscarSugerencias("san jose", zonas)
    expect(sugerencias).toHaveLength(3)
    expect(new Set(sugerencias.map((s) => s.detalle)).size).toBe(3)
    // And the React key has to be stable and unique across them.
    expect(new Set(sugerencias.map((s) => s.clave)).size).toBe(3)
  })

  it.each(["san jose entre rios", "entre rios san jose"])(
    "narrows to one with %j, because the token pass ignores order",
    (consulta) => {
      const zonas = [
        zona("San José", { contexto: "Buenos Aires" }),
        zona("San José", { contexto: "Catamarca" }),
        zona("San José", { contexto: "Entre Ríos" }),
      ]
      const { sugerencias } = buscarSugerencias(consulta, zonas)
      expect(sugerencias).toHaveLength(1)
      expect(sugerencias[0]?.detalle).toBe("Entre Ríos")
    }
  )

  it("caps the list but reports the real count, so the view can say «hay más»", () => {
    const zonas = Array.from({ length: 12 }, (_, i) => zona(`Villa ${i + 10}`))
    const hallado = buscarSugerencias("villa", zonas, 7)
    expect(hallado.sugerencias).toHaveLength(7)
    expect(hallado.total).toBe(12)
  })

  it("reports nothing found without raising an error about it", () => {
    expect(buscarSugerencias("zzzz", [zona("Pergamino")])).toEqual({
      sugerencias: [],
      total: 0,
      aviso: null,
    })
  })

  it("carries the camera the asset precomputed for that place", () => {
    const zonas = [
      zona("Chaco", { tipo: "provincia", centro: [-60.9, -26.073] }),
    ]
    expect(buscarSugerencias("chaco", zonas).sugerencias[0]?.camara).toEqual({
      centro: [-60.9, -26.073],
      zoom: ZOOM_LOCALIDAD,
    })
  })
})

describe("buscarSugerencias — coordinates", () => {
  it("short-circuits the gazetteer, so a pasted point is never ranked against names", () => {
    const hallado = buscarSugerencias("-33.8911, -60.5746", [zona("Pergamino")])
    expect(hallado.total).toBe(1)
    expect(hallado.sugerencias).toHaveLength(1)
    expect(hallado.sugerencias[0]?.titulo).toBe("33,8911° S · 60,5746° O")
    expect(hallado.sugerencias[0]?.camara).toEqual({
      centro: [-60.5746, -33.8911],
      zoom: ZOOM_PUNTO,
    })
  })

  it("works with an EMPTY gazetteer, before the asset has loaded and even if it never does", () => {
    const hallado = buscarSugerencias("-33.8911, -60.5746", [])
    expect(hallado.sugerencias).toHaveLength(1)
    expect(hallado.aviso).toBeNull()
  })

  it("says out loud when it read the pair the other way round", () => {
    const hallado = buscarSugerencias("-60.5746, -33.8911", [])
    expect(hallado.sugerencias[0]?.titulo).toBe("33,8911° S · 60,5746° O")
    expect(hallado.sugerencias[0]?.detalle).toBe("Las leímos al revés")
  })

  it("stays quiet about a reading it did not have to repair", () => {
    expect(
      buscarSugerencias("-33.8911, -60.5746", []).sugerencias[0]?.detalle
    ).toBe("Coordenadas")
  })

  it.each([
    ["40.7128, -74.0060", "fuera_de_argentina"],
    ["-33,8911, -60,5746", "ilegible"],
    ["https://maps.app.goo.gl/aBcDeFg", "link_corto"],
  ])("surfaces %j as the aviso %j, with no rows", (consulta, aviso) => {
    const hallado = buscarSugerencias(consulta, [zona("Pergamino")])
    expect(hallado.aviso).toBe(aviso)
    expect(hallado.sugerencias).toEqual([])
  })

  it("lets prose through to the name search instead of calling it a bad coordinate", () => {
    // "Ruta 9 km 180" carries two numbers; treating it as a failed coordinate
    // would put an error under a field that should simply have found nothing.
    expect(
      buscarSugerencias("Ruta 9 km 180", [zona("Pergamino")]).aviso
    ).toBeNull()
  })
})

describe("public/geo/zonas.json — the committed asset", () => {
  /*
   * The asset is read from disk rather than mocked, on purpose. These are the
   * only assertions in the suite that can catch a truncated download, a stale
   * regeneration or a decoder that drifted away from the file shipped beside it —
   * and they cost one readFileSync. Same posture as limites.test.ts.
   */
  const ruta = path.resolve(import.meta.dirname, "../../public/geo/zonas.json")
  const crudo = readFileSync(ruta, "utf8")
  const payload = JSON.parse(crudo) as ZonasCrudas

  const provincia = (nombre: string): FilaZona | undefined =>
    payload.provincias.find((fila) => fila[0] === nombre)

  it("stays inside the weight budget the build script enforces", () => {
    expect(Buffer.byteLength(crudo, "utf8")).toBeLessThan(400 * 1024)
  })

  it("declares the version this decoder reads", () => {
    expect(payload.version).toBe(ZONAS_VERSION)
  })

  it("satisfies the decoder that ships beside it", () => {
    expect(() => decodificarZonas(payload)).not.toThrow()
  })

  it("covers the same jurisdictions the boundary layers draw", () => {
    expect(payload.provincias).toHaveLength(24)
    expect(payload.departamentos).toHaveLength(528)
  })

  it("holds a floor of localities rather than an exact count", () => {
    /*
     * A floor, not an equality: Georef publishes new localities and an equality
     * would fail on every harmless upstream addition. 3.931 ship today, once the
     * 106 doubled entries collapse — a truncated page would land far below this.
     */
    expect(payload.localidades.length).toBeGreaterThan(3800)
  })

  it("puts every place inside Argentina, on the same envelope the parser uses", () => {
    for (const zona of decodificarZonas(payload)) {
      const [lon, lat] = zona.centro
      expect(lon).toBeGreaterThanOrEqual(ARGENTINA_BBOX.minLon)
      expect(lon).toBeLessThanOrEqual(ARGENTINA_BBOX.maxLon)
      expect(lat).toBeGreaterThanOrEqual(ARGENTINA_BBOX.minLat)
      expect(lat).toBeLessThanOrEqual(ARGENTINA_BBOX.maxLat)
      expect(zona.zoom).toBeGreaterThanOrEqual(5)
      expect(zona.zoom).toBeLessThanOrEqual(12)
    }
  })

  it.each([
    ["Ciudad Autónoma de Buenos Aires", 10.6],
    ["Chaco", 5.9],
    ["Santiago del Estero", 5.8],
    ["Córdoba", 5.6],
  ])("frames %s at zoom %s", (nombre, zoom) => {
    // Pinned so a change to zoomParaTramo fails here rather than quietly moving
    // where every search in the country lands.
    expect(provincia(nombre)?.[3]).toBe(zoom)
  })

  it("anchors Tierra del Fuego on the Isla Grande, not in the South Atlantic", () => {
    /*
     * The one place where the anchor-over-bbox-centre decision is visible in the
     * data: that province's bbox centre is (-63.16, -53.03), at sea, because the
     * layer was clipped to the continental envelope.
     */
    const tdf = payload.provincias.find((fila) =>
      fila[0].startsWith("Tierra del Fuego")
    )
    expect(tdf?.[1]).toBeCloseTo(-67.79, 1)
    expect(tdf?.[2]).toBeCloseTo(-54.36, 1)
  })

  it("gives every repeated department name its own province to be told apart by", () => {
    // «9 de Julio» is a department in five provinces. 47 names repeat in all, so
    // the subtitle is a correctness requirement and not an ornament.
    const repetido = payload.departamentos.filter(
      (fila) => fila[0] === "9 de Julio"
    )
    expect(repetido.length).toBeGreaterThan(1)
    expect(new Set(repetido.map((fila) => fila[4])).size).toBe(repetido.length)
  })

  it("does not repeat a place's own name inside its context", () => {
    // Pergamino is a locality, a department and nothing else: the row must read
    // «Pergamino · Buenos Aires», never «Pergamino · Pergamino, Buenos Aires».
    const pergamino = payload.localidades.find(
      (fila) => fila[0] === "Pergamino"
    )
    expect(pergamino?.[4]).toBe("Buenos Aires")
  })

  it("finds Pergamino first through the real gazetteer", () => {
    // No fixture can fake this: it exercises the ranking against all 4.483 rows.
    const zonas = decodificarZonas(payload)
    expect(buscarSugerencias("pergamino", zonas).sugerencias[0]?.titulo).toBe(
      "Pergamino"
    )
  })

  it("narrows a genuinely ambiguous name once the province is typed", () => {
    const zonas = decodificarZonas(payload)
    const ancho = buscarSugerencias("san jose", zonas)
    expect(ancho.total).toBeGreaterThan(7)
    const angosto = buscarSugerencias("san jose entre rios", zonas)
    expect(angosto.total).toBeLessThan(ancho.total)
  })

  it("stays sorted, so a regeneration produces a reviewable diff", () => {
    for (const capa of [
      payload.provincias,
      payload.departamentos,
      payload.localidades,
    ]) {
      const nombres = capa.map((fila) => fila[0])
      expect(nombres).toEqual(
        [...nombres].sort((a, b) => a.localeCompare(b, "es-AR"))
      )
    }
  })
})
