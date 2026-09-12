import { describe, expect, it } from "vitest"

import { escribirCoordenadas, interpretarCoordenadas } from "./coordenadas"

/**
 * Pergamino, and the canonical pair this suite reads back in every format.
 * Chosen because its locality, its partido and its province share a name, so it
 * also doubles as the fixture the gazetteer tests lean on.
 */
const LAT = -33.8911
const LON = -60.5746

describe("interpretarCoordenadas — what it refuses", () => {
  /*
   * The refusals come first on purpose. This parser sits in front of a name
   * search, so its main job is NOT to fire: every false positive steals a
   * query that should have reached the gazetteer. Written accept-first, the
   * guard gets bolted on afterwards and always leaks.
   */
  it.each([
    ["", "empty"],
    ["   ", "blank"],
    ["pergamino", "a plain name"],
    ["San José", "a name with an accent"],
    // Two numbers, and the case that would hijack the name search outright.
    ["Ruta 9 km 180", "a rural road reference"],
    ["Villa 25 de Mayo", "a name that carries a number"],
    ["Colonia 17 de Agosto", "another numbered name"],
  ])("%j is prose, not a coordinate (%s)", (texto) => {
    expect(interpretarCoordenadas(texto)).toEqual({
      ok: false,
      motivo: "sin_formato",
    })
  })

  it.each([
    ["-33.8911", "one number is not a pair"],
    ["-33.8911 -60.5746 -12", "three numbers are not a pair"],
    ["-33.8911 -60.5746 -12.5 4", "four bare numbers"],
  ])(
    "%j has no coordinate signal, so a wrong count falls through to the name search (%s)",
    (texto) => {
      expect(interpretarCoordenadas(texto)).toEqual({
        ok: false,
        motivo: "sin_formato",
      })
    }
  )

  it("refuses a shortened Google link, which carries no coordinates at all", () => {
    expect(interpretarCoordenadas("https://maps.app.goo.gl/aBcDeFg")).toEqual({
      ok: false,
      motivo: "link_corto",
    })
  })

  it("falls through on a mapping site we do not claim to understand", () => {
    // Pretending to parse every mapping host is worse than letting the text
    // reach the gazetteer, where it simply finds nothing.
    expect(
      interpretarCoordenadas(
        "https://www.openstreetmap.org/#map=15/-33.89/-60.57"
      )
    ).toEqual({ ok: false, motivo: "sin_formato" })
  })
})

describe("interpretarCoordenadas — decimal pairs", () => {
  it.each([
    "-33.8911 -60.5746",
    "-33.8911, -60.5746",
    "-33.8911,-60.5746",
    "-33.8911;-60.5746",
    "  -33.8911 ,  -60.5746  ",
    "-33.8911\t-60.5746",
  ])(
    "%j reads as the same point whatever separates the two numbers",
    (texto) => {
      expect(interpretarCoordenadas(texto)).toEqual({
        ok: true,
        lat: LAT,
        lon: LON,
        corregido: false,
      })
    }
  )

  it("reads es-AR decimal commas when no period could be the decimal mark", () => {
    expect(interpretarCoordenadas("-33,8911 -60,5746")).toEqual({
      ok: true,
      lat: LAT,
      lon: LON,
      corregido: false,
    })
  })

  it("reads es-AR decimal commas separated by a semicolon", () => {
    expect(interpretarCoordenadas("-33,8911; -60,5746")).toEqual({
      ok: true,
      lat: LAT,
      lon: LON,
      corregido: false,
    })
  })

  it("refuses a comma asked to be both the decimal mark and the separator", () => {
    /*
     * "-33,8911, -60,5746" is genuinely undecidable: a comma cannot carry both
     * jobs in one string. Guessing here would silently move the producer a
     * degree away, so this is the one case that earns an error message.
     */
    expect(interpretarCoordenadas("-33,8911, -60,5746")).toEqual({
      ok: false,
      motivo: "ilegible",
    })
  })

  it("still reads integers separated by a comma, where no ambiguity exists", () => {
    expect(interpretarCoordenadas("-33,-60")).toEqual({
      ok: true,
      lat: -33,
      lon: -60,
      corregido: false,
    })
  })
})

describe("interpretarCoordenadas — hemisphere letters", () => {
  it.each([
    "33.8911 S 60.5746 O",
    "33.8911S 60.5746O",
    "33.8911° S, 60.5746° O",
    "33.8911 S, 60.5746 W",
    "S 33.8911 O 60.5746",
    "33.8911s 60.5746o",
  ])("%j resolves to the southern-western reading", (texto) => {
    expect(interpretarCoordenadas(texto)).toEqual({
      ok: true,
      lat: LAT,
      lon: LON,
      corregido: false,
    })
  })

  it("lets the letters name the axes, so longitude may be written first", () => {
    expect(interpretarCoordenadas("O 60.5746 S 33.8911")).toEqual({
      ok: true,
      lat: LAT,
      lon: LON,
      corregido: false,
    })
  })

  it("treats a redundant minus sign beside an S as one negation, not two", () => {
    expect(interpretarCoordenadas("-33.8911 S -60.5746 O")).toEqual({
      ok: true,
      lat: LAT,
      lon: LON,
      corregido: false,
    })
  })

  it("refuses an N that is plainly a typo of S rather than quietly fixing it", () => {
    /*
     * The letter is an explicit claim about the hemisphere. Flipping it would
     * be inventing data, so a northern latitude is reported as what it is.
     */
    const leido = interpretarCoordenadas("33.8911 N 60.5746 O")
    expect(leido).toEqual({
      ok: false,
      motivo: "fuera_de_argentina",
      lat: 33.8911,
      lon: LON,
    })
  })

  it("never attempts a swap once the letters have named the axes", () => {
    // Written as (lat S, lon E): the E is a claim, so the pair is refused
    // rather than transposed into something that would land in Argentina.
    expect(interpretarCoordenadas("-33.8911 S, 60.5746 E")).toEqual({
      ok: false,
      motivo: "fuera_de_argentina",
      lat: LAT,
      lon: 60.5746,
    })
  })
})

describe("interpretarCoordenadas — degrees, minutes, seconds", () => {
  const esperado = (texto: string) => {
    const leido = interpretarCoordenadas(texto)
    expect(leido.ok).toBe(true)
    if (!leido.ok) return
    expect(leido.lat).toBeCloseTo(-33.89111, 4)
    expect(leido.lon).toBeCloseTo(-60.57444, 4)
  }

  it.each([
    `33°53'28"S 60°34'28"O`,
    `33° 53' 28" S  60° 34' 28" O`,
    `33°53’28”S 60°34’28”O`,
    `33°53′28″S 60°34′28″O`,
  ])("%j reads as the same point across quote styles", (texto) => {
    esperado(texto)
  })

  it("reads degrees with decimal minutes, the form a handheld GPS shows", () => {
    const leido = interpretarCoordenadas(`33°53.4667'S 60°34.4667'O`)
    expect(leido.ok).toBe(true)
    if (!leido.ok) return
    expect(leido.lat).toBeCloseTo(-33.89111, 4)
    expect(leido.lon).toBeCloseTo(-60.57444, 4)
  })

  it("refuses three bare numbers as DMS, because nothing marks the units", () => {
    /*
     * A producer holding DMS data has the degree sign; without a marker these
     * six numbers could be anything, and reading them as DMS would be a guess.
     * The hemisphere letters are what make this an attempt rather than prose.
     */
    expect(interpretarCoordenadas("33 53 28 S 60 34 28 O")).toEqual({
      ok: false,
      motivo: "ilegible",
    })
  })

  it("negates an unlettered DMS pair without calling it a correction", () => {
    // Argentina sits wholly in the south-west quadrant, so the sign is an
    // inference the read-back shows in full — not a transposition.
    const leido = interpretarCoordenadas(`33°53'28" 60°34'28"`)
    expect(leido.ok).toBe(true)
    if (!leido.ok) return
    expect(leido.lat).toBeCloseTo(-33.89111, 4)
    expect(leido.lon).toBeCloseTo(-60.57444, 4)
    expect(leido.corregido).toBe(false)
  })
})

describe("interpretarCoordenadas — the swap, and the envelope", () => {
  it("transposes a GIS-ordered pair and says so", () => {
    expect(interpretarCoordenadas("-60.5746 -33.8911")).toEqual({
      ok: true,
      lat: LAT,
      lon: LON,
      corregido: true,
    })
  })

  it("reads an ambiguous far-southern pair as latitude first, by policy", () => {
    /*
     * The two ranges overlap between -55.2 and -53.6, so this pair is valid
     * read either way and no detector can decide it. (lat, lon) wins because
     * that is the order every consumer tool prints, and the read-back in the
     * suggestion row is what lets the producer catch a wrong guess.
     */
    expect(interpretarCoordenadas("-54.5 -55.2")).toEqual({
      ok: true,
      lat: -54.5,
      lon: -55.2,
      corregido: false,
    })
  })

  it("negates an unsigned pair, since the whole country is south and west", () => {
    expect(interpretarCoordenadas("33.8911 60.5746")).toEqual({
      ok: true,
      lat: LAT,
      lon: LON,
      corregido: false,
    })
  })

  it("reports a point elsewhere on earth, carrying the numbers it read", () => {
    // New York. The copy prints these back, which is why they ride along.
    expect(interpretarCoordenadas("40.7128 -74.0060")).toEqual({
      ok: false,
      motivo: "fuera_de_argentina",
      lat: 40.7128,
      lon: -74.006,
    })
  })

  it("calls an impossible latitude illegible, not merely foreign", () => {
    // 95 is not a latitude at all, so this is a typing failure rather than a
    // place on the other side of the world.
    expect(interpretarCoordenadas("95 -60")).toEqual({
      ok: false,
      motivo: "ilegible",
    })
  })

  it("calls an impossible longitude illegible too", () => {
    expect(interpretarCoordenadas("-33.8911 -200.4")).toEqual({
      ok: false,
      motivo: "ilegible",
    })
  })

  it("never reports a point outside the envelope as a place to fly to", () => {
    const leido = interpretarCoordenadas("0 0")
    expect(leido.ok).toBe(false)
  })
})

describe("interpretarCoordenadas — URLs", () => {
  it.each([
    ["https://www.google.com/maps/@-33.8911,-60.5746,15z", "an @ pair"],
    [
      "https://www.google.com/maps/place/Pergamino/@-33.8911,-60.5746,13z/data=!3m1",
      "a place URL",
    ],
    ["https://maps.google.com/?q=-33.8911,-60.5746", "a q parameter"],
    ["https://maps.google.com/?ll=-33.8911,-60.5746&z=15", "an ll parameter"],
    [
      "https://www.google.com/maps/place/X/data=!3m1!4b1!3d-33.8911!4d-60.5746",
      "a !3d/!4d pair with no @",
    ],
  ])("pulls the pair out of %j (%s)", (texto) => {
    expect(interpretarCoordenadas(texto)).toEqual({
      ok: true,
      lat: LAT,
      lon: LON,
      corregido: false,
    })
  })
})

describe("escribirCoordenadas", () => {
  it("writes es-AR decimals with O for oeste, never W", () => {
    expect(escribirCoordenadas(LAT, LON)).toBe("33,8911° S · 60,5746° O")
  })

  it("is total, so a northern-eastern pair still reads back", () => {
    expect(escribirCoordenadas(40.7128, -74.006)).toBe("40,7128° N · 74,006° O")
  })

  it("drops trailing zeros, because 27,5000 reads like false precision", () => {
    expect(escribirCoordenadas(-27.5, -63.5)).toBe("27,5° S · 63,5° O")
  })

  it("drops the decimal mark entirely on a whole degree", () => {
    expect(escribirCoordenadas(-27, -63)).toBe("27° S · 63° O")
  })
})
