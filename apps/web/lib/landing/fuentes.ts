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
 * UMSEF (one entry, the three provinces collapsed) → OTBN ×3 → IGN.
 * Throws if any layer was downloaded on a different day than the manifest
 * was generated: the landing prints one consultation date, and a desynced
 * build would make that date a lie.
 */
export function mapearFuentes(m: ManifiestoFuentes): FuenteLanding[] {
  const entradas = [
    ...ORDEN_PROVINCIAS.map((p) => m.forestLoss[p]),
    ...ORDEN_PROVINCIAS.map((p) => m.otbn[p]),
    m.provincias,
  ]
  for (const entrada of entradas) {
    if (entrada.downloadedAt !== m.generatedAt) {
      throw new Error(
        `sources.json: downloadedAt ${entrada.downloadedAt} de «${entrada.label}» no coincide con generatedAt ${m.generatedAt}`
      )
    }
  }
  const consultadaEl = formatearConsulta(m.generatedAt)
  const umsef = m.forestLoss.cordoba

  return [
    {
      id: "umsef",
      titulo: "Pérdida de bosque nativo posterior a 2020 (UMSEF)",
      organismo: umsef.publisher,
      vigencia: umsef.vintage,
      instrumento: null,
      licencia: umsef.license,
      cobertura: ORDEN_PROVINCIAS.map((p) => NOMBRE_PROVINCIA[p]),
      url: umsef.sourceUrl,
      caveat: umsef.caveat,
      consultadaEl,
      rol: "verificacion",
    },
    ...ORDEN_PROVINCIAS.map((p): FuenteLanding => {
      const capa = m.otbn[p]
      return {
        id: `otbn-${p}`,
        titulo: `OTBN ${NOMBRE_PROVINCIA[p]}`,
        organismo: capa.publisher,
        vigencia: capa.vintage,
        instrumento: capa.legalInstrument,
        licencia: capa.license,
        cobertura: [NOMBRE_PROVINCIA[p]],
        url: capa.sourceUrl,
        caveat: capa.caveat,
        consultadaEl,
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
      consultadaEl,
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

const INSTRUMENTO_CALENDARIO =
  "Reglamento (UE) 2023/1115, art. 38, modificado por el Reglamento (UE) 2025/2650"

export const CALENDARIO_EUDR: readonly {
  fecha: string
  quien: string
  instrumento: string
}[] = [
  {
    fecha: "30/12/2026",
    quien: "Aplicación general: grandes y medianos operadores",
    instrumento: INSTRUMENTO_CALENDARIO,
  },
  {
    fecha: "30/06/2027",
    quien:
      "Micro y pequeñas empresas (salvo las ya alcanzadas por el EUTR, que mantienen el 30/12/2026)",
    instrumento: INSTRUMENTO_CALENDARIO,
  },
]

export const FECHA_VERIFICACION_CALENDARIO = "12/09/2026"

export const URL_COMISION_EUROPEA =
  "https://green-forum.ec.europa.eu/deforestation-regulation-implementation_en"
