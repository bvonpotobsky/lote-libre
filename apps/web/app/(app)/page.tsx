import { EstadoVacio } from "@/components/lotes/estado-vacio"
import { VistaLotes } from "@/components/lotes/vista-lotes"
import { requireUser } from "@/lib/auth/guard"
import { listLotesConGeometria } from "@/lib/lotes/service"

export default async function InicioPage() {
  const user = await requireUser()
  const lotes = await listLotesConGeometria(user.id)

  return lotes.length === 0 ? <EstadoVacio /> : <VistaLotes lotes={lotes} />
}
