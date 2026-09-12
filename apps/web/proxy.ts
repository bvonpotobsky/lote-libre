import { NextResponse, type NextRequest } from "next/server"

/**
 * Keeps signed-out visitors out of the app shell.
 *
 * Next 16 renamed middleware to proxy; a file called middleware.ts would simply
 * never run, leaving every route open.
 *
 * The cookie is only ever read as a NEGATIVE signal. Its absence proves there
 * is no session; its presence proves nothing — a cookie can outlive the session
 * it points at. Treating presence as proof here, while the app layout checked
 * the real session, produced an infinite redirect: proxy bounced the visitor to
 * the app, the layout bounced them back to sign-in, forever.
 *
 * The positive check lives in the route groups, where it can read the actual
 * session, and authorization itself lives in the data layer.
 */
const PUBLIC_PATHS = ["/ingresar", "/crear-cuenta"]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  const maybeSignedIn =
    request.cookies.has("better-auth.session_token") ||
    request.cookies.has("__Secure-better-auth.session_token")

  if (maybeSignedIn) return NextResponse.next()

  const url = request.nextUrl.clone()
  url.pathname = "/ingresar"
  url.search = pathname === "/" ? "" : `?volver=${encodeURIComponent(pathname)}`
  return NextResponse.redirect(url)
}

/**
 * `maplibre` is excluded because it holds MapLibre's web worker, served from
 * public/. A worker script answered with a redirect to the sign-in page fails
 * to start, and the map then hangs with no error anywhere — the same silent
 * failure the worker URL itself causes. Static assets must not depend on a
 * session.
 */
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|maplibre).*)"],
}
