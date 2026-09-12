import { nextJsConfig } from "@workspace/eslint-config/next-js"

/** @type {import("eslint").Linter.Config} */
export default [
  // Vendored, minified and not ours: public/maplibre holds MapLibre's worker,
  // copied out of node_modules by predev. Linting it buys nothing and drowns
  // real findings in a thousand warnings about someone else's bundle.
  { ignores: ["public/maplibre/**"] },
  ...nextJsConfig,
]
