import { redirect } from "next/navigation"

import { Encabezado } from "@/components/app/encabezado"
import { getCurrentUser } from "@/lib/auth/guard"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // proxy.ts only checks that a cookie exists. This is the real session read.
  const user = await getCurrentUser()
  if (!user) redirect("/ingresar")

  return (
    <div className="flex min-h-svh flex-col">
      <Encabezado nombre={user.name} />
      <main className="flex-1">{children}</main>
    </div>
  )
}
