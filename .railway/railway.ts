import { defineRailway, github, postgres, preserve, project, service, volume } from "railway/iac";

export default defineRailway(() => {
  const Postgres = postgres("Postgres", { region: "us-east4-eqdc4a" });
  const postgresVolume = volume("postgres-volume", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "us-east4-eqdc4a", sizeMB: 50000 });
  const sentinelCache = volume("sentinel-cache", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "us-east4-eqdc4a", sizeMB: 50000 });
  const web = service("web", {
    source: github("bvonpotobsky/lote-libre", { checkSuites: false }),
    build: "pnpm --filter web build",
    start: "pnpm --filter web start",
    healthcheck: "/api/health",
    healthcheckTimeout: 120,
    replicas: { "us-east4-eqdc4a": 1 },
    deploy: { preDeployCommand: ["pnpm --filter web db:migrate"], restartPolicyMaxRetries: 3 },
    volumeMounts: { "/app/apps/web/.cache": sentinelCache },
    env: { BETTER_AUTH_SECRET: preserve(), BETTER_AUTH_URL: preserve(), DATABASE_URL: preserve(), RAILPACK_NODE_VERSION: preserve(), SH_CLIENT_ID: preserve(), SH_CLIENT_SECRET: preserve(), XWEATHER_CLIENT_ID: preserve(), XWEATHER_CLIENT_SECRET: preserve() },
  });

  return project("lote-libre", {
    resources: [web, Postgres, postgresVolume, sentinelCache],
  });
});
