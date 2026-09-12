/**
 * Which paths proxy.ts lets through without a session.
 *
 * Two lists on purpose. "/" is matched whole because as a prefix it is every
 * path, which would silently disable the whole guard. The prefixes keep the
 * startsWith semantics the sign-in routes always had, plus the landing's own
 * static assets and its Open Graph image: a crawler or a signed-out visitor
 * answered with a redirect to /ingresar in place of an image gets nothing,
 * and gets it silently. The Open Graph route is a prefix, not an exact
 * match, because Next serves it with a build hash appended
 * (/opengraph-image-<hash>).
 *
 * The icons fail the same way and are the easiest to miss: the matcher below
 * excludes `favicon.ico` by name, but Next 16 emits the icon conventions as
 * routes of their own, so `/icon.png` went through the guard and the landing
 * answered a signed-out browser's icon request with a redirect to /ingresar.
 */
export const RUTAS_PUBLICAS_EXACTAS = ["/", "/robots.txt"] as const

export const PREFIJOS_PUBLICOS = [
  "/ingresar",
  "/crear-cuenta",
  "/landing/",
  "/opengraph-image",
  "/icon.png",
  "/apple-icon.png",
] as const

export function esRutaPublica(pathname: string): boolean {
  if ((RUTAS_PUBLICAS_EXACTAS as readonly string[]).includes(pathname)) {
    return true
  }
  return PREFIJOS_PUBLICOS.some((prefijo) => pathname.startsWith(prefijo))
}
