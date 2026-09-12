/**
 * Liveness probe for the platform's health check.
 *
 * Deliberately outside the `ApiResult` envelope: that shape exists so the
 * interface can render a Spanish message, and nothing here is ever read by a
 * person. The prober only looks at the status code.
 *
 * It also deliberately does not touch Postgres. A health check that queries the
 * database turns a brief database hiccup into a failed deploy and a restart
 * loop, which is strictly worse than serving a page that reports the outage.
 */
export function GET() {
  return Response.json({ status: "ok" })
}
