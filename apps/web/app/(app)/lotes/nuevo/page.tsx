import { Suspense } from "react"

import { CargarLote } from "@/components/lotes/cargar-lote"

export default function NuevoLotePage() {
  return (
    <Suspense>
      <CargarLote />
    </Suspense>
  )
}
