import { describe, expect, it } from "vitest"

import {
  PREFIJOS_PUBLICOS,
  RUTAS_PUBLICAS_EXACTAS,
  esRutaPublica,
} from "./rutas-publicas"

describe("esRutaPublica", () => {
  it.each([
    ["/", true],
    ["/lotes", false],
    ["/lotes/abc", false],
    ["/ingresar", true],
    ["/ingresar/x", true],
    ["/crear-cuenta", true],
    // Documents today's startsWith behaviour rather than discovering it later.
    ["/ingresar-falso", true],
    ["/landing/hero.jpg", true],
    ["/landingx", false],
    ["/opengraph-image", true],
    // Next 16 serves the metadata route with a build hash appended.
    ["/opengraph-image-pwu6ef", true],
    ["/opengraph-imagery", true],
    // The browser asks for the icons before anyone has a session, and a
    // redirect in place of an image leaves the tab with no mark at all.
    ["/icon.png", true],
    ["/apple-icon.png", true],
    ["/iconos-de-lotes", false],
    ["/robots.txt", true],
    ["/robots.txt/x", false],
    ["", false],
  ])("%j → %s", (pathname, expected) => {
    expect(esRutaPublica(pathname)).toBe(expected)
  })

  it("never treats the root as a prefix: startsWith('/') is every path", () => {
    expect(RUTAS_PUBLICAS_EXACTAS).toContain("/")
    expect(PREFIJOS_PUBLICOS).not.toContain("/")
  })
})
