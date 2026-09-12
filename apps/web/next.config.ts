import { resolve } from "node:path"
import type { NextConfig } from "next"

/**
 * `turbopack.root` is pinned because Next walks upwards looking for a lockfile
 * and finds an unrelated package-lock.json above this repository, which would
 * make it treat a parent directory as the workspace root.
 */
const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui"],
  turbopack: { root: resolve(import.meta.dirname, "..", "..") },
}

export default nextConfig
