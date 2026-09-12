import manifiesto from "@/data/sources.json"
import { CadenaExigencia } from "@/components/landing/cadena-exigencia"
import { Cierre } from "@/components/landing/cierre"
import { Documento } from "@/components/landing/documento"
import { DosFotos } from "@/components/landing/dos-fotos"
import { EncabezadoMarketing } from "@/components/landing/encabezado-marketing"
import { EscenaTerritorio } from "@/components/landing/escena-territorio"
import { Fuentes } from "@/components/landing/fuentes"
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
        <CadenaExigencia />
        <EscenaTerritorio />
        <DosFotos />
        <Resultados />
        <Documento fuentes={fuentes} />
        <Fuentes fuentes={fuentes} />
        <Cierre />
      </main>
      <PieMarketing />
    </div>
  )
}
