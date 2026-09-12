"use client"

import { useRef, type ReactNode } from "react"

import { useProgresoEscena } from "@/hooks/use-progreso-escena"

type Props = {
  children: ReactNode
  className?: string
}

/**
 * The only client boundary in the scene. It owns the section root the hook
 * writes to; the chapters and figures inside stay server components.
 */
export function EscenaCliente({ children, className }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useProgresoEscena(ref)

  return (
    <div ref={ref} className={className} data-capitulo="1">
      {children}
    </div>
  )
}
