import manifiesto from "@/data/sources.json"
import { Cierre } from "@/components/landing/cierre"
import { Documento } from "@/components/landing/documento"
import { EncabezadoMarketing } from "@/components/landing/encabezado-marketing"
import { AlcanceFuentes } from "@/components/landing/alcance-fuentes"
import { EscenaTerritorio } from "@/components/landing/escena-territorio"
import { EvidenciaSatelital } from "@/components/landing/evidencia-satelital"
import { Hero } from "@/components/landing/hero"
import { PieMarketing } from "@/components/landing/pie-marketing"
import { Resultados } from "@/components/landing/resultados"
import { getCurrentUser } from "@/lib/auth/guard"
import {
  FUENTE_COPERNICUS,
  mapearFuentes,
  type ManifiestoFuentes,
} from "@/lib/landing/fuentes"

export default async function LandingPage() {
  // The real session, the same source the app shell uses; never the cookie.
  const usuario = await getCurrentUser()
  const fuentes = [
    ...mapearFuentes(manifiesto as ManifiestoFuentes),
    FUENTE_COPERNICUS,
  ]

  return (
    <div className="landing">
      <EncabezadoMarketing sesion={usuario !== null} />
      <main>
        <Hero />
        <EscenaTerritorio />
        <EvidenciaSatelital />
        <Resultados />
        <Documento fuentes={fuentes} />
        <AlcanceFuentes fuentes={fuentes} />
        <Cierre />
      </main>
      <PieMarketing />
    </div>
  )
}
