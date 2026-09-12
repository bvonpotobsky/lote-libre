import { resolve } from "node:path"
import type { NextConfig } from "next"

/**
 * `turbopack.root` is pinned because Next walks upwards looking for a lockfile
 * and finds an unrelated package-lock.json above this repository, which would
 * make it treat a parent directory as the workspace root.
 *
 * `outputFileTracingIncludes` keeps the Archivo TTF and the brand lockup next
 * to the Open Graph route: both are read with `join(process.cwd(), …)`, a path
 * the tracer cannot follow on its own, so a standalone output would otherwise
 * ship without them.
 */
const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui"],
  turbopack: { root: resolve(import.meta.dirname, "..", "..") },
  images: { formats: ["image/avif", "image/webp"] },
  outputFileTracingIncludes: {
    "/opengraph-image": ["./assets/fonts/**", "./public/marca/**"],
  },
}

export default nextConfig
