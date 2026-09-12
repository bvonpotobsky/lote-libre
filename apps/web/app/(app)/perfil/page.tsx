import { PerfilProductor } from "@/components/perfil/perfil-productor"
import { requireUser } from "@/lib/auth/guard"

export default async function PerfilPage() {
  const user = await requireUser()
  return <PerfilProductor nombre={user.name} cuit={user.cuit} />
}
