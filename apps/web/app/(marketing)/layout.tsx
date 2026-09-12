import type { Metadata } from "next"

import "./landing.css"

/**
 * The public landing.
 *
 * This route group is the one surface where the product presents itself
 * instead of working. It deliberately departs from DESIGN.md on motion,
 * perspective, grain and display size; every such rule lives in landing.css
 * and is scoped under `.landing`, so the app screens stay as flat and still
 * as the design system asks.
 *
 * `/` is dynamic because the header reads the real session (never the
 * cookie: see proxy.ts for the redirect loop that caused). The page is
 * server-rendered strings plus one static image, so the cost is TTFB only.
 * A future PPR split could wrap the session-dependent header in Suspense.
 */

const TITULO = "Lote Limpio: tu lote, con evidencia"
const DESCRIPCION =
  "Verificá tu lote con capas oficiales (UMSEF y OTBN), mirá el cambio en imágenes Sentinel-2 y generá el documento de respaldo para el acopio. Trazabilidad EUDR para soja y ganadería en Córdoba, Santiago del Estero y Chaco."

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRIPCION,
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "Lote Limpio",
    title: TITULO,
    description: DESCRIPCION,
  },
}

export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      {/* Marks JS as available before first paint, so the reveal and draw
          effects can hide their initial state without ever hiding content
          from a visitor whose script never ran. */}
      <script
        dangerouslySetInnerHTML={{
          __html: "document.documentElement.dataset.js=''",
        }}
      />
      {children}
    </>
  )
}
