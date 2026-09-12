const FILAS = [
  {
    termino: "Imágenes satelitales",
    texto:
      "Evidencia visual y contexto. Sentinel-2 muestra el territorio antes y ahora; no distingue por sí sola una cosecha de un desmonte.",
  },
  {
    termino: "Capas oficiales",
    texto:
      "Fuentes utilizadas para las comprobaciones documentadas: pérdida de bosque nativo (UMSEF) y ordenamiento de bosques nativos (OTBN) de cada provincia.",
  },
]

/** The central message, in ink. Typographic only: no comparator, no NDVI. */
export function DosFotos() {
  return (
    <section className="landing__seccion bg-ink text-paper">
      <div className="landing__marco flex flex-col gap-10 lg:gap-14">
        <div className="flex flex-col gap-5">
          <h2 className="landing__h2">
            Dos fotos no cuentan toda la historia.
          </h2>
          <p className="landing__cuerpo text-line">
            Un cambio de color puede ser una cosecha. Las imágenes satelitales
            aportan contexto; el resultado documentado se apoya en las capas
            oficiales y en el alcance de los datos disponibles.
          </p>
        </div>

        <dl className="border-t border-paper/20">
          {FILAS.map((fila) => (
            <div
              key={fila.termino}
              className="grid gap-2 border-b border-paper/20 py-6 lg:grid-cols-12 lg:gap-8"
            >
              <dt className="text-lg font-semibold lg:col-span-4">
                {fila.termino}
              </dt>
              <dd className="max-w-[60ch] leading-relaxed text-line lg:col-span-8">
                {fila.texto}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
