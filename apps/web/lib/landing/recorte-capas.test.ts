import type { Feature, FeatureCollection, Polygon } from "geojson"
import { describe, expect, it } from "vitest"

import { MARCO, VISTA } from "./proyeccion"
import { recortarYProyectar } from "./recorte-capas"

const [minLon, minLat, maxLon, maxLat] = MARCO

function cuadro(
  lon0: number,
  lat0: number,
  lon1: number,
  lat1: number,
  props: Record<string, unknown> = {}
): Feature<Polygon> {
  return {
    type: "Feature",
    properties: props,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [lon0, lat0],
          [lon1, lat0],
          [lon1, lat1],
          [lon0, lat1],
          [lon0, lat0],
        ],
      ],
    },
  }
}

function coleccion(features: Feature[]): FeatureCollection {
  return { type: "FeatureCollection", features }
}

const porCategoria = (p: Record<string, unknown>) =>
  typeof p.categoria === "string" ? p.categoria : null

// A 0.01° square is roughly 1 km × 1.1 km here: far above the 0.5 ha floor.
const dentro = cuadro(-64.0, -25.86, -63.99, -25.85, { categoria: "amarillo" })

describe("recortarYProyectar", () => {
  it("skips a feature with a null geometry instead of throwing", () => {
    const nula = {
      type: "Feature",
      properties: { categoria: "rojo" },
      geometry: null,
    } as unknown as Feature
    const capas = recortarYProyectar(coleccion([nula, dentro]), MARCO, VISTA, {
      clave: porCategoria,
    })
    expect(capas.map((c) => c.clave)).toEqual(["amarillo"])
  })

  it("drops a polygon entirely outside the frame", () => {
    const fuera = cuadro(-63.5, -25.5, -63.4, -25.4, { categoria: "verde" })
    const capas = recortarYProyectar(coleccion([fuera]), MARCO, VISTA, {
      clave: porCategoria,
    })
    expect(capas).toEqual([])
  })

  it("clips a polygon straddling the edge to the frame", () => {
    const cruza = cuadro(
      maxLon - 0.02,
      maxLat - 0.02,
      maxLon + 0.05,
      maxLat + 0.05,
      {
        categoria: "rojo",
      }
    )
    const [capa] = recortarYProyectar(coleccion([cruza]), MARCO, VISTA, {
      clave: porCategoria,
    })
    expect(capa).toBeDefined()
    const numeros = capa!.d.match(/-?\d+(\.\d+)?/g)!.map(Number)
    for (let i = 0; i < numeros.length; i += 2) {
      expect(numeros[i]).toBeGreaterThanOrEqual(0)
      expect(numeros[i]).toBeLessThanOrEqual(VISTA.ancho)
      expect(numeros[i + 1]).toBeGreaterThanOrEqual(0)
      expect(numeros[i + 1]).toBeLessThanOrEqual(VISTA.alto)
    }
  })

  it("drops what is left below the area floor: bboxClip slivers", () => {
    // 0.00005° wide (~5 m) and 0.01° tall: about 5 500 m² of a 1 km strip,
    // then the floor is raised above it.
    const sliver = cuadro(-64.0, -25.86, -63.99995, -25.85, {
      categoria: "verde",
    })
    const capas = recortarYProyectar(
      coleccion([sliver, dentro]),
      MARCO,
      VISTA,
      {
        clave: porCategoria,
        areaMinimaM2: 20_000,
      }
    )
    expect(capas.map((c) => c.clave)).toEqual(["amarillo"])
  })

  it("ignores features the key function rejects", () => {
    const sinClave = cuadro(-64.0, -25.86, -63.99, -25.85, {})
    const capas = recortarYProyectar(
      coleccion([sinClave, dentro]),
      MARCO,
      VISTA,
      {
        clave: porCategoria,
      }
    )
    expect(capas).toHaveLength(1)
  })

  it("merges same-key features into one path and counts the rings", () => {
    const otro = cuadro(-63.98, -25.84, -63.97, -25.83, {
      categoria: "amarillo",
    })
    const [capa] = recortarYProyectar(coleccion([dentro, otro]), MARCO, VISTA, {
      clave: porCategoria,
    })
    expect(capa!.anillos).toBe(2)
    expect(capa!.d.match(/M/g)).toHaveLength(2)
    expect(capa!.d.match(/Z/g)).toHaveLength(2)
    expect(capa!.areaM2).toBeGreaterThan(1_000_000)
  })

  it("sorts the output by key so the generated module is stable", () => {
    const rojo = cuadro(-63.98, -25.84, -63.97, -25.83, { categoria: "rojo" })
    const verde = cuadro(-64.03, -25.88, -64.02, -25.87, { categoria: "verde" })
    const capas = recortarYProyectar(
      coleccion([rojo, dentro, verde]),
      MARCO,
      VISTA,
      {
        clave: porCategoria,
      }
    )
    expect(capas.map((c) => c.clave)).toEqual(["amarillo", "rojo", "verde"])
  })

  it("rounds to the requested decimals", () => {
    const [uno] = recortarYProyectar(coleccion([dentro]), MARCO, VISTA, {
      clave: porCategoria,
      decimales: 1,
    })
    const [tres] = recortarYProyectar(coleccion([dentro]), MARCO, VISTA, {
      clave: porCategoria,
      decimales: 3,
    })
    expect(uno!.d).toMatch(/^M\d+\.\d /)
    expect(tres!.d).toMatch(/^M\d+\.\d{3} /)
  })

  it("is byte-stable across two runs", () => {
    const fc = coleccion([
      cuadro(-63.98, -25.84, -63.97, -25.83, { categoria: "rojo" }),
      dentro,
    ])
    const a = JSON.stringify(
      recortarYProyectar(fc, MARCO, VISTA, {
        clave: porCategoria,
        tolerancia: 0.0001,
      })
    )
    const b = JSON.stringify(
      recortarYProyectar(fc, MARCO, VISTA, {
        clave: porCategoria,
        tolerancia: 0.0001,
      })
    )
    expect(a).toBe(b)
  })

  it("keeps coordinates inside the frame after simplification", () => {
    const cruza = cuadro(
      minLon - 0.05,
      minLat - 0.05,
      minLon + 0.02,
      minLat + 0.02,
      {
        categoria: "rojo",
      }
    )
    const [capa] = recortarYProyectar(coleccion([cruza]), MARCO, VISTA, {
      clave: porCategoria,
      tolerancia: 0.0002,
    })
    const numeros = capa!.d.match(/-?\d+(\.\d+)?/g)!.map(Number)
    for (let i = 0; i < numeros.length; i += 2) {
      expect(numeros[i]).toBeGreaterThanOrEqual(0)
      expect(numeros[i + 1]).toBeLessThanOrEqual(VISTA.alto)
    }
  })
})
