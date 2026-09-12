import { ImageResponse } from "next/og"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

import { LOTE_PATH } from "@/lib/landing/ejemplo-capas.generated"

export const alt = "Lote Limpio: tu lote, con evidencia"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

/**
 * Every entry point (`pnpm --filter web dev|build|start`, Railway included)
 * runs with apps/web as the working directory, so one static path is enough.
 * The files are read per request, not at module scope, and the tracer ships
 * them through outputFileTracingIncludes (next.config.ts).
 */
const RUTA_FUENTE = join(process.cwd(), "assets", "fonts", "Archivo-Bold.ttf")
const RUTA_MARCA = join(process.cwd(), "public", "marca", "lote-limpio.png")

/** The lockup's own ratio, so the card never squashes it. */
const MARCA_ALTO = 48
const MARCA_ANCHO = 216

export default async function Image() {
  const [archivo, lockup] = await Promise.all([
    readFile(RUTA_FUENTE),
    readFile(RUTA_MARCA),
  ])
  // satori has no filesystem: the bytes travel inline or not at all.
  const marca = `data:image/png;base64,${lockup.toString("base64")}`

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "64px 72px",
        background: "#fafaf8",
        color: "#000000",
        fontFamily: "Archivo",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          height: "100%",
          width: 720,
        }}
      >
        {/* satori renders its own tree; next/image does not exist in here. */}
        <img src={marca} width={MARCA_ANCHO} height={MARCA_ALTO} alt="" />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <div
            style={{
              fontSize: 96,
              fontWeight: 700,
              lineHeight: 1.02,
              letterSpacing: -3,
            }}
          >
            Tu lote, con evidencia.
          </div>
          <div style={{ fontSize: 24, color: "#4a524c" }}>
            Trazabilidad EUDR · Córdoba, Santiago del Estero y Chaco
          </div>
        </div>
      </div>

      <svg viewBox="0 0 1440 1080" width={360} height={270}>
        <rect
          x="0.5"
          y="0.5"
          width="1439"
          height="1079"
          fill="none"
          stroke="#d5d9d2"
          strokeWidth="3"
        />
        <path
          d={LOTE_PATH}
          fill="rgba(0, 0, 0, 0.04)"
          stroke="#fafaf8"
          strokeWidth="14"
        />
        <path d={LOTE_PATH} fill="none" stroke="#000000" strokeWidth="6" />
      </svg>
    </div>,
    {
      ...size,
      fonts: [{ name: "Archivo", data: archivo, weight: 700, style: "normal" }],
    }
  )
}
