import type { Metadata, Viewport } from "next"
import { Archivo } from "next/font/google"

import "@workspace/ui/globals.css"

/**
 * Archivo, by Omnibus-Type of Buenos Aires. An Argentine grotesque for an
 * Argentine field tool, and a workhorse at small sizes in bright light.
 */
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: "Lote Limpio",
  description:
    "Verificá tus lotes contra el reglamento europeo de deforestación y descargá el documento para el acopio.",
}

export const viewport: Viewport = {
  themeColor: "#fafaf8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR" className={`${archivo.variable} antialiased`}>
      <body className="bg-paper text-ink font-sans">{children}</body>
    </html>
  )
}
