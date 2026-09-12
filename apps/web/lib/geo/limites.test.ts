import { readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { DEPARTAMENTOS_URL, LIMITES_URL } from "./limites"

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
