import { EstadoVacio } from "@/components/lotes/estado-vacio"
import { ListaLotes } from "@/components/lotes/lista-lotes"
import { requireUser } from "@/lib/auth/guard"
import { listLotes } from "@/lib/lotes/service"

export default async function InicioPage() {
  const user = await requireUser()
  const lotes = await listLotes(user.id)

  return lotes.length === 0 ? <EstadoVacio /> : <ListaLotes lotes={lotes} />
}
