import { describe, expect, it } from "vitest"

import { marcoABbox, metricAspect } from "@/lib/geo/raster"
import { ANILLO_LOTE, MARCO, VISTA, aPixel } from "./proyeccion"

/* The projection itself is covered in lib/geo/proyeccion.test.ts. What is
   landing-specific, and what breaks silently if it drifts, is whether these two
   constants still describe the same window. */

describe("MARCO against VISTA", () => {
  it("matches the viewBox aspect, so the raster and the vectors register", () => {
    const esperada = VISTA.ancho / VISTA.alto
    expect(Math.abs(metricAspect(marcoABbox(MARCO)) - esperada)).toBeLessThan(1e-3)
  })
})

describe("ANILLO_LOTE against MARCO", () => {
  it("places the seed lote centred in the frame", () => {
    const esquinas = ANILLO_LOTE.slice(0, 4).map((p) => aPixel(MARCO, VISTA, p))
    const esperadas = [
      [569.4, 691.3],
      [870.6, 691.3],
      [870.6, 388.6],
      [569.4, 388.6],
    ]
    esquinas.forEach(([x, y], i) => {
      expect(Math.abs(x! - esperadas[i]![0]!)).toBeLessThan(0.2)
      expect(Math.abs(y! - esperadas[i]![1]!)).toBeLessThan(0.2)
    })

    const xs = esquinas.map(([x]) => x!)
    const ys = esquinas.map(([, y]) => y!)
    expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(VISTA.ancho / 2, 0)
    expect((Math.min(...ys) + Math.max(...ys)) / 2).toBeCloseTo(VISTA.alto / 2, 0)
  })
})
