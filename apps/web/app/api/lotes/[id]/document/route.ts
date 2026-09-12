import { requireUser } from "@/lib/auth/guard"
import { fail, withRoute } from "@/lib/http/responses"
import { findLatestVerification, findLote } from "@/lib/lotes/service"
import { resolveDocument } from "@/lib/services/document-store"
import { renderDueDiligencePdf } from "@/lib/services/pdf"

type Context = { params: Promise<{ id: string }> }

const slug = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "lote"

export const GET = withRoute(async (_request: Request, context: Context) => {
  const user = await requireUser()
  const { id } = await context.params

  const lote = await findLote(user.id, id)
  if (!lote) return fail("NOT_FOUND")

  const verification = await findLatestVerification(user.id, id)
  // A document without a completed verification would assert a verdict that
  // does not exist. Refusing is the only honest answer.
  if (!verification || verification.status !== "ready") {
    return fail("VERIFICATION_PENDING")
  }

  const { payload, hash } = await resolveDocument(lote, verification, {
    nombre: user.name,
    email: user.email,
  })

  const pdf = await renderDueDiligencePdf(payload, hash)
  const fecha = payload.verificacion.fecha.slice(0, 10)

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.byteLength),
      "Content-Disposition": `attachment; filename="debida-diligencia-${slug(lote.nombre)}-${fecha}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  })
})
