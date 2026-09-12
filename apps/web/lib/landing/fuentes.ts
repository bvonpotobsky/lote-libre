/**
 * The landing's source list, derived from the provenance manifest the PDF
 * cites (data/sources.json), so the two can never disagree.
 *
 * Pure by construction: the manifest comes in as an argument. The page does
 * `import manifiesto from "@/data/sources.json"`; the tests use a fixture.
 * Do not import the JSON here.
 */

export type RolFuente = "verificacion" | "evidencia" | "referencia"

export type FuenteLanding = {
  id: string
  titulo: string
  organismo: string
  vigencia: string | null
  instrumento: string | null
  licencia: string | null
  cobertura: readonly string[] | null
  url: string | null
  caveat: string | null
  /** dd/mm/yyyy, from the manifest's downloadedAt. */
  consultadaEl: string
  rol: RolFuente
}

type Provincia = "cordoba" | "chaco" | "santiago-del-estero"

type EntradaOtbn = {
  label: string
  sourceUrl: string
  publisher: string
  vintage: string
  legalInstrument: string
  license: string
  downloadedAt: string
  caveat: string
}

type EntradaPerdida = {
  label: string
  sourceUrl: string
  publisher: string
  vintage: string
  license: string
  downloadedAt: string
  caveat: string
}

type EntradaProvincias = {
  label: string
  sourceUrl: string
  publisher: string
  license: string
  downloadedAt: string
  caveat: string
}

/** Structural mirror of data/sources.json, limited to what the landing reads. */
export type ManifiestoFuentes = {
  generatedAt: string
  otbn: Record<Provincia, EntradaOtbn>
  forestLoss: Record<Provincia, EntradaPerdida>
  provincias: EntradaProvincias
}

const NOMBRE_PROVINCIA: Record<Provincia, string> = {
  cordoba: "Córdoba",
  chaco: "Chaco",
  "santiago-del-estero": "Santiago del Estero",
}

const ORDEN_PROVINCIAS: readonly Provincia[] = [
  "cordoba",
  "chaco",
  "santiago-del-estero",
]

/** dd/mm/yyyy from an ISO date. */
export function formatearConsulta(iso: string): string {
  const [anio, mes, dia] = iso.split("-")
  return `${dia}/${mes}/${anio}`
}

/**
 * The layers whose download date drifted from the manifest's generatedAt.
 *
 * This used to be a throw inside mapearFuentes, which runs in the landing's
 * server component: one re-downloaded layer took the home page down with a
 * 500. Drift is a claim about committed data, so it is asserted in
 * fuentes.test.ts instead, and each source simply prints its own date.
 */
export function desincronizadas(m: ManifiestoFuentes): string[] {
  return todasLasEntradas(m)
    .filter((entrada) => entrada.downloadedAt !== m.generatedAt)
    .map((entrada) => entrada.label)
}

function todasLasEntradas(
  m: ManifiestoFuentes
): { label: string; downloadedAt: string }[] {
  return [
    ...ORDEN_PROVINCIAS.map((p) => m.forestLoss[p]),
    ...ORDEN_PROVINCIAS.map((p) => m.otbn[p]),
    m.provincias,
  ]
}

/** `1998-2024 (filtrado a periodo >= 2021)` → `Períodos 2021 a 2024`. */
const FILTRO_DE_PERIODO = /^\d{4}-(\d{4}) \(filtrado a periodo >= (\d{4})\)$/

/**
 * The manifest's vintage as a reader can use it.
 *
 * UMSEF publishes one 1998-2024 layer and we query a slice of it, so the
 * manifest records the query — `1998-2024 (filtrado a periodo >= 2021)`. That
 * string is provenance the PDF prints verbatim (lib/services/forest-loss.ts),
 * so it is not edited at the source; it is read out loud here instead.
 * Anything else passes through untouched.
 */
export function vigenciaLegible(vintage: string): string {
  const coincidencia = FILTRO_DE_PERIODO.exec(vintage)
  if (coincidencia === null) return vintage
  const [, fin, desde] = coincidencia
  return `Períodos ${desde} a ${fin}`
}

/** UMSEF (one entry, the three provinces collapsed) → OTBN ×3 → IGN. */
export function mapearFuentes(m: ManifiestoFuentes): FuenteLanding[] {
  const umsef = m.forestLoss.cordoba

  return [
    {
      id: "umsef",
      titulo: "Pérdida de bosque nativo posterior a 2020 (UMSEF)",
      organismo: umsef.publisher,
      vigencia: vigenciaLegible(umsef.vintage),
      instrumento: null,
      licencia: umsef.license,
      cobertura: ORDEN_PROVINCIAS.map((p) => NOMBRE_PROVINCIA[p]),
      url: umsef.sourceUrl,
      caveat: umsef.caveat,
      consultadaEl: formatearConsulta(umsef.downloadedAt),
      rol: "verificacion",
    },
    ...ORDEN_PROVINCIAS.map((p): FuenteLanding => {
      const capa = m.otbn[p]
      return {
        id: `otbn-${p}`,
        titulo: `OTBN ${NOMBRE_PROVINCIA[p]}`,
        organismo: capa.publisher,
        vigencia: vigenciaLegible(capa.vintage),
        instrumento: capa.legalInstrument,
        licencia: capa.license,
        cobertura: [NOMBRE_PROVINCIA[p]],
        url: capa.sourceUrl,
        caveat: capa.caveat,
        consultadaEl: formatearConsulta(capa.downloadedAt),
        rol: "verificacion",
      }
    }),
    {
      id: "ign",
      titulo: m.provincias.label,
      organismo: m.provincias.publisher,
      vigencia: null,
      instrumento: null,
      licencia: m.provincias.license,
      cobertura: null,
      url: m.provincias.sourceUrl,
      caveat: m.provincias.caveat,
      consultadaEl: formatearConsulta(m.provincias.downloadedAt),
      rol: "referencia",
    },
  ]
}

/** Added by hand: the imagery is evidence, never a verification layer. */
export const FUENTE_COPERNICUS: FuenteLanding = {
  id: "sentinel-2",
  titulo: "Sentinel-2 (Copernicus)",
  organismo:
    "Agencia Espacial Europea / Comisión Europea — Copernicus Data Space Ecosystem",
  vigencia: null,
  instrumento: null,
  licencia: "Datos Copernicus Sentinel, de acceso libre, pleno y abierto",
  cobertura: null,
  url: "https://dataspace.copernicus.eu/",
  caveat:
    "Aporta evidencia visual y contexto. No es una capa de verificación: el resultado documentado no sale de las imágenes.",
  consultadaEl: "",
  rol: "evidencia",
}
