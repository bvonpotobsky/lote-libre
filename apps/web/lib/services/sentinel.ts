// Sentinel-2 L2A vía Copernicus Data Space Ecosystem (Sentinel Hub Process API)
// 1) Cuenta gratis en dataspace.copernicus.eu → Dashboard → "OAuth clients" → crear client_id / client_secret
// 2) SH_CLIENT_ID y SH_CLIENT_SECRET en .env
// Uso: const png = await getLoteImage(geojsonPolygon, "2020-11-01", "2020-12-31", "ndvi");

import { env } from "@/lib/config/env"

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

const EVALSCRIPTS = {
  // Color real, con brillo levantado (las reflectancias son bajas)
  trueColor: `//VERSION=3
function setup() { return { input: ["B02","B03","B04","dataMask"], output: { bands: 4 } }; }
function evaluatePixel(s) { return [2.5*s.B04, 2.5*s.B03, 2.5*s.B02, s.dataMask]; }`,

  // NDVI en escala rojo→amarillo→verde. Sirve para ver el contraste monte/lote pelado.
  ndvi: `//VERSION=3
function setup() { return { input: ["B04","B08","dataMask"], output: { bands: 4 } }; }
const ramp = [[-0.2,0x8b0000],[0,0xd2b48c],[0.2,0xffff66],[0.4,0x99e600],[0.6,0x33a02c],[0.8,0x006400]];
const viz = new ColorRampVisualizer(ramp);
function evaluatePixel(s) {
  const ndvi = (s.B08 - s.B04) / (s.B08 + s.B04);
  return [...viz.process(ndvi), s.dataMask];
}`,
} as const

export type GeoJSONPolygon = {
  type: "Polygon" | "MultiPolygon"
  coordinates: number[][][] | number[][][][]
}

/** [minLon, minLat, maxLon, maxLat] in WGS84, lon/lat axis order. */
export type Bbox4326 = readonly [number, number, number, number]

type ProcessBounds =
  | { geometry: GeoJSONPolygon; properties: { crs: string } }
  | { bbox: number[]; properties: { crs: string } }

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

/** Devuelve un PNG (Buffer) de Sentinel-2 recortado al polígono, mosaico menos nuboso del rango. */
export async function getLoteImage(
  geometry: GeoJSONPolygon,
  from: string, // "YYYY-MM-DD"
  to: string,
  layer: keyof typeof EVALSCRIPTS = "trueColor",
  size = 512
): Promise<Buffer> {
  return procesar({
    bounds: {
      geometry, // WGS84 por defecto (EPSG:4326). Recorta al polígono: afuera queda transparente.
      properties: { crs: CRS_4326 },
    },
    from,
    to,
    layer,
    width: size,
    height: size,
    maxCloudCoverage: 30,
  })
}

/**
 * Rectangular frame instead of a masked polygon: the whole bbox is imagery,
 * nothing is transparent. Used to bake static artwork (the landing hero), where
 * width/height must match a fixed viewBox so vectors projected with the same
 * bbox register pixel for pixel.
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

// Ejemplo: comparación "2020 vs hoy" para el slider del demo
export async function getBeforeAfter(geometry: GeoJSONPolygon) {
  const today = new Date().toISOString().slice(0, 10)
  const monthAgo = new Date(Date.now() - 45 * 864e5).toISOString().slice(0, 10)
  const [before, after] = await Promise.all([
    getLoteImage(geometry, "2020-10-01", "2020-12-31", "trueColor"),
    getLoteImage(geometry, monthAgo, today, "trueColor"),
  ])
  return { before, after } // servilos como data:image/png;base64 o desde un endpoint
}
