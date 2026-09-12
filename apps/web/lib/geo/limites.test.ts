import { readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  ANCLAS_DEPARTAMENTOS_URL,
  ANCLAS_LIMITES_URL,
  DEPARTAMENTOS_URL,
  GLIFOS_URL,
  LIMITES_URL,
  NOMBRES_CORTOS,
  TIPOGRAFIA_NOMBRES,
} from "./limites"

/**
 * Both boundary layers are static assets, not service calls: the files
 * committed under `public/` ARE the contract. These tests guard the four ways
 * that contract silently breaks — a raw IGN download gets committed by mistake,
 * a coordinate pair arrives flipped, a jurisdiction goes missing, or a
 * regeneration drops the fields the layers read.
 *
 * Sizes are the simplified figures plus headroom, not aspirations: provinces
 * ship at ~217 kB and departments at ~392 kB, against raw responses of 112 MB
 * and 141 MB. The budgets exist to make that difference a failing test rather
 * than a slow first paint nobody attributes to these files.
 */
const ASSETS = [
  {
    que: "provinces",
    url: LIMITES_URL,
    /** The 23 provinces plus the Ciudad Autónoma de Buenos Aires. */
    features: 24,
    presupuestoBytes: 400 * 1024,
    /** The three provinces this project is actually about. */
    contiene: ["Chaco", "Santiago del Estero", "Córdoba"],
  },
  {
    que: "departments",
    url: DEPARTAMENTOS_URL,
    /** 529 from the IGN, less `Antártida Argentina`, which the clip drops. */
    features: 528,
    presupuestoBytes: 600 * 1024,
    /** Pellegrini, Santiago del Estero — where the demo lote sits. */
    contiene: ["Pellegrini"],
  },
] as const

/** Argentina's continental envelope, with room to spare. Lon, then lat. */
const RANGO_LON = [-74, -53] as const
const RANGO_LAT = [-56, -21] as const

/** One past the last code point the committed fontstack can draw. */
const RANGO_GLIFOS = 256

describe.each(ASSETS)("$que boundary asset", ({ url, features, presupuestoBytes, contiene }) => {
  const ruta = join(process.cwd(), "public", url)
  const bytes = statSync(ruta).size
  const geojson = JSON.parse(readFileSync(ruta, "utf8")) as GeoJSON.FeatureCollection

  it("stays inside its size budget", () => {
    expect(bytes).toBeLessThan(presupuestoBytes)
  })

  it("carries every jurisdiction, each with a name", () => {
    expect(geojson.features).toHaveLength(features)
    for (const feature of geojson.features) {
      expect(typeof feature.properties?.nombre).toBe("string")
      expect(feature.properties?.nombre).not.toBe("")
    }
  })

  it("names the ones this project is actually about", () => {
    const nombres = geojson.features.map((f) => f.properties?.nombre)
    expect(nombres).toEqual(expect.arrayContaining([...contiene]))
  })

  /**
   * Only the 0-255 glyph range ships, so a name reaching outside Latin-1 draws
   * as an empty box — no console error, no failed request, nothing to notice.
   * Uppercased too, because the province layer sets its labels in caps.
   */
  it("keeps every name inside the glyph range that ships", () => {
    for (const feature of geojson.features) {
      const nombre = String(feature.properties?.nombre)
      for (const caracter of nombre + nombre.toUpperCase()) {
        expect(
          caracter.codePointAt(0),
          `"${caracter}" in "${nombre}" falls outside the 0-${RANGO_GLIFOS - 1} range`,
        ).toBeLessThan(RANGO_GLIFOS)
      }
    }
  })

  it("stores coordinates as lon,lat — not lat,lon", () => {
    // A flipped file still parses and still draws; it just draws in China.
    // Checking the envelope is the only way that surfaces as a failure here.
    const numeros = JSON.stringify(
      geojson.features.map((f) => f.geometry),
    ).match(/-?\d+\.?\d*/g)
    expect(numeros).not.toBeNull()

    for (let i = 0; i < numeros!.length; i += 2) {
      const lon = Number(numeros![i])
      const lat = Number(numeros![i + 1])
      expect(lon).toBeGreaterThanOrEqual(RANGO_LON[0])
      expect(lon).toBeLessThanOrEqual(RANGO_LON[1])
      expect(lat).toBeGreaterThanOrEqual(RANGO_LAT[0])
      expect(lat).toBeLessThanOrEqual(RANGO_LAT[1])
    }
  })
})

describe("department codes", () => {
  const ruta = join(process.cwd(), "public", DEPARTAMENTOS_URL)
  const geojson = JSON.parse(readFileSync(ruta, "utf8")) as GeoJSON.FeatureCollection

  /**
   * `codigo` is the INDEC department code, and the reason departments carry a
   * field at all: its first two digits are the province, which is what a legality
   * dossier needs to state where a lote sits. A regeneration that drops the
   * field would leave the layer drawing correctly and the data gone.
   */
  it("is a five-digit INDEC code on every department", () => {
    for (const feature of geojson.features) {
      expect(String(feature.properties?.codigo)).toMatch(/^\d{5}$/)
    }
  })

  it("puts the demo lote's department in Santiago del Estero", () => {
    const pellegrini = geojson.features.find(
      (f) => f.properties?.nombre === "Pellegrini" && f.properties?.codigo === "86133",
    )
    expect(pellegrini).toBeDefined()
  })
})

describe.each([
  { que: "provinces", poligonos: LIMITES_URL, anclas: ANCLAS_LIMITES_URL },
  {
    que: "departments",
    poligonos: DEPARTAMENTOS_URL,
    anclas: ANCLAS_DEPARTAMENTOS_URL,
  },
])("$que label anchors", ({ poligonos, anclas }) => {
  /**
   * The anchors are derived from the polygons, so the two files go stale
   * independently: regenerate one after an IGN update and the labels keep
   * pointing at last year's jurisdictions, with nothing on screen to say so.
   *
   * One point per feature is the whole reason this file exists — MapLibre
   * anchors per polygon, and a MultiPolygon would print its name once per ring.
   */
  const leer = (url: string) =>
    JSON.parse(
      readFileSync(join(process.cwd(), "public", url), "utf8"),
    ) as GeoJSON.FeatureCollection

  const origen = leer(poligonos)
  const puntos = leer(anclas)

  it("carries exactly one point per jurisdiction", () => {
    expect(puntos.features).toHaveLength(origen.features.length)
    for (const feature of puntos.features) {
      expect(feature.geometry.type).toBe("Point")
    }
  })

  it("names the same jurisdictions as the polygons it came from", () => {
    const nombreDe = (c: GeoJSON.FeatureCollection) =>
      c.features.map((f) => String(f.properties?.nombre)).sort()
    expect(nombreDe(puntos)).toEqual(nombreDe(origen))
  })

  it("puts every anchor inside the continental envelope", () => {
    for (const feature of puntos.features) {
      const [lon, lat] = (feature.geometry as GeoJSON.Point).coordinates
      expect(lon).toBeGreaterThanOrEqual(RANGO_LON[0])
      expect(lon).toBeLessThanOrEqual(RANGO_LON[1])
      expect(lat).toBeGreaterThanOrEqual(RANGO_LAT[0])
      expect(lat).toBeLessThanOrEqual(RANGO_LAT[1])
    }
  })
})

describe("the committed fontstack", () => {
  /**
   * The font is an asset like the GeoJSONs, and fails like them: MapLibre
   * fetches glyphs from the worker, so a missing or truncated file leaves the
   * map with no labels at all and nothing in the console to say why.
   *
   * The budget is the one shipped range plus headroom. It doubles as a guard
   * against committing the other 255 ranges `build-glyphs` emits, which would
   * be 1.2 MB for characters no name on this map uses.
   */
  const ruta = join(
    process.cwd(),
    "public",
    GLIFOS_URL.replace("{fontstack}", TIPOGRAFIA_NOMBRES).replace(
      "{range}",
      `0-${RANGO_GLIFOS - 1}`,
    ),
  )

  it("ships the range the labels need", () => {
    const pbf = readFileSync(ruta)
    /*
     * Byte 0 is protobuf field 1, wire type 2 — the `fontstacks` message. A
     * size check alone would pass on the sign-in HTML the proxy serves if `geo`
     * ever falls out of its matcher, which is this asset's real failure mode.
     */
    expect(pbf[0]).toBe(0x0a)
    expect(pbf.byteLength).toBeGreaterThan(20 * 1024)
    expect(pbf.byteLength).toBeLessThan(120 * 1024)
  })
})

describe("shortened display names", () => {
  /**
   * The layers rewrite a couple of names on screen. If IGN renames one, the
   * `match` stops firing and the long string comes back silently — which for
   * Tierra del Fuego means labelling the map with territory the clipped asset
   * does not draw.
   */
  const nombres = [LIMITES_URL, DEPARTAMENTOS_URL].flatMap((url) => {
    const geojson = JSON.parse(
      readFileSync(join(process.cwd(), "public", url), "utf8"),
    ) as GeoJSON.FeatureCollection
    return geojson.features.map((f) => String(f.properties?.nombre))
  })

  it.each(Object.keys(NOMBRES_CORTOS))("still matches %s in the asset", (largo) => {
    expect(nombres).toContain(largo)
  })

  it("only ever shortens a name", () => {
    for (const [largo, corto] of Object.entries(NOMBRES_CORTOS)) {
      expect(corto.length).toBeLessThan(largo.length)
    }
  })
})
