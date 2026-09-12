import { VerificacionProductor } from "@/components/verificacion/verificacion-productor"
import { requireUser } from "@/lib/auth/guard"

export default async function VerificacionProductorPage() {
  const user = await requireUser()
  return <VerificacionProductor cuit={user.cuit} />
}
