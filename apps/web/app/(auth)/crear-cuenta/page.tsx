import { Suspense } from "react"

import { FormularioAcceso } from "@/components/auth/formulario-acceso"

export default function CrearCuentaPage() {
  return (
    <Suspense>
      <FormularioAcceso modo="crear" />
    </Suspense>
  )
}
