import { notFound } from "next/navigation"

import { DetalleLote } from "@/components/lotes/detalle-lote"
import { requireUser } from "@/lib/auth/guard"
import { findLatestVerification, findLote } from "@/lib/lotes/service"

export default async function LotePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await requireUser()

  const lote = await findLote(user.id, id)
  if (!lote) notFound()

  return (
    <DetalleLote
      lote={lote}
      verificacionInicial={await findLatestVerification(user.id, id)}
    />
  )
}
