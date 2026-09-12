import { Suspense } from "react"

import { FormularioAcceso } from "@/components/auth/formulario-acceso"

export default function IngresarPage() {
  return (
    <Suspense>
      <FormularioAcceso modo="ingresar" />
    </Suspense>
  )
}
