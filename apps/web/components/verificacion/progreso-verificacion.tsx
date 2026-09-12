"use client"

import { useEffect, useState } from "react"

/**
 * The sources a verification crosses, in the order it crosses them.
 *
 * This is the only place in the product where they are named as work in
 * progress rather than as a footnote. Someone watching the screen for the first
 * time learns what the verdict is made of before they are handed the verdict.
 */
const PASOS = [
  "Consultando la pérdida forestal…",
  "Cruzando el Ordenamiento de Bosques Nativos…",
  "Generando el reporte…",
] as const

const DURACION_PASO_MS = 1_000

/**
 * The floor the request is held to IS how long the steps take to walk through:
 * a step nobody could read never happened. Derived rather than written down, so
 * a fourth source moves the floor with it.
 */
export const PISO_VERIFICACION_MS = PASOS.length * DURACION_PASO_MS

export function ProgresoVerificacion() {
  const [paso, setPaso] = useState(0)

  /*
   * Mounted for the length of one verification, so there is no state to reset:
   * the clock is born and dies with the panel.
   *
   * It stops on the last step instead of wrapping. A request slower than the
   * floor then rests on "Generando el reporte…" — still true, still the last
   * thing that happens — rather than looping back and claiming the forest loss
   * lookup is running a second time.
   */
  useEffect(() => {
    const reloj = window.setInterval(() => {
      setPaso((actual) => Math.min(actual + 1, PASOS.length - 1))
    }, DURACION_PASO_MS)
    return () => window.clearInterval(reloj)
  }, [])

  return (
    <section className="bg-field grid gap-3 rounded-lg p-4">
      {/*
        The list carries its state in colour, which is nothing to a screen
        reader, so it is hidden and the live region below says the one thing
        that actually changed. Reading three static lines on every tick would be
        noise, not access.
      */}
      <ul aria-hidden className="grid gap-2">
        {PASOS.map((texto, indice) => {
          const hecho = indice < paso
          const activo = indice === paso

          return (
            <li
              key={texto}
              className="grid grid-cols-[auto_1fr] items-baseline gap-x-3"
            >
              <span
                className={`mt-1 inline-block h-3 w-3 rounded-full border-2 ${
                  hecho
                    ? "border-ink bg-ink"
                    : activo
                      ? "border-ink"
                      : "border-line"
                }`}
              />
              <p
                className={`text-sm leading-snug ${
                  activo
                    ? "font-semibold"
                    : hecho
                      ? "text-ink-soft"
                      : "text-ink-soft opacity-50"
                }`}
              >
                {texto}
              </p>
            </li>
          )
        })}
      </ul>

      <p role="status" aria-live="polite" className="sr-only">
        {PASOS[paso]}
      </p>
    </section>
  )
}
