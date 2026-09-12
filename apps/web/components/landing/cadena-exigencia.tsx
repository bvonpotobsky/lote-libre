import { RevelarEnVista } from "./revelar-en-vista"
import { TrazoLote } from "./trazo-lote"

const NODOS = [
  {
    nombre: "Operador en la UE",
    rol: "Debe presentar la debida diligencia",
  },
  { nombre: "Exportador", rol: "Responde ante el operador" },
  { nombre: "Acopio", rol: "Pide el papel antes de comprar" },
  { nombre: "Productor", rol: "Tiene el lote" },
]

/**
 * The demand travels down the chain. One line runs through the four nodes
 * and travels once when the list scrolls into view (landing.css `.cadena`);
 * the last node connects to the lote.
 */
export function CadenaExigencia() {
  const ultimo = NODOS.length - 1
  return (
    <section className="landing__seccion landing__papel">
      <div className="landing__marco flex flex-col gap-10 lg:gap-14">
        <div className="flex flex-col gap-4">
          <h2 className="landing__h2">La exigencia baja hasta el productor.</h2>
          <p className="landing__cuerpo text-ink-soft">
            La cadena puede pedirte información sobre el origen de tu
            producción.
          </p>
        </div>

        <RevelarEnVista>
          <ol className="cadena flex flex-col gap-8 pl-6 lg:flex-row lg:gap-6 lg:pt-6 lg:pl-0">
            {NODOS.map((nodo, i) => (
              <li
                key={nodo.nombre}
                className="cadena__nodo relative flex flex-col gap-1 lg:flex-1"
              >
                <span aria-hidden="true" className="cadena__marca" />
                <span className="font-semibold">{nodo.nombre}</span>
                <span className="text-sm text-ink-soft">{nodo.rol}</span>
                {i === ultimo && (
                  <span className="mt-3 flex items-center gap-3 text-sm">
                    <TrazoLote recorte className="h-10 w-10 shrink-0" />
                    <span className="text-ink-soft">tu lote</span>
                  </span>
                )}
              </li>
            ))}
          </ol>
        </RevelarEnVista>
      </div>
    </section>
  )
}
