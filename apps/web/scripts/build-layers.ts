/**
 * build-layers.ts — rebuilds every static geospatial layer under apps/web/data.
 *
 * Run with:  pnpm --filter web build:layers
 *
 * Design rules:
 *  - Fail loudly. Any unreachable source, unexpected CRS, short download or
 *    truncated WFS page aborts the whole run with a non-zero exit code.
 *  - Never leave a partial file behind. Everything is produced inside a staging
 *    directory and only copied into apps/web/data once every layer succeeded.
 *
 * External tools required:
 *  - `unar`  (macOS: `brew install unar`) — the OTBN archives are .rar, which
 *    macOS cannot extract natively.
 *  - `mapshaper` — invoked through `npx --yes mapshaper@<MAPSHAPER_VERSION>`.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(HERE, "..");
const DATA_DIR = path.join(WEB_ROOT, "data");

const MAPSHAPER_VERSION = "0.7.61";

/** Bumped whenever the pipeline changes; recorded in sources.json. */
const DOWNLOADED_AT = new Date().toISOString().slice(0, 10);

const OTBN_BASE = "https://geo.ambiente.gob.ar/documentos/sinia/bosque_OTBN";
const AMBIENTE_WFS = "https://geo.ambiente.gob.ar/geoserver/wfs";
const IGN_WFS = "https://wms.ign.gob.ar/geoserver/wfs";

/** Earliest period that still counts as "post-2020" loss. */
const MIN_LOSS_YEAR = 2021;

/** Map the legal OTBN conservation category to the app's traffic-light value. */
const CATEGORY_TO_COLOR: Record<string, string> = {
  I: "rojo",
  II: "amarillo",
  III: "verde",
};

type ProvinceSlug = "cordoba" | "chaco" | "santiago-del-estero";

interface OtbnProvince {
  slug: ProvinceSlug;
  /** Base name of the .rar archive and of the shapefile inside it. */
  archive: string;
  /**
   * Percentage of removable vertices Visvalingam keeps. Tuned per province so
   * every output stays under the 5 MB budget; see sources.json for measured
   * sizes and area retention.
   */
  simplifyPercent: number;
  label: string;
  vintage: string;
  vintageDate: string;
  legalInstrument: string;
  caveat: string;
}

const OTBN_PROVINCES: OtbnProvince[] = [
  {
    slug: "cordoba",
    archive: "CD_2010_OTBN",
    simplifyPercent: 30,
    label:
      "OTBN Córdoba — Ordenamiento Territorial de Bosques Nativos (Ley 26.331, Ley provincial 9814)",
    vintage: "2010",
    vintageDate: "2010-08-05",
    legalInstrument: "Ley provincial 9814",
    caveat:
      "Córdoba OTBN: contains no Categoría III areas at all. Los polígonos del OTBN de Córdoba fueron digitalizados a partir de un mapa JPG, por lo que la precisión de los límites es limitada: cualquier intersección cercana a un límite es indicativa, no legalmente dispositiva.",
  },
  {
    slug: "chaco",
    archive: "CH_2009_OTBN",
    simplifyPercent: 3,
    label:
      "OTBN Chaco — Ordenamiento Territorial de Bosques Nativos (Ley 26.331, Ley provincial 6409)",
    vintage: "2009",
    vintageDate: "2009-09-24",
    legalInstrument: "Ley provincial 6409",
    caveat:
      "Chaco OTBN: published layer is vintage 2009. The 2024 re-zoning (Ley 4005-R) is legally in force since STJ Sentencia 19/2026 but is not published as geodata anywhere. Además, los polígonos de la capa de Chaco zonifican TERRITORIO, no sólo bosque: sus superficies superan en ~38% la cifra oficial de hectáreas. Sirve para consultar la categoría, pero no es utilizable para estadísticas de superficie.",
  },
  {
    slug: "santiago-del-estero",
    archive: "SE_2015_OTBN",
    simplifyPercent: 0.7,
    label:
      "OTBN Santiago del Estero — Ordenamiento Territorial de Bosques Nativos (Ley 26.331, Ley provincial 6942 y Decreto 3133)",
    vintage: "2015",
    vintageDate: "2015-12-23",
    legalInstrument: "Ley provincial 6942 + Decreto 3133",
    caveat:
      "El shapefile incluye el atributo Clase con dos valores: 'Bosque Nativo' y 'Bosque a restaurar'. Ambos se conservan y se categorizan por Cat_cons. La simplificación necesaria para respetar el presupuesto de 5 MB elimina ~7% de la superficie de Categoría III (parches pequeños y dispersos); esas zonas aparecen como 'sin cobertura OTBN' en lugar de 'verde'.",
  },
];

/**
 * UMSEF publishes native-forest loss per forest region, not per province.
 * Only these two regions contain Córdoba, Chaco or Santiago del Estero — this
 * was verified by enumerating the `jurisdic` domain of every monitoring layer
 * on the server (Yungas, Selva Paranaense, Monte and Bosque Andino Patagónico
 * contain none of the three).
 */
const LOSS_LAYERS = [
  "bosques:monitoreo_pch_1998_2024",
  "bosques:monitoreo_esp_perdida_1998_2024",
] as const;

/** WFS `jurisdic` value for each province slug. */
const JURISDICTION: Record<ProvinceSlug, string> = {
  cordoba: "CORDOBA",
  chaco: "CHACO",
  "santiago-del-estero": "SANTIAGO DEL ESTERO",
};

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function fail(message: string): never {
  console.error(`\n✖ build-layers failed: ${message}\n`);
  process.exit(1);
}

function log(message: string): void {
  console.log(`  ${message}`);
}

function step(message: string): void {
  console.log(`\n▸ ${message}`);
}

function requireBinary(bin: string, hint: string): void {
  try {
    execFileSync("which", [bin], { stdio: "pipe" });
  } catch {
    fail(`required tool '${bin}' not found on PATH. ${hint}`);
  }
}

function mapshaper(args: string[]): void {
  // mapshaper needs a large heap for the Santiago del Estero shapefile (267 MB).
  const result = execFileSync(
    "npx",
    ["--yes", `mapshaper@${MAPSHAPER_VERSION}`, ...args],
    {
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 64,
      env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=14336" },
    },
  );
  if (/\[error\]/i.test(result)) fail(`mapshaper reported an error:\n${result}`);
}

async function download(url: string, dest: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    fail(`GET ${url} returned HTTP ${response.status} ${response.statusText}`);
  }
  const declared = Number(response.headers.get("content-length") ?? "0");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (declared > 0 && bytes.byteLength !== declared) {
    fail(
      `GET ${url} returned ${bytes.byteLength} bytes but Content-Length declared ${declared}. Refusing to use a truncated download.`,
    );
  }
  fs.writeFileSync(dest, bytes);
  log(`downloaded ${path.basename(dest)} (${fmtBytes(bytes.byteLength)})`);
}

function fmtBytes(n: number): string {
  return n >= 1024 * 1024
    ? `${(n / 1024 / 1024).toFixed(2)} MB`
    : `${(n / 1024).toFixed(0)} KB`;
}

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

function featureCount(file: string): number {
  return readJson<{ features: unknown[] }>(file).features.length;
}

/** Build a WFS 2.0.0 GetFeature URL. */
function wfsUrl(base: string, params: Record<string, string>): string {
  const url = new URL(base);
  url.searchParams.set("service", "WFS");
  url.searchParams.set("version", "2.0.0");
  url.searchParams.set("request", "GetFeature");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return url.toString();
}

/**
 * Fetch a complete WFS layer as GeoJSON.
 *
 * GeoServer silently caps GetFeature at 28.000 features on this server, and
 * `startIndex` paging is NOT stable without an explicit `sortBy`. Rather than
 * paginate, every request here is narrow enough to fit in a single page; we
 * then assert numberReturned === numberMatched so a future data growth spurt
 * fails the build instead of silently dropping features.
 */
async function fetchWfsGeoJson(
  base: string,
  params: Record<string, string>,
  dest: string,
): Promise<number> {
  const url = wfsUrl(base, {
    outputFormat: "application/json",
    srsName: "EPSG:4326",
    ...params,
  });
  const response = await fetch(url);
  if (!response.ok) {
    fail(`WFS GET ${url} returned HTTP ${response.status}`);
  }
  const text = await response.text();
  let json: {
    type?: string;
    features?: unknown[];
    numberMatched?: number;
    numberReturned?: number;
  };
  try {
    json = JSON.parse(text);
  } catch {
    fail(`WFS response for ${params.typeNames} was not JSON:\n${text.slice(0, 500)}`);
  }
  if (json.type !== "FeatureCollection" || !Array.isArray(json.features)) {
    fail(`WFS response for ${params.typeNames} is not a FeatureCollection`);
  }
  if (
    typeof json.numberMatched === "number" &&
    typeof json.numberReturned === "number" &&
    json.numberMatched !== json.numberReturned
  ) {
    fail(
      `WFS truncated ${params.typeNames}: matched ${json.numberMatched} but returned ${json.numberReturned}. ` +
        `Narrow the CQL filter — do NOT paginate without a stable sortBy.`,
    );
  }
  fs.writeFileSync(dest, JSON.stringify(json));
  return json.features.length;
}

/** Verify coordinates land inside Argentina (guards against lat/lon swaps). */
function assertArgentineBbox(file: string, label: string): void {
  const json = readJson<{
    features: { geometry: { coordinates: unknown } | null }[];
  }>(file);
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  const walk = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === "number") {
      const [x, y] = c as [number, number];
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    } else if (Array.isArray(c)) c.forEach(walk);
  };
  for (const f of json.features) if (f.geometry) walk(f.geometry.coordinates);
  // Continental Argentina; the province layer also covers the Antarctic claim.
  if (!(minX > -76 && maxX < -21 && minY > -91 && maxY < -21)) {
    fail(
      `${label} bbox [${minX},${minY},${maxX},${maxY}] is not inside Argentina — ` +
        `likely a WFS axis-order (lat/lon) problem.`,
    );
  }
  log(
    `${label} bbox lon[${minX.toFixed(3)}, ${maxX.toFixed(3)}] lat[${minY.toFixed(3)}, ${maxY.toFixed(3)}] — inside Argentina`,
  );
}

// ---------------------------------------------------------------------------
// OTBN
// ---------------------------------------------------------------------------

/** Recursively locate the single .shp inside an extracted archive. */
function findShapefile(root: string, base: string): string {
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop()!;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.name.toLowerCase() === `${base.toLowerCase()}.shp`) return full;
    }
  }
  fail(`could not find ${base}.shp inside ${root}`);
}

/**
 * The OTBN shapefiles are published in geographic WGS 84, so no reprojection is
 * needed — but assert it rather than assume it.
 */
function assertGeographicWgs84(shp: string): void {
  const prj = shp.replace(/\.shp$/i, ".prj");
  if (!fs.existsSync(prj)) fail(`missing .prj next to ${shp}`);
  const text = fs.readFileSync(prj, "utf8");
  if (!/^GEOGCS/i.test(text.trim()) || !/WGS[_ ]?1984/i.test(text)) {
    fail(
      `${path.basename(prj)} is not geographic WGS 84 — reprojection would be required.\n${text}`,
    );
  }
  log(`${path.basename(prj)}: GEOGCS / WGS_1984 confirmed (EPSG:4326, no reprojection)`);
}

/**
 * Normalise the category attribute. The field name differs in case between
 * provinces: `Cat_cons` in Córdoba and Santiago del Estero, `CAT_CONS` in
 * Chaco, and `cat_cons` when the same data is served over WFS.
 */
const NORMALISE_CATEGORY = `
  var raw = this.properties.Cat_cons || this.properties.CAT_CONS || this.properties.cat_cons || '';
  var code = String(raw).trim();
  this.properties.cat_cons_original = code;
  this.properties.categoria = ${JSON.stringify(CATEGORY_TO_COLOR)}[code] || null;
`;

interface OtbnStats {
  featureCount: number;
  categoryCounts: Record<string, number>;
  categoryField: string;
  outputFeatureCount: number;
  rawBytes: number;
  outBytes: number;
}

function buildOtbn(
  province: OtbnProvince,
  shp: string,
  stageDir: string,
): OtbnStats {
  // 1. Inspect the source attributes so the manifest records measured numbers.
  const attrsFile = path.join(stageDir, `${province.archive}.attrs.json`);
  mapshaper([
    "-i",
    shp,
    "encoding=utf8",
    "-each",
    NORMALISE_CATEGORY,
    "-filter-fields",
    "categoria,cat_cons_original",
    "-o",
    "format=json",
    attrsFile,
  ]);
  const attrs = readJson<{ cat_cons_original: string }[]>(attrsFile);
  const categoryCounts: Record<string, number> = { I: 0, II: 0, III: 0 };
  for (const row of attrs) {
    if (row.cat_cons_original in categoryCounts) categoryCounts[row.cat_cons_original]++;
    else fail(`unexpected cat_cons value '${row.cat_cons_original}' in ${province.archive}`);
  }
  const categoryField = fs.existsSync(shp.replace(/\.shp$/i, ".dbf"))
    ? detectCategoryField(shp)
    : "cat_cons";

  // 2. Dissolve adjacent polygons of the same category, then re-import.
  //    The re-import matters: dissolving leaves one arc per original shared
  //    boundary, and simplification cannot drop arc endpoints. Writing the
  //    dissolved geometry out and reading it back rebuilds a clean topology,
  //    which is what lets Santiago del Estero drop from 34 MB to 4.5 MB.
  const dissolved = path.join(stageDir, `${province.slug}.dissolved.geojson`);
  mapshaper([
    "-i",
    shp,
    "encoding=utf8",
    "-each",
    NORMALISE_CATEGORY,
    "-filter-fields",
    "categoria,cat_cons_original",
    "-dissolve2",
    "categoria",
    "copy-fields=cat_cons_original",
    "-o",
    "precision=0.000001",
    dissolved,
  ]);

  // 3. Simplify the re-imported topology.
  const out = path.join(stageDir, "otbn", `${province.slug}.geojson`);
  mapshaper([
    "-i",
    dissolved,
    "-simplify",
    "visvalingam",
    "weighted",
    `${province.simplifyPercent}%`,
    "keep-shapes",
    "-o",
    "precision=0.0001",
    out,
  ]);

  assertArgentineBbox(out, `otbn/${province.slug}`);

  // 4. Every feature must carry a valid normalised category.
  const outJson = readJson<{
    features: { properties: { categoria: string; cat_cons_original: string } }[];
  }>(out);
  for (const f of outJson.features) {
    if (!["rojo", "amarillo", "verde"].includes(f.properties.categoria)) {
      fail(`otbn/${province.slug} has a feature with categoria='${f.properties.categoria}'`);
    }
  }

  const stats: OtbnStats = {
    featureCount: attrs.length,
    categoryCounts,
    categoryField,
    outputFeatureCount: outJson.features.length,
    rawBytes: fs.statSync(dissolved).size,
    outBytes: fs.statSync(out).size,
  };
  log(
    `otbn/${province.slug}: ${stats.featureCount} source features ` +
      `(I=${categoryCounts.I} II=${categoryCounts.II} III=${categoryCounts.III}) → ` +
      `${stats.outputFeatureCount} dissolved features, ${fmtBytes(stats.outBytes)} @ ${province.simplifyPercent}%`,
  );
  if (stats.outBytes > 5 * 1024 * 1024) {
    fail(
      `otbn/${province.slug} is ${fmtBytes(stats.outBytes)}, over the 5 MB budget. Lower simplifyPercent.`,
    );
  }
  return stats;
}

/** Read the real field name out of the DBF header (case is province-specific). */
function detectCategoryField(shp: string): string {
  const dbf = fs.readFileSync(shp.replace(/\.shp$/i, ".dbf"));
  const headerLength = dbf.readUInt16LE(8);
  for (let offset = 32; offset < headerLength - 1; offset += 32) {
    const name = dbf.subarray(offset, offset + 11).toString("ascii").replace(/\0.*$/, "");
    if (/^cat_cons$/i.test(name)) return name;
  }
  fail(`no cat_cons field found in ${path.basename(shp)}`);
}

// ---------------------------------------------------------------------------
// Forest loss
// ---------------------------------------------------------------------------

/**
 * Discover which `periodo` values count as post-2020 loss. Values are strings,
 * either a single year ("2023") or a range ("2008-2011"); a period qualifies
 * when its first year is >= MIN_LOSS_YEAR. Reading the domain from the server
 * means a future "2025" period is picked up automatically.
 */
async function discoverLossPeriods(layer: string): Promise<string[]> {
  const url = wfsUrl(AMBIENTE_WFS, {
    typeNames: layer,
    propertyName: "periodo",
    outputFormat: "application/json",
  });
  const response = await fetch(url);
  if (!response.ok) fail(`WFS GET ${url} returned HTTP ${response.status}`);
  const json = (await response.json()) as {
    features: { properties: { periodo: string } }[];
  };
  const periods = new Set<string>();
  for (const f of json.features) {
    const value = f.properties.periodo;
    const startYear = Number(String(value).slice(0, 4));
    if (Number.isFinite(startYear) && startYear >= MIN_LOSS_YEAR) periods.add(value);
  }
  if (periods.size === 0) fail(`no periodo >= ${MIN_LOSS_YEAR} found in ${layer}`);
  return [...periods].sort();
}

interface LossStats {
  featureCount: number;
  periodCounts: Record<string, number>;
  sourceLayers: string[];
  outBytes: number;
}

async function buildForestLoss(
  slug: ProvinceSlug,
  periodsByLayer: Map<string, string[]>,
  stageDir: string,
): Promise<LossStats> {
  const parts: string[] = [];
  const sourceLayers: string[] = [];

  for (const layer of LOSS_LAYERS) {
    const periods = periodsByLayer.get(layer)!;
    const inList = periods.map((p) => `'${p}'`).join(",");
    const cql = `jurisdic='${JURISDICTION[slug]}' AND periodo IN (${inList})`;
    const dest = path.join(stageDir, `loss.${slug}.${layer.split(":")[1]}.json`);
    const n = await fetchWfsGeoJson(
      AMBIENTE_WFS,
      { typeNames: layer, CQL_FILTER: cql, sortBy: "periodo" },
      dest,
    );
    if (n > 0) {
      parts.push(dest);
      sourceLayers.push(`${layer} (${n} features)`);
    }
  }
  if (parts.length === 0) fail(`no post-2020 loss features returned for ${slug}`);

  const normalise = `
    this.properties.periodo = parseInt(this.properties.periodo, 10);
    this.properties.dts = this.properties.dts || null;
    this.properties.dte = this.properties.dte || null;
    this.properties.infobs = this.properties.infobs || null;
  `;
  const merged = path.join(stageDir, `loss.${slug}.merged.geojson`);
  mapshaper([
    "-i",
    ...parts,
    ...(parts.length > 1 ? ["combine-files"] : []),
    ...(parts.length > 1 ? ["-merge-layers", "force"] : []),
    "-each",
    normalise,
    "-filter-fields",
    "periodo,dts,dte,infobs",
    "-o",
    "precision=0.000001",
    merged,
  ]);

  // These small irregular clearings are the evidence; simplify gently.
  const out = path.join(stageDir, "forest-loss", `${slug}.geojson`);
  mapshaper([
    "-i",
    merged,
    "-simplify",
    "visvalingam",
    "weighted",
    "70%",
    "keep-shapes",
    "-o",
    "precision=0.00001",
    out,
  ]);

  assertArgentineBbox(out, `forest-loss/${slug}`);

  const outJson = readJson<{ features: { properties: { periodo: number } }[] }>(out);
  const periodCounts: Record<string, number> = {};
  for (const f of outJson.features) {
    if (!Number.isFinite(f.properties.periodo)) {
      fail(`forest-loss/${slug} has a feature with a non-numeric periodo`);
    }
    const key = String(f.properties.periodo);
    periodCounts[key] = (periodCounts[key] ?? 0) + 1;
  }

  const outBytes = fs.statSync(out).size;
  log(
    `forest-loss/${slug}: ${outJson.features.length} features, ${fmtBytes(outBytes)} ` +
      `(${Object.entries(periodCounts).sort().map(([k, v]) => `${k}:${v}`).join(" ")})`,
  );
  if (outBytes > 5 * 1024 * 1024) {
    fail(`forest-loss/${slug} is ${fmtBytes(outBytes)}, over the 5 MB budget.`);
  }
  return {
    featureCount: outJson.features.length,
    periodCounts,
    sourceLayers,
    outBytes,
  };
}

// ---------------------------------------------------------------------------
// Provinces
// ---------------------------------------------------------------------------

async function buildProvinces(stageDir: string): Promise<number> {
  const raw = path.join(stageDir, "provincias.raw.json");
  const n = await fetchWfsGeoJson(IGN_WFS, { typeNames: "ign:provincia" }, raw);
  if (n !== 24) {
    fail(`expected 24 Argentine provinces from IGN, got ${n}`);
  }

  // `nam` is the IGN province name; derive an ASCII slug from it.
  const addSlug = `
    var name = this.properties.nam;
    this.properties.nombre = name;
    this.properties.slug = name
      .normalize('NFD')
      .replace(/[\\u0300-\\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  `;
  const out = path.join(stageDir, "provincias-ar.geojson");
  mapshaper([
    "-i",
    raw,
    "-each",
    addSlug,
    "-filter-fields",
    "nombre,slug",
    "-simplify",
    "visvalingam",
    "weighted",
    "1%",
    "keep-shapes",
    "-o",
    "precision=0.0001",
    out,
  ]);

  const json = readJson<{ features: { properties: { slug: string } }[] }>(out);
  const slugs = new Set(json.features.map((f) => f.properties.slug));
  for (const required of ["cordoba", "chaco", "santiago-del-estero"]) {
    if (!slugs.has(required)) fail(`provincias-ar.geojson is missing slug '${required}'`);
  }
  const bytes = fs.statSync(out).size;
  log(`provincias-ar: ${json.features.length} features, ${fmtBytes(bytes)}`);
  return json.features.length;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  step("Preflight");
  requireBinary("unar", "Install it with: brew install unar");
  requireBinary("npx", "Install Node.js (npx ships with npm).");
  log(`mapshaper@${MAPSHAPER_VERSION} via npx`);

  const stageDir = fs.mkdtempSync(path.join(os.tmpdir(), "lote-limpio-layers-"));
  fs.mkdirSync(path.join(stageDir, "otbn"), { recursive: true });
  fs.mkdirSync(path.join(stageDir, "forest-loss"), { recursive: true });
  log(`staging in ${stageDir}`);

  const otbnStats = new Map<ProvinceSlug, OtbnStats>();
  const lossStats = new Map<ProvinceSlug, LossStats>();

  try {
    step("OTBN — download, extract and convert");
    for (const province of OTBN_PROVINCES) {
      const rar = path.join(stageDir, `${province.archive}.rar`);
      await download(`${OTBN_BASE}/${province.archive}.rar`, rar);

      const extractDir = path.join(stageDir, province.archive);
      execFileSync("unar", ["-q", "-f", "-o", extractDir, rar], { stdio: "pipe" });

      const shp = findShapefile(extractDir, province.archive);
      assertGeographicWgs84(shp);
      otbnStats.set(province.slug, buildOtbn(province, shp, stageDir));
    }

    step(`Forest loss — UMSEF WFS, periodo >= ${MIN_LOSS_YEAR}`);
    const periodsByLayer = new Map<string, string[]>();
    for (const layer of LOSS_LAYERS) {
      const periods = await discoverLossPeriods(layer);
      periodsByLayer.set(layer, periods);
      log(`${layer}: post-2020 periods ${periods.join(", ")}`);
    }
    for (const province of OTBN_PROVINCES) {
      lossStats.set(
        province.slug,
        await buildForestLoss(province.slug, periodsByLayer, stageDir),
      );
    }

    step("Provincial boundaries — IGN");
    const provinceCount = await buildProvinces(stageDir);

    step("Provenance manifest");
    writeManifest(stageDir, otbnStats, lossStats, provinceCount);

    // Only now that every layer succeeded do we touch apps/web/data.
    step("Publishing to apps/web/data");
    publish(stageDir);
    log("done");
  } finally {
    fs.rmSync(stageDir, { recursive: true, force: true });
  }
}

function writeManifest(
  stageDir: string,
  otbnStats: Map<ProvinceSlug, OtbnStats>,
  lossStats: Map<ProvinceSlug, LossStats>,
  provinceCount: number,
): void {
  const license =
    "Creative Commons — licencia libre (AccessConstraints declarado por el servicio WFS de geo.ambiente.gob.ar; Fees: NONE)";

  const otbn: Record<string, unknown> = {};
  for (const province of OTBN_PROVINCES) {
    const s = otbnStats.get(province.slug)!;
    otbn[province.slug] = {
      label: province.label,
      sourceUrl: `${OTBN_BASE}/${province.archive}.rar`,
      publisher: "Dirección Nacional de Bosques / MAyDS — IDE Ambiental / SINIA",
      vintage: province.vintage,
      vintageDate: province.vintageDate,
      legalInstrument: province.legalInstrument,
      license,
      downloadedAt: DOWNLOADED_AT,
      categoryField: s.categoryField,
      featureCount: s.featureCount,
      categoryCounts: s.categoryCounts,
      outputFeatureCount: s.outputFeatureCount,
      simplification: `mapshaper -dissolve2 categoria, re-import, -simplify visvalingam weighted ${province.simplifyPercent}% keep-shapes, precision 0.0001`,
      caveat: province.caveat,
    };
  }

  const forestLoss: Record<string, unknown> = {};
  for (const province of OTBN_PROVINCES) {
    const s = lossStats.get(province.slug)!;
    forestLoss[province.slug] = {
      label: `Pérdida de bosque nativo post-2020 — ${province.slug} (UMSEF / Monitoreo de Superficie de Bosque Nativo)`,
      sourceUrl: wfsUrl(AMBIENTE_WFS, { typeNames: LOSS_LAYERS[0] }),
      sourceLayers: s.sourceLayers,
      publisher:
        "UMSEF — Unidad de Manejo del Sistema de Evaluación Forestal, Dirección Nacional de Bosques / MAyDS",
      vintage: `1998-2024 (filtrado a periodo >= ${MIN_LOSS_YEAR})`,
      license,
      downloadedAt: DOWNLOADED_AT,
      filter: `jurisdic='${JURISDICTION[province.slug]}' AND periodo >= ${MIN_LOSS_YEAR}`,
      properties: ["periodo", "dts", "dte", "infobs"],
      featureCount: s.featureCount,
      periodCounts: s.periodCounts,
      simplification:
        "mapshaper -simplify visvalingam weighted 70% keep-shapes, precision 0.00001",
      caveat:
        "La capa no incluye ningún atributo de categoría OTBN; la categoría debe cruzarse espacialmente con las capas otbn/*.",
    };
  }

  const manifest = {
    generatedAt: DOWNLOADED_AT,
    crs: "EPSG:4326 (WGS 84, lon/lat axis order)",
    categoryMapping: CATEGORY_TO_COLOR,
    otbn,
    forestLoss,
    provincias: {
      label: "Límites provinciales de la República Argentina",
      sourceUrl: wfsUrl(IGN_WFS, { typeNames: "ign:provincia" }),
      publisher: "Instituto Geográfico Nacional (IGN)",
      license:
        'Uso libre — Artículo 2, Ley 27.275 de derecho de acceso a la información pública (AccessConstraints declarado por el servicio WFS del IGN)',
      downloadedAt: DOWNLOADED_AT,
      properties: ["nombre", "slug"],
      featureCount: provinceCount,
      simplification:
        "mapshaper -simplify visvalingam weighted 1% keep-shapes, precision 0.0001",
      caveat:
        "Se usa únicamente para resolver la provincia de un lote por point-in-polygon y para descartar polígonos fuera de Argentina; está fuertemente simplificado y no sirve como límite legal. Incluye la Antártida y las Islas del Atlántico Sur dentro de 'Tierra del Fuego, Antártida e Islas del Atlántico Sur', por lo que el bounding box del archivo llega hasta latitud -90.",
    },
  };

  fs.writeFileSync(
    path.join(stageDir, "sources.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}

/** Copy the completed staging tree over apps/web/data. */
function publish(stageDir: string): void {
  fs.mkdirSync(path.join(DATA_DIR, "otbn"), { recursive: true });
  fs.mkdirSync(path.join(DATA_DIR, "forest-loss"), { recursive: true });
  const files = [
    "sources.json",
    "provincias-ar.geojson",
    ...OTBN_PROVINCES.map((p) => `otbn/${p.slug}.geojson`),
    ...OTBN_PROVINCES.map((p) => `forest-loss/${p.slug}.geojson`),
  ];
  for (const rel of files) {
    const from = path.join(stageDir, rel);
    if (!fs.existsSync(from)) fail(`expected staged file ${rel} is missing`);
    fs.copyFileSync(from, path.join(DATA_DIR, rel));
    log(`${rel} (${fmtBytes(fs.statSync(from).size)})`);
  }
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? (error.stack ?? error.message) : String(error));
});
