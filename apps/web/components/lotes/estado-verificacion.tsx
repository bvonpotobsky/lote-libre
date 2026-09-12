import type { EstadoLote } from "@/lib/lotes/listado"
import { VERDICT_UI } from "@/lib/ui/verdict"

/**
 * What the verification says about one lote, as a block of words.
 *
 * Colour never travels alone: roughly one man in twelve cannot separate red
 * from green, and this audience is mostly men working outdoors. The words are
 * the answer and the colour is the shortcut.
 *
 * Only a verdict gets filled. Every silence — never checked, outline edited,
 * attempt failed, province not covered — is drawn as a dashed outline instead,
 * which in this system already means "acá va a haber un dato". Filling those in
 * `field` grey, as the row used to, made a missing answer look like a fourth
 * verdict; a missing answer is never a result.
 */
export function EstadoVerificacion({ estado }: { estado: EstadoLote }) {
  const ui = estado.verdict ? VERDICT_UI[estado.verdict] : null

  return (
    <span
      className={
        /*
         * 8rem, one line, every label. "Con observaciones" is the widest at
         * 110px and the box holds 120px of it, so no state ever wraps and no
         * row is taller than its neighbour for the sake of a longer word.
         */
        ui
          ? `${ui.bg} ${ui.texto} flex w-32 max-w-full items-center justify-center rounded-md px-1 py-1.5 text-center text-xs leading-tight font-bold text-balance`
          : "flex w-32 max-w-full items-center justify-center rounded-md border border-dashed border-line px-1 py-1.5 text-center text-xs leading-tight font-semibold text-balance text-ink-soft"
      }
    >
      {estado.etiqueta}
    </span>
  )
}
