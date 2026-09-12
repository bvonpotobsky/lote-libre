import Image from "next/image"

import marca from "@/public/marca/lote-limpio.png"

type Props = {
  /** Sets the height; the width follows from the 4.5:1 lockup. */
  className?: string
  prioritaria?: boolean
}

/**
 * The lockup, on every surface that carries the brand: the landing's header and
 * footer, the way in, and the app's own header. One image at one height — see
 * «Marca» in DESIGN.md.
 *
 * The file is imported, never referenced by path. A plain `/marca/…` URL is
 * caught by proxy.ts and redirected to /ingresar for a visitor without a
 * session; the static import serves it from /_next, which the matcher excludes.
 *
 * `sizes` is a fixed 96px rather than a viewport fraction because the painted
 * width is known and does not move with the layout. The browser still scales it
 * by the device ratio when it picks from the srcset.
 */
export function Marca({ className, prioritaria = false }: Props) {
  return (
    <Image
      src={marca}
      alt="Lote Limpio"
      priority={prioritaria}
      sizes="96px"
      className={className}
    />
  )
}
