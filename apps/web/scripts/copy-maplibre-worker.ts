/**
 * copy-maplibre-worker.ts — stages MapLibre's web worker into public/maplibre.
 *
 * Runs automatically from `predev` and `prebuild`.
 *
 * Why this exists: MapLibre GL JS v6 moved the worker out of the main bundle,
 * and its own migration guide is explicit that `setWorkerUrl()` is REQUIRED
 * under any bundler — the worker path cannot be resolved reliably on its own.
 * Without it the worker never answers: every GeoJSON source hangs forever with
 * `_isUpdatingWorker` stuck true, so nothing vector ever renders. It fails in
 * complete silence — no console error, no network error — because the raster
 * basemap does not go through the worker and keeps painting normally.
 *
 * Two files are needed, not one: the worker imports the shared chunk.
 *
 * The source path is resolved through `createRequire`, never by joining
 * "node_modules" by hand, because pnpm stores the real package under
 * .pnpm/<name>@<version>/ and exposes only a symlink.
 */

import { copyFileSync, mkdirSync, statSync } from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"

const HERE = path.dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = path.resolve(HERE, "..")
const DEST_DIR = path.join(WEB_ROOT, "public", "maplibre")

/** The worker plus the chunk it imports. Copying only the worker fails at runtime. */
const FILES = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]

const require = createRequire(import.meta.url)

function distDir(): string {
  try {
    return path.join(
      path.dirname(require.resolve("maplibre-gl/package.json")),
      "dist"
    )
  } catch {
    throw new Error(
      "maplibre-gl is not installed. Run `pnpm install` before `pnpm dev`."
    )
  }
}

function main(): void {
  const dist = distDir()
  mkdirSync(DEST_DIR, { recursive: true })

  for (const file of FILES) {
    const from = path.join(dist, file)

    // Fail loudly rather than leave a half-staged folder: a missing worker
    // reads to the user as "the map is broken", which is the hardest kind of
    // bug to trace back to a build step that quietly did nothing.
    if (!statSync(from, { throwIfNoEntry: false })) {
      throw new Error(
        `${file} is missing from ${dist}. The maplibre-gl layout changed — check the version and update FILES.`
      )
    }

    copyFileSync(from, path.join(DEST_DIR, file))
  }

  console.log(
    `[maplibre] worker staged in public/maplibre (${FILES.length} files)`
  )
}

main()
