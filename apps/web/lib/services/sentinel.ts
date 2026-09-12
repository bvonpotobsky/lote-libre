// Sentinel-2 L2A vía Copernicus Data Space Ecosystem (Sentinel Hub Process API)
// 1) Cuenta gratis en dataspace.copernicus.eu → Dashboard → "OAuth clients" → crear client_id / client_secret
// 2) SH_CLIENT_ID y SH_CLIENT_SECRET en .env
// Uso: const png = await getLoteImage(geojsonPolygon, "2020-11-01", "2020-12-31", "ndvi");

import { env } from "@/lib/config/env"
import { encuadreDeLote } from "@/lib/geo/encuadre"

const TOKEN_URL =
  "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
const PROCESS_URL = "https://sh.dataspace.copernicus.eu/api/v1/process"
const CRS_4326 = "http://www.opengis.net/def/crs/EPSG/0/4326"

let cachedToken: { value: string; exp: number } | null = null

export async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.exp) return cachedToken.value
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: env.copernicus.clientId,
      client_secret: env.copernicus.clientSecret,
    }),
  })
  if (!res.ok) throw new Error(`token ${res.status}: ${await res.text()}`)
  const json = (await res.json()) as {
    access_token: string
    expires_in: number
  }
  cachedToken = {
    value: json.access_token,
    exp: Date.now() + (json.expires_in - 60) * 1000,
  }
  return cachedToken.value
}

/**
 * Bumped whenever what we ask Copernicus for changes.
 *
 * That is wider than the evalscripts below: it covers the bounds too. v3 stopped
 * clipping to the polygon and started framing the lote with its neighbours, and
 * not one character of any script moved.
 *
 * Nothing else in the cache key describes the request, so without this an old
 * row keeps serving PNGs taken the previous way — for ever, in the case of
 * reference images, which never expire. `sentinel.test.ts` fails when the
 * scripts and this number drift apart, but it cannot see a change of bounds:
 * if you alter what pixels are requested, bump this by hand.
 */
export const EVALSCRIPT_VERSION = 3 as const

/**
 * Tile-level cloud filter, in percent.
 *
 * Deliberately loose. It used to sit at 30 because there was no per-pixel mask
 * and a cloudy scene meant a cloudy image; now the evalscripts reject cloud
 * pixel by pixel and composite across orbits, so a tile that is 60% clouded
 * elsewhere is a useful orbit for this lote. Filtering it out only leaves holes.
 */
export const MAX_TILE_CLOUD_PCT = 70

/** SCL classes that are not ground: no data, defective, shadow, cloud, snow. */
const SCL_REJECTED = "[0, 1, 3, 8, 9, 10, 11]"

export const EVALSCRIPTS = {
  // Cloud-free composite, not a single pass. One sample per orbit, ordered by
  // scene cloud cover; the first orbit that is not cloud, shadow, cirrus or
  // snow over this pixel wins. A pixel no orbit could resolve stays
  // transparent — a hole reads as "no clean view here", which bare soil does
  // not, and it keeps isEmptyCoverage able to tell a blank window from a field.
  trueColor: `//VERSION=3
function setup() {
  return {
    input: ["B02", "B03", "B04", "SCL", "dataMask"],
    output: { bands: 4 },
    mosaicking: "ORBIT",
  };
}

const REJECTED = ${SCL_REJECTED};

function usable(s) {
  return s.dataMask === 1 && REJECTED.indexOf(s.SCL) === -1;
}

// Sentinel Hub's own L2A "true colour optimized" tone curve. The flat 2.5x gain
// it replaces clipped bright bare soil to white and crushed the dry Chaco
// canopy to near black — the two things this image exists to tell apart.
const maxR = 3.0;
const midR = 0.13;
const sat = 1.2;
const gamma = 1.8;
const gOff = 0.01;
const gOffPow = Math.pow(gOff, gamma);
const gOffRange = Math.pow(1 + gOff, gamma) - gOffPow;

function clip(s) { return s < 0 ? 0 : s > 1 ? 1 : s; }

function adj(a, tx, ty, maxC) {
  const ar = clip(a / maxC);
  return ar * (ar * (tx / maxC + ty - 1) - ty) / (ar * (2 * tx / maxC - 1) - tx / maxC);
}

function adjGamma(b) { return (Math.pow(b + gOff, gamma) - gOffPow) / gOffRange; }

function sAdj(a) { return adjGamma(adj(a, midR, 1, maxR)); }

function satEnh(r, g, b) {
  const avgS = ((r + g + b) / 3.0) * (1 - sat);
  return [clip(avgS + r * sat), clip(avgS + g * sat), clip(avgS + b * sat)];
}

function sRGB(c) {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 0.41666666666) - 0.055;
}

function evaluatePixel(samples) {
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    if (!usable(s)) continue;
    const rgb = satEnh(sAdj(s.B04), sAdj(s.B03), sAdj(s.B02));
    return [sRGB(rgb[0]), sRGB(rgb[1]), sRGB(rgb[2]), 1];
  }
  return [0, 0, 0, 0];
}`,

  // NDVI over the same cloud-free composite and the same sample selection as
  // trueColor, so both layers describe the same ground on the same dates.
  ndvi: `//VERSION=3
function setup() {
  return {
    input: ["B04", "B08", "SCL", "dataMask"],
    output: { bands: 4 },
    mosaicking: "ORBIT",
  };
}

const REJECTED = ${SCL_REJECTED};

function usable(s) {
  return s.dataMask === 1 && REJECTED.indexOf(s.SCL) === -1;
}

// Earth tones below, canopy green above, and the swing at 0.30-0.35 where the
// dry Chaco actually separates standing forest from cleared ground: bare soil
// sits at 0.10-0.20, rastrojo at 0.20-0.30, dry thorn forest at 0.35-0.55,
// closed canopy at 0.60-0.85. The old ramp swung at 0.20, which called rastrojo
// "almost green" and dry monte "yellow" — the complaint that started this.
//
// No pure yellow and no red, on purpose: those are the OTBN legend, rendered on
// the same screen. An index ramp borrowing the legal palette invites reading a
// legal category out of a leaf-greenness measurement.
//
// Lightness falls from bare soil to closed canopy, so the ramp still separates
// for a reader who cannot tell red from green.
const RAMP = [
  [-0.20, 0x2b3a55],
  [0.00, 0x6b5b4a],
  [0.10, 0x9c8663],
  [0.18, 0xc4ad84],
  [0.25, 0xd9cf9a],
  [0.35, 0xb9c47a],
  [0.45, 0x82ab5a],
  [0.60, 0x4a8a43],
  [0.80, 0x1d5c2e]
];
const viz = new ColorRampVisualizer(RAMP);

function evaluatePixel(samples) {
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    if (!usable(s)) continue;
    const sum = s.B08 + s.B04;
    if (sum === 0) continue;
    return [...viz.process((s.B08 - s.B04) / sum), 1];
  }
  return [0, 0, 0, 0];
}`,

  // Frozen. scripts/build-landing-assets.ts compensates this exact flat 2.5x
  // gain with a linear lift in sharp (HERO_GANANCIA / HERO_DESPLAZAMIENTO) and
  // commits the result to public/. Changing it re-brightens that artwork twice.
  // The app uses `trueColor` above; this one only feeds the bake.
  trueColorFlat: `//VERSION=3
function setup() { return { input: ["B02","B03","B04","dataMask"], output: { bands: 4 } }; }
function evaluatePixel(s) { return [2.5*s.B04, 2.5*s.B03, 2.5*s.B02, s.dataMask]; }`,
} as const

/** [minLon, minLat, maxLon, maxLat] in WGS84, lon/lat axis order. */
export type Bbox4326 = readonly [number, number, number, number]

/**
 * A rectangle, and only ever a rectangle.
 *
 * Sentinel Hub also accepts a `geometry` here and masks everything outside it to
 * a transparent alpha. That is how this file used to ask for a lote, and the
 * result was a rotated diamond on a black field that read as a broken image. The
 * arm is gone rather than merely unused, so nothing falls back into it.
 */
type ProcessBounds = { bbox: number[]; properties: { crs: string } }

type ProcessRequest = {
  bounds: ProcessBounds
  from: string
  to: string
  layer: keyof typeof EVALSCRIPTS
  width: number
  height: number
  maxCloudCoverage: number
}

/** One Process API call; both public entry points differ only in their bounds. */
async function procesar(request: ProcessRequest): Promise<Buffer> {
  const body = {
    input: {
      bounds: request.bounds,
      data: [
        {
          type: "sentinel-2-l2a",
          dataFilter: {
            timeRange: {
              from: `${request.from}T00:00:00Z`,
              to: `${request.to}T23:59:59Z`,
            },
            maxCloudCoverage: request.maxCloudCoverage, // % por tile; subilo si el rango no devuelve nada
            mosaickingOrder: "leastCC", // píxeles de la pasada menos nubosa
          },
        },
      ],
    },
    output: {
      width: request.width,
      height: request.height,
      responses: [{ identifier: "default", format: { type: "image/png" } }],
    },
    evalscript: EVALSCRIPTS[request.layer],
  }

  const res = await fetch(PROCESS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await getToken()}`,
      "Content-Type": "application/json",
      Accept: "image/png",
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`process ${res.status}: ${await res.text()}`)
  return Buffer.from(await res.arrayBuffer())
}

/**
 * A Sentinel-2 PNG of the lote and the country around it, composited over the
 * range.
 *
 * The frame is the lote's own bounding box opened up by `encuadreDeLote`, not
 * the polygon itself. Clipping to the polygon used to leave everything outside
 * it transparent, which rendered as a black field and told the producer
 * nothing: the judgement the legend asks for — monte is mottled, clearing is
 * flat and straight-edged — needs the neighbouring fields to read against.
 *
 * The lote's edge is drawn back on top as an SVG outline by the comparador,
 * using the very same frame. Do not change the bounds here without changing
 * `encuadreDeLote`, and bump EVALSCRIPT_VERSION when you do.
 */
export async function getLoteImage(
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon,
  from: string, // "YYYY-MM-DD"
  to: string,
  layer: keyof typeof EVALSCRIPTS = "trueColor"
): Promise<Buffer> {
  const { marco, vista } = encuadreDeLote(geometry)

  return getFrameImage(
    marco,
    from,
    to,
    layer,
    vista.ancho,
    vista.alto,
    MAX_TILE_CLOUD_PCT
  )
}

/**
 * One request for a rectangular frame: the whole bbox is imagery, nothing is
 * transparent.
 *
 * The only shape of request there is. width/height must match the viewBox any
 * vectors are projected onto, so that those vectors register with the raster
 * pixel for pixel — the landing hero bake and the lote comparador both depend
 * on it.
 */
export async function getFrameImage(
  bbox: Bbox4326,
  from: string,
  to: string,
  layer: keyof typeof EVALSCRIPTS = "trueColor",
  width = 1024,
  height = 1024,
  maxCloudCoverage = 15
): Promise<Buffer> {
  return procesar({
    bounds: { bbox: [...bbox], properties: { crs: CRS_4326 } },
    from,
    to,
    layer,
    width,
    height,
    maxCloudCoverage,
  })
}

