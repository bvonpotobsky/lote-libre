"use client"

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react"

import { retardo } from "@/lib/landing/movimiento"

type Props = {
  children: ReactNode
  /** Position in a staggered group; the delay is capped by `retardo`. */
  indice?: number
  as?: "div" | "li" | "section"
  className?: string
}

/**
 * Marks its element `data-visible` the first time it enters the viewport.
 * The hidden initial state lives in landing.css and is gated on
 * `html[data-js]`, so a visitor without JavaScript never sees a blank block.
 * The attribute is set imperatively: no re-render, no state.
 */
export function RevelarEnVista({
  children,
  indice = 0,
  as = "div",
  className,
}: Props) {
  // Typed as a div for the JSX checker; a <li> or <section> answers the
  // same setAttribute call at runtime.
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === "undefined") {
      el.setAttribute("data-visible", "")
      return
    }
    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((entrada) => entrada.isIntersecting)) {
          el.setAttribute("data-visible", "")
          observador.disconnect()
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    )
    observador.observe(el)
    return () => observador.disconnect()
  }, [])

  const style = { "--retardo": `${retardo(indice)}ms` } as CSSProperties
  // The tag is chosen at runtime; the checker only needs one element type.
  const Etiqueta = as as "div"

  return (
    <Etiqueta ref={ref} data-revelar="" className={className} style={style}>
      {children}
    </Etiqueta>
  )
}
