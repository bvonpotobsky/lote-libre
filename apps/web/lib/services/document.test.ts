import { describe, expect, it } from "vitest"

import type { Lote, LoteVerification } from "@/lib/db/schema"
import { buildPayload, canonicalJson, hashPayload } from "./document"

const LOTE = {
  id: "lote1",
  userId: "u1",
  nombre: "Pellegrini Norte",
  provincia: "santiago-del-estero",
  renspa: "01.234.5.67890/AB",
  geometry: { type: "Polygon", coordinates: [] },
  geometryHash: "a".repeat(64),
  areaHa: 501.02,
  centroidLon: -63.98953,
  centroidLat: -25.85153,
  bboxMinLon: -64.00069,
  bboxMinLat: -25.86162,
  bboxMaxLon: -63.97838,
  bboxMaxLat: -25.84144,
  source: "draw",
  createdAt: new Date("2026-09-11T12:00:00Z"),
  updatedAt: new Date("2026-09-11T12:00:00Z"),
} as unknown as Lote

const VERIFICATION = {
  id: "ver1",
  loteId: "lote1",
  userId: "u1",
  status: "ready",
  verdict: "rojo",
  forestLossPct: 98.71,
  forestLossHa: 494.56,
  forestLossFirstYear: 2023,
  otbnCategory: "rojo",
  otbnPct: 100,
  sources: [
    {
      id: "umsef",
      label: "UMSEF",
      vintage: "2023",
      consultedAt: "2026-09-11T12:00:00.000Z",
    },
  ],
  reasons: ["FOREST_LOSS_AFTER_CUTOFF"],
  failureCode: null,
  documentHash: null,
  documentPayload: null,
  createdAt: new Date("2026-09-11T12:00:00Z"),
} as unknown as LoteVerification

const PRODUCTOR = { nombre: "Ana Productora", email: "ana@campo.test" }
const EMITIDO = new Date("2026-09-11T15:00:00Z")

const payload = () =>
  buildPayload({
    lote: LOTE,
    verification: VERIFICATION,
    productor: PRODUCTOR,
    imagenes: [],
    emitidoEl: EMITIDO,
  })

describe("canonicalJson", () => {
  it("sorts keys at every depth", () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: 3 } })).toBe(
      '{"a":{"c":3,"d":2},"b":1}',
    )
  })

  it("preserves array order, which is meaningful", () => {
    expect(canonicalJson({ xs: [3, 1, 2] })).toBe('{"xs":[3,1,2]}')
  })
})

describe("hashPayload", () => {
  it("is a sha256 hex digest", () => {
    expect(hashPayload(payload())).toMatch(/^[0-9a-f]{64}$/)
  })

  it("is reproducible: the same content always hashes the same", () => {
    expect(hashPayload(payload())).toBe(hashPayload(payload()))
  })

  it("does not depend on the order fields were assigned", () => {
    const original = payload()
    const shuffled = JSON.parse(
      JSON.stringify(
        Object.fromEntries(Object.entries(original).reverse()),
      ),
    ) as typeof original

    expect(hashPayload(shuffled)).toBe(hashPayload(original))
  })

  it("changes when the verdict changes", () => {
    const altered = payload()
    altered.verificacion.veredicto = "verde"
    expect(hashPayload(altered)).not.toBe(hashPayload(payload()))
  })

  it("changes when the overlap percentage changes", () => {
    const altered = payload()
    altered.verificacion.perdidaForestal.porcentajeSuperficie = 0
    expect(hashPayload(altered)).not.toBe(hashPayload(payload()))
  })

  it("changes when a source's consultation date changes", () => {
    const altered = payload()
    altered.fuentes[0]!.consultedAt = "2020-01-01T00:00:00.000Z"
    expect(hashPayload(altered)).not.toBe(hashPayload(payload()))
  })
})

describe("buildPayload", () => {
  it("carries everything the document has to assert", () => {
    const result = payload()
    expect(result.lote.superficieHa).toBe(501.02)
    expect(result.lote.renspa).toBe("01.234.5.67890/AB")
    expect(result.lote.centroide).toEqual({ lon: -63.98953, lat: -25.85153 })
    expect(result.verificacion.perdidaForestal.fechaDeCorte).toBe("2020-12-31")
    expect(result.verificacion.motivos[0]?.codigo).toBe(
      "FOREST_LOSS_AFTER_CUTOFF",
    )
    expect(result.verificacion.motivos[0]?.texto).toContain("31/12/2020")
    expect(result.fuentes).toHaveLength(1)
  })
})
