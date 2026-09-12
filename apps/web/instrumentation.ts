/**
 * Runs once per server instance before the first request is served.
 *
 * Validating configuration here is the whole reason the credentials are read
 * through a typed module: a missing Copernicus secret stops the server at boot
 * with a message naming what is missing, instead of surfacing as an opaque 400
 * from a third-party API in the middle of a demo.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return

  const { assertEnvironment } = await import("@/lib/config/env")
  assertEnvironment()
}
