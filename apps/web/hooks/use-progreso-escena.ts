"use client"

import { useEffect, type RefObject } from "react"

import {
  estadoEscena,
  progresoDeRect,
  type Capitulo,
} from "@/lib/landing/escena"

/**
 * Only a wide viewport with motion welcome gets the sticky, scroll-driven
 * scene. Everyone else keeps the three stacked chapters the server rendered.
 */
const CONDICIONES = [
  "(min-width: 1024px)",
  "(prefers-reduced-motion: no-preference)",
] as const

/** The stage sticks below the 3.5rem header, so progress starts there too. */
const ALTO_ENCABEZADO = 56

const VARIABLES = ["--p", "--resalte", "--separacion", "--papel"] as const

/**
 * Drives the scene from scroll position without touching React state.
 *
 * One passive scroll listener, one rAF per frame at most, four custom
 * properties written on the section root (custom properties inherit, so the
 * sticky figure reads them) and a `data-capitulo` attribute that changes
 * three times in the whole scroll. The math lives in lib/landing/escena.ts.
 */
export function useProgresoEscena(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const raiz = ref.current
    if (!raiz) return

    const medios = CONDICIONES.map((consulta) => window.matchMedia(consulta))
    let cuadro: number | null = null
    let capitulo: Capitulo | null = null
    let activa = false

    const medir = () => {
      cuadro = null
      const rect = raiz.getBoundingClientRect()
      const progreso = progresoDeRect(
        rect.top - ALTO_ENCABEZADO,
        rect.height,
        window.innerHeight - ALTO_ENCABEZADO
      )
      const estado = estadoEscena(progreso)
      // Raw progress feeds the parallax; the eased values feed everything else.
      raiz.style.setProperty("--p", progreso.toFixed(4))
      raiz.style.setProperty("--resalte", estado.resalte.toFixed(4))
      raiz.style.setProperty("--separacion", estado.separacion.toFixed(4))
      raiz.style.setProperty("--papel", estado.papel.toFixed(4))
      if (estado.capitulo !== capitulo) {
        capitulo = estado.capitulo
        raiz.setAttribute("data-capitulo", String(capitulo))
      }
    }

    const programar = () => {
      if (cuadro === null) cuadro = window.requestAnimationFrame(medir)
    }

    const activar = () => {
      if (activa) return
      activa = true
      raiz.setAttribute("data-escena", "activa")
      window.addEventListener("scroll", programar, { passive: true })
      window.addEventListener("resize", programar)
      medir()
    }

    const desactivar = () => {
      if (!activa) return
      activa = false
      window.removeEventListener("scroll", programar)
      window.removeEventListener("resize", programar)
      if (cuadro !== null) window.cancelAnimationFrame(cuadro)
      cuadro = null
      raiz.removeAttribute("data-escena")
      for (const variable of VARIABLES) raiz.style.removeProperty(variable)
      capitulo = null
      raiz.setAttribute("data-capitulo", "1")
    }

    const evaluar = () => {
      if (medios.every((medio) => medio.matches)) activar()
      else desactivar()
    }

    evaluar()
    for (const medio of medios) medio.addEventListener("change", evaluar)

    return () => {
      desactivar()
      for (const medio of medios) medio.removeEventListener("change", evaluar)
    }
  }, [ref])
}
