import type { MetadataRoute } from "next"

/**
 * Crawlers get the landing and nothing behind the session. The route itself
 * has to be public in lib/auth/rutas-publicas.ts, otherwise the proxy answers
 * robots.txt with a redirect to the sign-in page.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/lotes", "/api/"] }],
  }
}
