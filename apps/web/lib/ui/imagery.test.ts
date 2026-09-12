import { describe, expect, it } from "vitest"

import {
  HOLES_NOTE,
  LAYER_LEGEND,
  SEASONAL_NOTE,
  cloudLine,
  clearLine,
  otherLayer,
  referenceChip,
  toggleLabel,
} from "./imagery"

describe("clearLine", () => {
  it("says so plainly when the whole lote came through clean", () => {
    expect(clearLine(1)).toBe("Sin nubes sobre el lote en esta ventana.")
    expect(clearLine(0.99)).toBe("Sin nubes sobre el lote en esta ventana.")
  })

  it("reports the share of the lote that was seen", () => {
    expect(clearLine(0.96)).toBe("Imagen limpia en el 96 % del lote.")
    expect(clearLine(0.4)).toBe("Imagen limpia en el 40 % del lote.")
  })

  it("stays quiet when nothing measured it", () => {
    expect(clearLine(null)).toBeNull()
  })
})

describe("cloudLine", () => {
  it("names where the number comes from", () => {
    // The old copy read "2,4 % de nubes" flat, which invited reading it as a
    // property of the image. It is surface weather at the centroid.
    const line = cloudLine(2.4)

    expect(line).toContain("meteorológica")
    expect(line).toBe(
      "Ventana elegida por nubosidad meteorológica media de 2,4 %.",
    )
  })

  it("never renders as a bare cloud percentage", () => {
    expect(cloudLine(14.2)).not.toMatch(/^\d/)
  })

  it("stays quiet when Xweather gave nothing", () => {
    expect(cloudLine(null)).toBeNull()
  })
})

describe("LAYER_LEGEND", () => {
  it("describes true colour without mentioning the index", () => {
    expect(LAYER_LEGEND.trueColor).not.toMatch(/NDVI/i)
    expect(LAYER_LEGEND.trueColor).toMatch(/textura/i)
  })

  it("describes NDVI as the index it is", () => {
    expect(LAYER_LEGEND.ndvi).toMatch(/NDVI/)
  })

  it("no longer promises yellow and red mean bare ground", () => {
    // The ramp dropped both; copy that still named them would mislabel the
    // image the reader is looking at.
    for (const legend of Object.values(LAYER_LEGEND)) {
      // Word boundaries on purpose: "rastrojo" is a legitimate word that
      // contains "rojo".
      expect(legend).not.toMatch(/\b(amarillos?|rojos?)\b/i)
    }
  })
})

describe("toggleLabel", () => {
  it("offers the layer the reader is not looking at", () => {
    expect(toggleLabel("trueColor")).toBe("Ver el índice de vegetación")
    expect(toggleLabel("ndvi")).toBe("Ver el color real")
  })
})

describe("otherLayer", () => {
  it("flips between the two layers", () => {
    expect(otherLayer("trueColor")).toBe("ndvi")
    expect(otherLayer("ndvi")).toBe("trueColor")
  })
})

describe("referenceChip", () => {
  it("reads the year off the window instead of assuming it", () => {
    expect(referenceChip("2020-08-15")).toBe("2020")
    expect(referenceChip("2020-12-31")).toBe("2020")
  })
})

describe("the standing notes", () => {
  it("tells the reader the seasons now match", () => {
    // The old note apologised for a seasonal gap that the mirrored window
    // closed. Leaving it would be a lie in the other direction.
    expect(SEASONAL_NOTE).toMatch(/misma época del año/)
    expect(SEASONAL_NOTE).toMatch(/capas oficiales/)
  })

  it("explains that a hole is missing image, not bare ground", () => {
    expect(HOLES_NOTE).toMatch(/no son suelo/i)
  })
})
