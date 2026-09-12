import type { Verdict, VerificationStatus } from "@/lib/db/schema"
import { nombreProvincia } from "@/lib/ui/verdict"

/**
 * Reading, filtering and labelling the lote list — the whole of it, with no
 * React and no database.
 *
 * The shape below is what the list reads, declared structurally rather than
 * imported from `service.ts`: that module opens a database connection at import
 * time, and this logic is the part worth testing. `LoteSummary` satisfies it.
 */
export type LoteListado = {
  id: string
  nombre: string
  provincia: string
  areaHa: number
  verdict: Verdict | null
  verificationStatus: VerificationStatus | null
  verificationStale: boolean
  verifiedAt: string | null
  failureCode: string | null
}

export type ClaveEstado =
  | Verdict
  | "sin_verificar"
  | "contorno_cambiado"
  | "sin_cobertura"
  | "no_se_pudo"

export type EstadoLote = {
  clave: ClaveEstado
  /** The words. Colour never travels without them. */
  etiqueta: string
  /** Which silence this is, when it is one. Null when there is a verdict. */
  nota: string | null
  /** True only for a real verdict — the one case the row fills with colour. */
  esVeredicto: boolean
  verdict: Verdict | null
}

const ETIQUETA_VEREDICTO: Record<Verdict, string> = {
  verde: "Sin observaciones",
  amarillo: "Con observaciones",
  rojo: "No cumple",
}

/**
 * What the row says about a lote, in one place.
 *
 * Order matters. Staleness is read before anything else because a verdict about
 * a polygon that has since changed is not a verdict about this lote — the
 * service already withholds it, and reading the flag first keeps that true even
 * if some future caller forgets.
 *
 * An uncovered province is split out from an ordinary failure on purpose: the
 * list used to tell both of them "Reintentar", and retrying is exactly what
 * cannot work when we simply do not have the layer.
 */
export function estadoDeLote(lote: LoteListado): EstadoLote {
  if (lote.verificationStale) {
    return {
      clave: "contorno_cambiado",
      etiqueta: "Sin verificar",
      nota: "cambió el contorno",
      esVeredicto: false,
      verdict: null,
    }
  }

  if (lote.verdict) {
    return {
      clave: lote.verdict,
      etiqueta: ETIQUETA_VEREDICTO[lote.verdict],
      nota: null,
      esVeredicto: true,
      verdict: lote.verdict,
    }
  }

  if (lote.verificationStatus === "failed") {
    return lote.failureCode === "PROVINCE_NOT_COVERED"
      ? {
          clave: "sin_cobertura",
          etiqueta: "Sin cobertura",
          nota: null,
          esVeredicto: false,
          verdict: null,
        }
      : {
          clave: "no_se_pudo",
          etiqueta: "Sin verificar",
          nota: "falló el intento",
          esVeredicto: false,
          verdict: null,
        }
  }

  return {
    clave: "sin_verificar",
    etiqueta: "Sin verificar",
    nota: null,
    esVeredicto: false,
    verdict: null,
  }
}

/** The buckets the estado filter offers, in the order it offers them. */
export const FILTROS_ESTADO = [
  "verde",
  "amarillo",
  "rojo",
  "sin_verificar",
] as const

export type FiltroEstado = (typeof FILTROS_ESTADO)[number]

export const ETIQUETA_FILTRO: Record<FiltroEstado, string> = {
  verde: "Sin observaciones",
  amarillo: "Con observaciones",
  rojo: "No cumple",
  sin_verificar: "Sin verificar",
}

/**
 * Every silence answers to one bucket. Someone filtering for "Sin verificar" is
 * asking what still stands between them and the paper; which flavour of missing
 * answer each lote has is a row-level detail, not a filter.
 */
const bucketDe = (lote: LoteListado): FiltroEstado => {
  const { clave } = estadoDeLote(lote)
  return clave === "verde" || clave === "amarillo" || clave === "rojo"
    ? clave
    : "sin_verificar"
}

export type Criterios = {
  texto: string
  estado: FiltroEstado | "todos"
  provincia: string | "todas"
}

export const CRITERIOS_VACIOS: Criterios = {
  texto: "",
  estado: "todos",
  provincia: "todas",
}

/**
 * Case and accent folded, so "sonada" finds "La Soñada".
 *
 * A producer typing a field name with one thumb in the sun does not reach for
 * the accent key, and the ñ is on this keyboard but the í is two taps away.
 */
export const normalizarTexto = (valor: string): string =>
  valor
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()

export function hayCriteriosActivos(criterios: Criterios): boolean {
  return (
    criterios.texto.trim() !== "" ||
    criterios.estado !== "todos" ||
    criterios.provincia !== "todas"
  )
}

/**
 * Presentation only: the collection that reaches the map is the full one, and
 * this decides nothing but which rows are drawn. The incoming order — most
 * recently touched first, straight from the query — is preserved.
 */
export function filtrarLotes(
  lotes: LoteListado[],
  criterios: Criterios
): LoteListado[] {
  const buscado = normalizarTexto(criterios.texto)

  return lotes.filter((lote) => {
    if (buscado !== "" && !normalizarTexto(lote.nombre).includes(buscado)) {
      return false
    }
    if (criterios.estado !== "todos" && bucketDe(lote) !== criterios.estado) {
      return false
    }
    if (
      criterios.provincia !== "todas" &&
      lote.provincia !== criterios.provincia
    ) {
      return false
    }
    return true
  })
}

/** Which estado buckets these lotes actually occupy, in canonical order. */
export function opcionesDeEstado(lotes: LoteListado[]): FiltroEstado[] {
  const presentes = new Set(lotes.map(bucketDe))
  return FILTROS_ESTADO.filter((filtro) => presentes.has(filtro))
}

export function contarPorEstado(
  lotes: LoteListado[]
): Record<FiltroEstado, number> {
  const conteo: Record<FiltroEstado, number> = {
    verde: 0,
    amarillo: 0,
    rojo: 0,
    sin_verificar: 0,
  }
  for (const lote of lotes) conteo[bucketDe(lote)] += 1
  return conteo
}

/** Each province these lotes sit in, once, sorted the way Spanish sorts. */
export function opcionesDeProvincia(
  lotes: LoteListado[]
): { slug: string; nombre: string }[] {
  const porSlug = new Map<string, string>()
  for (const lote of lotes) {
    if (!porSlug.has(lote.provincia)) {
      porSlug.set(lote.provincia, nombreProvincia(lote.provincia))
    }
  }

  return [...porSlug]
    .map(([slug, nombre]) => ({ slug, nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es-AR"))
}
