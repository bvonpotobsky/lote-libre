import { formatearCuit } from "@/lib/profile/cuit"

export type ProducerCheck = {
  id: "sisa" | "renspa" | "carta-porte"
  organismo: string
  titulo: string
  estado: "Habilitado" | "No habilitado" | "No encontrado" | "Vigente" | "No vigente" | "No aplica" | "Requiere regularización"
  detalle: string
}

export type ProducerVerification = {
  cuit: string
  consultadoEn: string
  simulado: true
  checks: ProducerCheck[]
}

/** Temporary deterministic data until integrations with ARCA and SENASA exist. */
export function verificarProductor(cuit: string, now = new Date()): ProducerVerification {
  return {
    cuit: formatearCuit(cuit),
    consultadoEn: now.toISOString(),
    simulado: true,
    checks: [
      {
        id: "sisa",
        organismo: "SISA / ARCA",
        titulo: "Registro en el Sistema de Información Simplificado Agrícola",
        estado: "Habilitado",
        detalle: "El productor figura registrado y habilitado en SISA.",
      },
      {
        id: "renspa",
        organismo: "RENSPA / SENASA",
        titulo: "RENSPA de explotación agrícola",
        estado: "Vigente",
        detalle: "Se encontró un registro agrícola vigente asociado al CUIT.",
      },
      {
        id: "carta-porte",
        organismo: "Carta de Porte Electrónica",
        titulo: "Habilitación para trasladar granos",
        estado: "Habilitado",
        detalle: "El productor figura habilitado para gestionar la Carta de Porte.",
      },
    ],
  }
}
