# Aptitud legal y exportabilidad — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exponer el reparto de superficie del lote entre las cuatro categorías del OTBN como un eje propio —aptitud legal— junto al semáforo EUDR existente, en la app, en el PDF y en la landing.

**Architecture:** El reparto por categoría ya se calcula en `overlapByKey` y se descarta en `lookupOtbn`. Se lo conserva en un tipo nuevo, se lo persiste en una columna nueva de `lote_verifications`, y se lo presenta por un módulo puro de `lib/ui/`. `verdict.ts` no se toca: el semáforo sigue recibiendo la misma entrada y devolviendo la misma salida.

**Tech Stack:** Next.js 15 (App Router) · React 19 · TypeScript estricto · Drizzle ORM + PostgreSQL (sin PostGIS) · Turf.js · @react-pdf/renderer · Tailwind v4 · Vitest.

**Spec:** `docs/superpowers/specs/2026-09-12-reposicionamiento-aptitud-exportabilidad-design.md`

## Global Constraints

- **Vitest solo ve `lib/**/*.test.ts`, environment `node`.** (`apps/web/vitest.config.ts:6`.) No hay jsdom ni testing-library: **los componentes React no se pueden testear**. Toda lógica nueva que merezca un test vive en `lib/` como función pura, y el componente solo la renderiza.
- **Comando de tests:** `pnpm --filter web test` (o `pnpm --filter web test:watch`).
- **Identificadores, tipos y comentarios de código: en inglés.** Copy de interfaz, PDF y documentos: castellano rioplatense con voseo. Es la convención vigente del repo.
- **Hectáreas siempre enteras.** Las capas del OTBN son 1:250 000 y sus metadatos admiten que «no refleja estrictamente el OTBN aprobado por la ALA». Un decimal sería una mentira de precisión.
- **Nunca un total único de «hectáreas transformables».** Se imprimen los cuatro baldes por separado; el lector suma.
- **El caveat viaja pegado al número**, en pantalla y en el PDF.
- **`sin_cobertura` no produce reparto.** Ausencia de dato nunca se presenta como distribución.
- **`lib/services/verdict.ts` no se modifica en ningún task.**
- **Commits:** conventional, en inglés, descriptivos. Sin líneas de atribución.

---

## File Structure

**Se crean**

- `apps/web/lib/services/otbn.test.ts` — tests del reparto. Hoy no existe ningún test propio de `otbn.ts`.
- `apps/web/lib/ui/aptitud.ts` — módulo puro de presentación: convierte el reparto en filas listas para renderizar. Es el único lugar donde se decide cómo se lee un número.
- `apps/web/lib/ui/aptitud.test.ts` — tests de ese módulo.
- `apps/web/components/verificacion/panel-aptitud.tsx` — la sección de aptitud en `/lotes/:id`.
- `apps/web/components/landing/aptitud-ejemplo.ts` — el reparto **ficticio** de la landing (ver Task 9 y la nota editorial).

**Se modifican**

- `apps/web/lib/db/schema.ts` — tipos `OtbnBucket` y `OtbnShare`; columna `otbn_breakdown`.
- `apps/web/lib/services/otbn.ts` — función pura `buildOtbnBreakdown`; `OtbnResult` gana `breakdown`.
- `apps/web/lib/services/verification.ts:71-72` — persiste el reparto.
- `apps/web/components/verificacion/panel-veredicto.tsx` — se le saca el bloque OTBN (pasa a aptitud) y se le extrae el badge.
- `apps/web/components/lotes/detalle-lote.tsx:309` — orden de las secciones del panel.
- `apps/web/lib/services/document.ts` — `PAYLOAD_VERSION` 1 → 2; `otbn.reparto`.
- `apps/web/lib/services/document.test.ts` — regresión de huella v1.
- `apps/web/lib/services/pdf.tsx` — sección «Aptitud legal».
- `apps/web/components/landing/{hero,cierre,resultados,documento}.tsx` — el pitch.
- `apps/web/PRODUCT.md`, `apps/web/DESIGN.md` — el reposicionamiento escrito.

**Por qué `lib/ui/aptitud.ts` existe como archivo aparte:** es la frontera testeable. `panel-aptitud.tsx` y `pdf.tsx` consumen las mismas filas; si el formateo viviera en cualquiera de los dos, no habría forma de testearlo bajo la config de vitest de este repo.

---

## Tajo 1 — El cálculo

### Task 1: La función pura del reparto

**Files:**
- Modify: `apps/web/lib/db/schema.ts:33-38` (después de `OtbnCategory`)
- Modify: `apps/web/lib/services/otbn.ts`
- Test: `apps/web/lib/services/otbn.test.ts` (crear)

**Interfaces:**
- Consumes: `OtbnCategory` de `@/lib/db/schema`; `hectaresByKey: Map<string, number>` tal como lo devuelve `overlapByKey`.
- Produces: `OtbnBucket`, `OtbnShare` (en `schema.ts`) y `buildOtbnBreakdown(hectaresByKey, loteAreaHa): OtbnShare[]` (en `otbn.ts`). Tasks 2, 3, 4, 7 y 8 dependen de estos nombres exactos.

- [ ] **Step 1: Agregar los tipos a `schema.ts`**

Insertar inmediatamente después del bloque `OtbnCategory` (que termina en la línea 38):

```ts
/**
 * One slice of a lote's surface in the aptitude breakdown.
 *
 * `fuera_de_otbn` is a bucket here, not an absence: the province did not
 * classify that land as native forest, which is positive information and, in
 * Córdoba — which zones no Categoría III at all — the only bucket a buyer can
 * actually plant. `sin_cobertura` never appears: we do not know is not a share.
 */
export type OtbnBucket = "rojo" | "amarillo" | "verde" | "fuera_de_otbn"

export type OtbnShare = {
  bucket: OtbnBucket
  /** Whole hectares. The layers are 1:250 000; a decimal would be a lie. */
  hectares: number
  /** Share of the lote, 0-100, two decimals. */
  pct: number
}
```

- [ ] **Step 2: Escribir el test que falla**

Crear `apps/web/lib/services/otbn.test.ts`:

```ts
import { describe, expect, it } from "vitest"

import { buildOtbnBreakdown } from "./otbn"

describe("buildOtbnBreakdown", () => {
  it("splits the lote across the categories the layer reported", () => {
    const result = buildOtbnBreakdown(
      new Map([
        ["rojo", 150],
        ["amarillo", 340],
        ["verde", 310],
      ]),
      800,
    )

    expect(result).toEqual([
      { bucket: "rojo", hectares: 150, pct: 18.75 },
      { bucket: "amarillo", hectares: 340, pct: 42.5 },
      { bucket: "verde", hectares: 310, pct: 38.75 },
    ])
  })

  it("reports unzoned surface as its own bucket, last", () => {
    // Córdoba zones no Categoría III: without this bucket every field there
    // would report zero usable hectares, which is false.
    const result = buildOtbnBreakdown(new Map([["rojo", 200]]), 800)

    expect(result).toEqual([
      { bucket: "rojo", hectares: 200, pct: 25 },
      { bucket: "fuera_de_otbn", hectares: 600, pct: 75 },
    ])
  })

  it("puts the whole lote outside the zoning when nothing intersected", () => {
    expect(buildOtbnBreakdown(new Map(), 500)).toEqual([
      { bucket: "fuera_de_otbn", hectares: 500, pct: 100 },
    ])
  })

  it("clamps the remainder instead of rescaling when polygons overlap", () => {
    // A published layer with overlapping polygons can total more than the lote.
    // Rescaling would silently move hectares between categories the layer never
    // claimed; clamping only refuses to invent a negative bucket.
    const result = buildOtbnBreakdown(
      new Map([
        ["rojo", 600],
        ["amarillo", 500],
      ]),
      800,
    )

    expect(result.find((share) => share.bucket === "fuera_de_otbn")).toBeUndefined()
    expect(result).toHaveLength(2)
  })

  it("rounds hectares to whole numbers", () => {
    const result = buildOtbnBreakdown(new Map([["verde", 12.4]]), 100)
    expect(result[0]!.hectares).toBe(12)
  })

  it("keeps a sliver visible as zero hectares rather than dropping it", () => {
    // 0 ha with a non-zero share is how the UI learns to say "menos de 1 ha".
    const result = buildOtbnBreakdown(new Map([["rojo", 0.4]]), 500)
    expect(result[0]).toEqual({ bucket: "rojo", hectares: 0, pct: 0.08 })
  })

  it("ignores keys the OTBN layer does not define", () => {
    const result = buildOtbnBreakdown(new Map([["celeste", 100]]), 500)
    expect(result).toEqual([
      { bucket: "fuera_de_otbn", hectares: 500, pct: 100 },
    ])
  })

  it("returns nothing for a lote with no area", () => {
    expect(buildOtbnBreakdown(new Map([["rojo", 10]]), 0)).toEqual([])
  })
})
```

- [ ] **Step 3: Correr el test y verificar que falla**

Run: `pnpm --filter web test otbn`
Expected: FAIL — `buildOtbnBreakdown is not exported by ./otbn`

- [ ] **Step 4: Implementar**

En `apps/web/lib/services/otbn.ts`, cambiar el import de la línea 1 y agregar la función después del bloque `OtbnResult`:

```ts
import type {
  OtbnBucket,
  OtbnCategory,
  OtbnShare,
  SourceRef,
} from "@/lib/db/schema"
```

```ts
/** Print order: most restrictive first, unzoned last. */
const BUCKET_ORDER: readonly OtbnBucket[] = [
  "rojo",
  "amarillo",
  "verde",
  "fuera_de_otbn",
]

/**
 * How the lote's surface divides across the OTBN, in hectares.
 *
 * `dominantOtbnCategory` answers "which restriction governs this lote", which
 * is what the verdict needs. This answers "how much of it is under each one",
 * which is what prices it: Categoría I cannot be cleared at all, so a field
 * that is 40 % Categoría I has a permanent ceiling on its productive surface.
 * Both come from the same intersection; only the first was being kept.
 */
export function buildOtbnBreakdown(
  hectaresByKey: ReadonlyMap<string, number>,
  loteAreaHa: number,
): OtbnShare[] {
  if (loteAreaHa <= 0) return []

  const byBucket = new Map<OtbnBucket, number>()
  let zoned = 0

  for (const [key, hectares] of hectaresByKey) {
    if (!CATEGORIES.has(key as OtbnCategory)) continue
    const bucket = key as OtbnBucket
    byBucket.set(bucket, (byBucket.get(bucket) ?? 0) + hectares)
    zoned += hectares
  }

  // Overlapping polygons in a published layer can total more than the lote.
  // Clamp rather than rescale: rescaling would move hectares between categories
  // the layer never claimed, which is inventing data to make a sum look tidy.
  byBucket.set("fuera_de_otbn", Math.max(0, loteAreaHa - zoned))

  return BUCKET_ORDER.flatMap((bucket) => {
    const hectares = byBucket.get(bucket) ?? 0
    if (hectares <= 0) return []

    return [
      {
        bucket,
        hectares: Math.round(hectares),
        pct: Number.parseFloat(((hectares / loteAreaHa) * 100).toFixed(2)),
      },
    ]
  })
}
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `pnpm --filter web test otbn`
Expected: PASS, 8 tests.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/db/schema.ts apps/web/lib/services/otbn.ts apps/web/lib/services/otbn.test.ts
git commit -m "feat(otbn): keep the hectare split the lookup was discarding"
```

---

### Task 2: `lookupOtbn` devuelve el reparto

**Files:**
- Modify: `apps/web/lib/services/otbn.ts:7-12` y `:27-55`
- Test: `apps/web/lib/services/layers.test.ts` (agregar al `describe("lookupOtbn")` existente, línea 115)

**Interfaces:**
- Consumes: `buildOtbnBreakdown` de Task 1; `primeLayerCache` y el helper `rect` ya presentes en `layers.test.ts`.
- Produces: `OtbnResult` con campo `breakdown: OtbnShare[]`. Task 3 lo persiste.

- [ ] **Step 1: Escribir los tests que fallan**

Agregar dentro de `describe("lookupOtbn", ...)` en `apps/web/lib/services/layers.test.ts`, después del test de la línea 151:

```ts
  it("reports how the surface splits, not just the governing category", () => {
    primeLayerCache(OTBN_LAYER, [
      rect(-64.0, -63.985, { categoria: "verde" }),
      rect(-63.985, -63.98, { categoria: "rojo" }),
    ])

    return lookupOtbn(LOTE, LOTE_HA, PROVINCE).then((result) => {
      const buckets = result.breakdown.map((share) => share.bucket)
      expect(buckets).toEqual(["rojo", "verde"])
      expect(
        result.breakdown.reduce((total, share) => total + share.pct, 0),
      ).toBeGreaterThan(99)
    })
  })

  it("gives no breakdown when the province has no layer", async () => {
    // Absence of data is not a distribution.
    const result = await lookupOtbn(LOTE, LOTE_HA, "chubut")
    expect(result.breakdown).toEqual([])
  })

  it("puts a lote outside the zoning entirely in the unzoned bucket", async () => {
    primeLayerCache(OTBN_LAYER, [rect(-60.0, -59.99, { categoria: "rojo" })])

    const result = await lookupOtbn(LOTE, LOTE_HA, PROVINCE)
    expect(result.breakdown).toEqual([
      { bucket: "fuera_de_otbn", hectares: Math.round(LOTE_HA), pct: 100 },
    ])
  })
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `pnpm --filter web test layers`
Expected: FAIL — `result.breakdown` es `undefined`.

- [ ] **Step 3: Implementar**

En `apps/web/lib/services/otbn.ts`, reemplazar el tipo `OtbnResult` (líneas 7-12):

```ts
export type OtbnResult = {
  category: OtbnCategory
  /** Share of the lote in that category, 0-100. */
  pct: number
  source: SourceRef | null
  /** Empty when the province has no layer: we do not know is not a share. */
  breakdown: OtbnShare[]
}
```

Reemplazar el early return (líneas 33-35):

```ts
  if (!layer || loteAreaHa <= 0) {
    return { category: "sin_cobertura", pct: 0, source: null, breakdown: [] }
  }
```

Y el return final (línea 54):

```ts
  return {
    category: resolved,
    pct,
    source: await describeSource(provincia),
    breakdown: buildOtbnBreakdown(hectaresByKey, loteAreaHa),
  }
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `pnpm --filter web test`
Expected: PASS. Toda la suite, incluidos los tests existentes de `lookupOtbn`, que no cambian de comportamiento.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/services/otbn.ts apps/web/lib/services/layers.test.ts
git commit -m "feat(otbn): carry the breakdown out of the lookup"
```

---

### Task 3: Persistir el reparto

**Files:**
- Modify: `apps/web/lib/db/schema.ts:244` (después de `otbnPct`)
- Modify: `apps/web/lib/services/verification.ts:72`
- Create: migración generada por drizzle-kit en `apps/web/drizzle/`

**Interfaces:**
- Consumes: `OtbnShare` de Task 1; `otbn.breakdown` de Task 2.
- Produces: `loteVerifications.otbnBreakdown: OtbnShare[] | null`. Tasks 5, 7 y 8 lo leen.

- [ ] **Step 1: Agregar la columna al schema**

En `apps/web/lib/db/schema.ts`, después de `otbnPct` (línea 244):

```ts
    /**
     * How the lote's surface divides across the OTBN, in hectares.
     *
     * Nullable, and nullable on purpose: rows written before this column exists
     * never had the breakdown computed, and backfilling would mean re-running
     * the intersection against today's layers while claiming the old
     * verification date. A null here means "not measured", which is true.
     */
    otbnBreakdown: jsonb("otbn_breakdown").$type<OtbnShare[]>(),
```

- [ ] **Step 2: Generar y aplicar la migración**

```bash
pnpm --filter web db:generate
pnpm --filter web db:migrate
```

Expected: un archivo nuevo en `apps/web/drizzle/` con `ALTER TABLE "lote_verifications" ADD COLUMN "otbn_breakdown" jsonb;`

- [ ] **Step 3: Escribir el valor en la verificación**

En `apps/web/lib/services/verification.ts`, dentro del `persist` final (línea 72), después de `otbnPct: otbn.pct,`:

```ts
    otbnBreakdown: otbn.breakdown,
```

- [ ] **Step 4: Verificar que compila y que la suite sigue verde**

Run: `pnpm --filter web typecheck && pnpm --filter web test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/db/schema.ts apps/web/lib/services/verification.ts apps/web/drizzle
git commit -m "feat(verifications): record the OTBN breakdown alongside the verdict"
```

---

### Task 4: El módulo puro de presentación

**Files:**
- Create: `apps/web/lib/ui/aptitud.ts`
- Test: `apps/web/lib/ui/aptitud.test.ts`

**Interfaces:**
- Consumes: `OtbnShare` de `@/lib/db/schema`; `OTBN_UI` de `@/lib/ui/verdict`.
- Produces: `FilaAptitud`, `filasAptitud(reparto): FilaAptitud[]`, `CAVEAT_APTITUD: string`. Tasks 5 y 8 los consumen.

- [ ] **Step 1: Escribir el test que falla**

Crear `apps/web/lib/ui/aptitud.test.ts`:

```ts
import { describe, expect, it } from "vitest"

import { CAVEAT_APTITUD, filasAptitud } from "./aptitud"

describe("filasAptitud", () => {
  it("gives every bucket its legal sentence, never just a colour", () => {
    const [fila] = filasAptitud([{ bucket: "rojo", hectares: 150, pct: 18.75 }])

    expect(fila!.etiqueta).toBe("Categoría I")
    expect(fila!.detalle).toBe("Conservación. No se puede desmontar.")
  })

  it("formats hectares as whole numbers in es-AR", () => {
    const [fila] = filasAptitud([
      { bucket: "verde", hectares: 1310, pct: 38.75 },
    ])
    expect(fila!.hectareas).toBe("1.310 ha")
  })

  it("says 'menos de 1 ha' instead of printing a bare zero", () => {
    // A sliver that rounds to zero is still a sliver; "0 ha" reads as none.
    const [fila] = filasAptitud([{ bucket: "rojo", hectares: 0, pct: 0.08 }])
    expect(fila!.hectareas).toBe("menos de 1 ha")
  })

  it("formats the share with at most two decimals", () => {
    const [fila] = filasAptitud([
      { bucket: "amarillo", hectares: 340, pct: 42.5 },
    ])
    expect(fila!.porcentaje).toBe("42,5 %")
  })

  it("preserves the order it was given", () => {
    const filas = filasAptitud([
      { bucket: "rojo", hectares: 1, pct: 1 },
      { bucket: "fuera_de_otbn", hectares: 99, pct: 99 },
    ])
    expect(filas.map((fila) => fila.bucket)).toEqual(["rojo", "fuera_de_otbn"])
  })

  it("returns nothing for an empty breakdown", () => {
    expect(filasAptitud([])).toEqual([])
  })
})

describe("CAVEAT_APTITUD", () => {
  it("names the scale, because the number invites more trust than it earns", () => {
    expect(CAVEAT_APTITUD).toContain("1:250 000")
  })
})
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `pnpm --filter web test aptitud`
Expected: FAIL — no existe `./aptitud`.

- [ ] **Step 3: Implementar**

Crear `apps/web/lib/ui/aptitud.ts`:

```ts
import type { OtbnShare } from "@/lib/db/schema"
import { OTBN_UI } from "./verdict"

/**
 * One printed row of the aptitude breakdown.
 *
 * Presentation lives here, apart from any component, because this repo's vitest
 * only sees `lib/**` and runs in `node`: a rule that lives inside a `.tsx` file
 * cannot be tested at all. The panel and the PDF both render these rows, so
 * they cannot disagree about how a hectare reads.
 */
export type FilaAptitud = {
  bucket: OtbnShare["bucket"]
  etiqueta: string
  detalle: string
  swatch: string
  hectareas: string
  porcentaje: string
}

/**
 * Travels with every breakdown, on screen and in the PDF.
 *
 * The three shipped OTBN layers are 1:250 000 and their own metadata admits the
 * product "no refleja estrictamente el OTBN aprobado por la ALA". Simplifying
 * them for serving drops roughly 7 % of the Categoría III surface in small
 * scattered patches, so that bucket is understated by construction. A hectare
 * figure invites surveyor-grade trust; this is what it is actually worth.
 */
export const CAVEAT_APTITUD =
  "Superficies medidas sobre las capas provinciales publicadas, a escala 1:250 000 y simplificadas para poder servirlas. Sirven para dimensionar el lote, no para amojonarlo."

export function filasAptitud(
  reparto: readonly OtbnShare[],
): FilaAptitud[] {
  return reparto.map((share) => {
    const ui = OTBN_UI[share.bucket]

    return {
      bucket: share.bucket,
      etiqueta: ui.etiqueta,
      detalle: ui.detalle,
      swatch: ui.swatch,
      // Rounded to zero but present: the share says there is something there.
      hectareas:
        share.hectares === 0
          ? "menos de 1 ha"
          : `${share.hectares.toLocaleString("es-AR")} ha`,
      porcentaje: `${share.pct.toLocaleString("es-AR", {
        maximumFractionDigits: 2,
      })} %`,
    }
  })
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `pnpm --filter web test aptitud`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/ui/aptitud.ts apps/web/lib/ui/aptitud.test.ts
git commit -m "feat(ui): read the OTBN breakdown as hectares with its caveat"
```

---

### Task 5: La sección de aptitud en `/lotes/:id`

**Files:**
- Create: `apps/web/components/verificacion/panel-aptitud.tsx`
- Modify: `apps/web/components/verificacion/panel-veredicto.tsx`
- Modify: `apps/web/components/lotes/detalle-lote.tsx:10-11` y `:309`

**Interfaces:**
- Consumes: `filasAptitud`, `CAVEAT_APTITUD` (Task 4); `VERDICT_UI`, `formatFecha` (`lib/ui/verdict.ts`); `LoteVerification.otbnBreakdown` (Task 3).
- Produces: `PanelAptitud`, y `panel-veredicto.tsx` pasa a exportar `BadgeVeredicto` **y** `PanelVeredicto`.

**Por qué el badge se extrae:** los dos ejes tienen que quedar separados en pantalla, y el badge es el titular de los dos —el usuario acaba de apretar «Verificar» y quiere la respuesta arriba—. Con el badge afuera, el orden del panel queda igual al del documento: titular, aptitud, exportación. El bloque OTBN sale de `PanelVeredicto` porque su lugar es la sección de aptitud; los motivos siguen nombrando la categoría en palabras (`OTBN_CATEGORY_I`), así que el fundamento del veredicto no pierde nada.

- [ ] **Step 1: Extraer el badge en `panel-veredicto.tsx`**

Reemplazar el bloque del badge (líneas 46-52) por un componente exportado, y dejar `PanelVeredicto` sin él. El archivo completo queda:

```tsx
import type { LoteVerification } from "@/lib/db/schema"
import { REASON_COPY, type VerdictReason } from "@/lib/services/verdict"
import { VERDICT_UI, formatFecha, formatHa, formatPct } from "@/lib/ui/verdict"

function Dato({
  etiqueta,
  valor,
  detalle,
}: {
  etiqueta: string
  valor: string
  detalle?: string
}) {
  return (
    <div className="border-line border-t py-3 first:border-t-0 first:pt-0">
      <p className="text-ink-soft text-sm">{etiqueta}</p>
      <p className="mt-0.5 text-lg font-semibold">{valor}</p>
      {detalle ? (
        <p className="text-ink-soft mt-0.5 text-sm leading-snug">{detalle}</p>
      ) : null}
    </div>
  )
}

/**
 * The headline both axes answer to.
 *
 * Split out of the panel so the aptitude section can sit between it and the
 * export result, in the same order the document prints them.
 */
export function BadgeVeredicto({
  verificacion,
}: {
  verificacion: LoteVerification
}) {
  if (verificacion.status !== "ready" || !verificacion.verdict) return null

  const ui = VERDICT_UI[verificacion.verdict]

  return (
    <div className={`${ui.bg} ${ui.texto} rounded-lg px-5 py-4`}>
      <p className="text-2xl font-bold tracking-tight">{ui.titulo}</p>
      <p className="mt-1 text-sm leading-relaxed opacity-95">{ui.resumen}</p>
      <p className="mt-3 text-xs opacity-90">
        Verificado el {formatFecha(verificacion.createdAt)}
      </p>
    </div>
  )
}

/** The export axis: post-cutoff forest loss and why the verdict landed there. */
export function PanelVeredicto({
  verificacion,
}: {
  verificacion: LoteVerification
}) {
  if (verificacion.status !== "ready" || !verificacion.verdict) return null

  const motivos = (verificacion.reasons as VerdictReason[]) ?? []

  return (
    <section className="grid gap-5">
      <div>
        <h2 className="font-semibold">Qué se puede vender</h2>
        <p className="text-ink-soft mt-1 text-sm leading-relaxed">
          Reglamento (UE) 2023/1115, exigible desde el 30/12/2026.
        </p>
      </div>

      <Dato
        etiqueta="Pérdida de bosque posterior al 31/12/2020"
        valor={formatPct(verificacion.forestLossPct)}
        detalle={
          verificacion.forestLossHa
            ? `${formatHa(verificacion.forestLossHa)} ha dentro del lote${
                verificacion.forestLossFirstYear
                  ? `, detectadas desde ${verificacion.forestLossFirstYear}`
                  : ""
              }`
            : "No se detectó pérdida dentro del lote."
        }
      />

      {motivos.length > 0 ? (
        <div>
          <h3 className="font-semibold">Por qué</h3>
          <ul className="mt-2 grid gap-2">
            {motivos.map((motivo) => (
              <li
                key={motivo}
                className="border-line text-ink-soft border-l-2 pl-3 text-sm leading-relaxed"
              >
                {REASON_COPY[motivo] ?? motivo}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
```

- [ ] **Step 2: Crear `panel-aptitud.tsx`**

```tsx
import type { LoteVerification } from "@/lib/db/schema"
import { CAVEAT_APTITUD, filasAptitud } from "@/lib/ui/aptitud"
import { formatHa } from "@/lib/ui/verdict"

/**
 * The aptitude axis: how the lote's surface divides across the OTBN.
 *
 * Deliberately not a traffic light. Collapsing the split back to one colour is
 * exactly what the lookup used to do, and it is the information a purchase
 * turns on: Categoría I cannot be cleared at all, ever.
 */
export function PanelAptitud({
  verificacion,
  areaHa,
}: {
  verificacion: LoteVerification
  areaHa: number
}) {
  const reparto = verificacion.otbnBreakdown ?? []
  if (reparto.length === 0) return null

  const filas = filasAptitud(reparto)

  return (
    <section className="grid gap-4">
      <div>
        <h2 className="font-semibold">Qué se puede hacer</h2>
        <p className="text-ink-soft mt-1 text-sm leading-relaxed">
          Ordenamiento Territorial de Bosques Nativos (Ley 26.331), sobre las{" "}
          {formatHa(areaHa)} ha del lote.
        </p>
      </div>

      <ul className="border-line border-t">
        {filas.map((fila) => (
          <li
            key={fila.bucket}
            className="border-line grid grid-cols-[auto_1fr_auto] items-baseline gap-x-3 border-b py-3"
          >
            <span
              aria-hidden
              className={`${fila.swatch} mt-1 inline-block h-4 w-4 rounded-sm`}
            />
            <div>
              <p className="font-semibold">{fila.etiqueta}</p>
              <p className="text-ink-soft text-sm leading-snug">
                {fila.detalle}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold tabular-nums">
                {fila.hectareas}
              </p>
              <p className="text-ink-soft text-sm tabular-nums">
                {fila.porcentaje}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <p className="border-alerta text-alerta border-l-4 py-2 pl-3 text-sm leading-relaxed">
        {CAVEAT_APTITUD}
      </p>
    </section>
  )
}
```

- [ ] **Step 3: Conectar en `detalle-lote.tsx`**

Reemplazar el import de la línea 11:

```tsx
import { PanelAptitud } from "@/components/verificacion/panel-aptitud"
import {
  BadgeVeredicto,
  PanelVeredicto,
} from "@/components/verificacion/panel-veredicto"
```

Reemplazar la línea 309:

```tsx
        {veredicto ? (
          <>
            <BadgeVeredicto verificacion={veredicto} />
            <PanelAptitud verificacion={veredicto} areaHa={lote.areaHa} />
            <PanelVeredicto verificacion={veredicto} />
          </>
        ) : null}
```

- [ ] **Step 4: Verificar**

Run: `pnpm --filter web typecheck && pnpm --filter web lint && pnpm --filter web test`
Expected: PASS en los tres.

Verificación manual: `pnpm --filter web dev`, entrar a un lote verificado, confirmar que aparecen las tres piezas en orden —badge, «Qué se puede hacer», «Qué se puede vender»— y que el caveat se lee en ámbar. Si la clase `border-alerta` / `text-alerta` no existe en el tema, usar la misma que ya usa `fuentes-consultadas.tsx` para las advertencias de fuente.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/verificacion apps/web/components/lotes/detalle-lote.tsx
git commit -m "feat(lotes): show what the land allows beside what it can export"
```

---

## Tajo 2 — El informe

### Task 6: Fijar la huella v1 antes de tocar nada

**Files:**
- Modify: `apps/web/lib/services/document.test.ts`

**Interfaces:**
- Consumes: `buildPayload`, `hashPayload` (sin cambios todavía).
- Produces: la constante `HUELLA_V1` dentro del test, que Task 7 no puede alterar.

**Por qué este task va primero:** es el único que demuestra que el cambio de versión no rompe un documento ya emitido. Escrito después, sería un test escrito contra el código nuevo y no probaría nada. `resolveDocument` (`lib/services/document-store.ts:29-34`) reproduce el payload guardado en vez de reconstruirlo, así que un documento v1 nunca vuelve a pasar por `buildPayload` — este test fija la otra mitad: que `hashPayload` sobre un payload v1 sigue dando lo mismo.

- [ ] **Step 1: Agregar el test contra el código ACTUAL**

Al final de `apps/web/lib/services/document.test.ts`, agregar:

```ts
/**
 * A payload exactly as version 1 wrote it, frozen here on purpose.
 *
 * Documents already issued carry their payload on the verification row and are
 * replayed from it, never rebuilt. If this hash ever moves, a hash printed on
 * somebody's PDF stopped verifying — which is the one failure this whole
 * mechanism exists to prevent.
 */
const PAYLOAD_V1 = {
  version: 1,
  emitidoEl: "2026-09-11T15:00:00.000Z",
  productor: { nombre: "Ana Productora", email: "ana@campo.test" },
  lote: {
    id: "lote1",
    nombre: "Pellegrini Norte",
    provincia: "santiago-del-estero",
    renspa: "01.234.5.67890/AB",
    superficieHa: 501.02,
    centroide: { lon: -63.98953, lat: -25.85153 },
    geometriaHash: "a".repeat(64),
  },
  verificacion: {
    id: "ver1",
    fecha: "2026-09-11T12:00:00.000Z",
    veredicto: "rojo",
    motivos: [
      {
        codigo: "FOREST_LOSS_AFTER_CUTOFF",
        texto: REASON_COPY.FOREST_LOSS_AFTER_CUTOFF,
      },
    ],
    perdidaForestal: {
      porcentajeSuperficie: 98.71,
      hectareas: 494.56,
      primerAnio: 2023,
      fechaDeCorte: "2020-12-31",
    },
    otbn: { categoria: "rojo", porcentajeSuperficie: 100 },
  },
  imagenes: [],
  fuentes: [
    {
      id: "umsef",
      label: "UMSEF",
      vintage: "2023",
      consultedAt: "2026-09-11T12:00:00.000Z",
    },
  ],
}

describe("version 1 payloads", () => {
  it("still hashes to the value printed on documents already issued", () => {
    expect(hashPayload(PAYLOAD_V1 as never)).toBe(HUELLA_V1)
  })
})
```

Y agregar el import de `REASON_COPY` arriba, junto a los existentes:

```ts
import { REASON_COPY } from "./verdict"
```

- [ ] **Step 2: Obtener la huella real y fijarla**

Correr, desde `apps/web/`:

```bash
pnpm exec tsx -e 'import { hashPayload } from "./lib/services/document.ts"; import { REASON_COPY } from "./lib/services/verdict.ts"; const p = { version: 1, emitidoEl: "2026-09-11T15:00:00.000Z", productor: { nombre: "Ana Productora", email: "ana@campo.test" }, lote: { id: "lote1", nombre: "Pellegrini Norte", provincia: "santiago-del-estero", renspa: "01.234.5.67890/AB", superficieHa: 501.02, centroide: { lon: -63.98953, lat: -25.85153 }, geometriaHash: "a".repeat(64) }, verificacion: { id: "ver1", fecha: "2026-09-11T12:00:00.000Z", veredicto: "rojo", motivos: [{ codigo: "FOREST_LOSS_AFTER_CUTOFF", texto: REASON_COPY.FOREST_LOSS_AFTER_CUTOFF }], perdidaForestal: { porcentajeSuperficie: 98.71, hectareas: 494.56, primerAnio: 2023, fechaDeCorte: "2020-12-31" }, otbn: { categoria: "rojo", porcentajeSuperficie: 100 } }, imagenes: [], fuentes: [{ id: "umsef", label: "UMSEF", vintage: "2023", consultedAt: "2026-09-11T12:00:00.000Z" }] }; console.log(hashPayload(p as never))'
```

Copiar el hexadecimal de 64 caracteres que imprime y declararlo arriba del `describe`:

```ts
/** Obtenido del código en PAYLOAD_VERSION 1. No se recalcula: se preserva. */
const HUELLA_V1 = "<pegar acá los 64 caracteres que imprimió el comando>"
```

- [ ] **Step 3: Correr el test y verificar que pasa contra el código actual**

Run: `pnpm --filter web test document`
Expected: PASS. Si falla acá, la huella se copió mal — el código todavía no cambió.

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/services/document.test.ts
git commit -m "test(document): pin the v1 payload hash before the schema moves"
```

---

### Task 7: Payload versión 2

**Files:**
- Modify: `apps/web/lib/services/document.ts:7`, `:27-55`, `:83-131`
- Test: `apps/web/lib/services/document.test.ts`

**Interfaces:**
- Consumes: `OtbnShare` de `@/lib/db/schema`; `verification.otbnBreakdown` de Task 3.
- Produces: `PAYLOAD_VERSION = 2`, `PayloadVersion`, `DocumentOtbnShare`, y `DueDiligencePayload.verificacion.otbn.reparto?`. Task 8 lo renderiza.

- [ ] **Step 1: Escribir los tests que fallan**

Agregar a `apps/web/lib/services/document.test.ts`, dentro del `describe("buildPayload")`:

```ts
  it("declares the OTBN split so the document can print it", () => {
    const conReparto = buildPayload({
      lote: LOTE,
      verification: {
        ...VERIFICATION,
        otbnBreakdown: [
          { bucket: "rojo", hectares: 150, pct: 29.94 },
          { bucket: "fuera_de_otbn", hectares: 351, pct: 70.06 },
        ],
      } as unknown as LoteVerification,
      productor: PRODUCTOR,
      imagenes: [],
      emitidoEl: EMITIDO,
    })

    expect(conReparto.version).toBe(2)
    expect(conReparto.verificacion.otbn.reparto).toEqual([
      { categoria: "rojo", hectareas: 150, porcentajeSuperficie: 29.94 },
      { categoria: "fuera_de_otbn", hectareas: 351, porcentajeSuperficie: 70.06 },
    ])
  })

  it("omits the split entirely when the province had no layer", () => {
    // An empty array would assert "measured, and it is nothing". It was not
    // measured at all, and the payload has to say the difference.
    const result = buildPayload({
      lote: LOTE,
      verification: {
        ...VERIFICATION,
        otbnBreakdown: null,
      } as unknown as LoteVerification,
      productor: PRODUCTOR,
      imagenes: [],
      emitidoEl: EMITIDO,
    })

    expect(result.verificacion.otbn.reparto).toBeUndefined()
  })

  it("changes the hash when the split changes", () => {
    const base = payload()
    const alterado = structuredClone(base)
    alterado.verificacion.otbn.reparto = [
      { categoria: "verde", hectareas: 501, porcentajeSuperficie: 100 },
    ]
    expect(hashPayload(alterado)).not.toBe(hashPayload(base))
  })
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `pnpm --filter web test document`
Expected: FAIL — `version` es 1, y `reparto` no existe en el tipo.

- [ ] **Step 3: Implementar**

En `apps/web/lib/services/document.ts`, reemplazar la línea 7:

```ts
export const PAYLOAD_VERSION = 2 as const

/**
 * Versions this module can still hash.
 *
 * v1 predates the aptitude split. Its payloads are stored on the verification
 * row and replayed from there, never rebuilt, so they must keep type-checking
 * and keep hashing to what was printed on them.
 */
export type PayloadVersion = 1 | 2

/** One bucket of the OTBN split, exactly as the document declares it. */
export type DocumentOtbnShare = {
  categoria: string
  hectareas: number
  porcentajeSuperficie: number
}
```

Agregar el import de `OtbnShare` en la línea 3:

```ts
import type {
  Lote,
  LoteVerification,
  OtbnShare,
  SourceRef,
} from "@/lib/db/schema"
```

En el tipo `DueDiligencePayload`, cambiar la línea 28 y la línea 51:

```ts
  version: PayloadVersion
```

```ts
    otbn: {
      categoria: string | null
      porcentajeSuperficie: number | null
      /**
       * Absent, not empty, when the province ships no layer — and absent on
       * every v1 payload. An empty array would assert that the split was
       * measured and came to nothing.
       */
      reparto?: DocumentOtbnShare[]
    }
```

En `buildPayload`, reemplazar el bloque `otbn` (líneas 120-123):

```ts
      otbn: {
        categoria: verification.otbnCategory,
        porcentajeSuperficie: verification.otbnPct,
        ...repartoDeclarado(verification.otbnBreakdown),
      },
```

Y agregar el helper al final del archivo:

```ts
/**
 * Spreads into the payload only when there is a split to declare.
 *
 * Spreading nothing leaves the key off the object, which is what `canonicalJson`
 * then hashes — the same shape a v1 payload has.
 */
function repartoDeclarado(
  breakdown: OtbnShare[] | null,
): { reparto?: DocumentOtbnShare[] } {
  if (!breakdown || breakdown.length === 0) return {}

  return {
    reparto: breakdown.map((share) => ({
      categoria: share.bucket,
      hectareas: share.hectares,
      porcentajeSuperficie: share.pct,
    })),
  }
}
```

- [ ] **Step 4: Correr y verificar que pasa, incluida la regresión v1**

Run: `pnpm --filter web typecheck && pnpm --filter web test`
Expected: PASS. **El test `still hashes to the value printed on documents already issued` de Task 6 tiene que seguir verde.** Si falla, el cambio rompió un documento ya emitido y hay que revisar `repartoDeclarado` antes de seguir.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/services/document.ts apps/web/lib/services/document.test.ts
git commit -m "feat(document): declare the OTBN split in payload version 2"
```

---

### Task 8: La sección de aptitud en el PDF

**Files:**
- Modify: `apps/web/lib/services/pdf.tsx`

**Interfaces:**
- Consumes: `DueDiligencePayload` (Task 7); `CAVEAT_APTITUD` y `OTBN_UI`.
- Produces: nada que otro task consuma.

- [ ] **Step 1: Importar lo que falta**

En `apps/web/lib/services/pdf.tsx`, después del import de la línea 10:

```tsx
import { CAVEAT_APTITUD } from "@/lib/ui/aptitud"
import { OTBN_UI } from "@/lib/ui/verdict"
```

- [ ] **Step 2: Agregar los estilos**

Dentro del `StyleSheet.create({ ... })`, junto a los demás:

```tsx
  aptitudRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 0.5,
    borderBottomColor: "#d1d5db",
    paddingVertical: 4,
  },
  aptitudLabel: { fontFamily: "Helvetica-Bold" },
  aptitudDetail: { color: "#4b5563", fontSize: 8 },
  aptitudFigure: { textAlign: "right" },
```

- [ ] **Step 3: Insertar la sección antes de «Resultado de la verificación»**

Inmediatamente antes del `<View style={styles.section}>` que abre «Resultado de la verificación» (línea 169), insertar:

```tsx
        {verificacion.otbn.reparto ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Aptitud legal</Text>
            <Text style={styles.aptitudDetail}>
              Ordenamiento Territorial de Bosques Nativos (Ley 26.331). Cómo se
              reparte la superficie del lote.
            </Text>
            {verificacion.otbn.reparto.map((parte) => {
              const ui = OTBN_UI[parte.categoria as keyof typeof OTBN_UI]
              return (
                <View key={parte.categoria} style={styles.aptitudRow}>
                  <View>
                    <Text style={styles.aptitudLabel}>
                      {ui?.etiqueta ?? parte.categoria}
                    </Text>
                    <Text style={styles.aptitudDetail}>{ui?.detalle ?? ""}</Text>
                  </View>
                  <View style={styles.aptitudFigure}>
                    <Text style={styles.aptitudLabel}>
                      {parte.hectareas === 0
                        ? "menos de 1 ha"
                        : `${parte.hectareas.toLocaleString("es-AR")} ha`}
                    </Text>
                    <Text style={styles.aptitudDetail}>
                      {parte.porcentajeSuperficie.toLocaleString("es-AR", {
                        maximumFractionDigits: 2,
                      })}{" "}
                      %
                    </Text>
                  </View>
                </View>
              )
            })}
            <Text style={[styles.caveat, { marginTop: 5 }]}>
              {CAVEAT_APTITUD}
            </Text>
          </View>
        ) : null}
```

**La condición `verificacion.otbn.reparto ?` no es opcional.** Un payload v1 no tiene el campo, y esos documentos se siguen re-emitiendo desde su payload guardado.

- [ ] **Step 4: Cambiar el título del documento**

En la línea 116, reemplazar:

```tsx
      title={`Informe de lote - aptitud legal y debida diligencia - ${lote.nombre}`}
```

Y el `<Text style={styles.title}>` de la línea 121 al texto correspondiente del encabezado impreso, conservando la cita textual al Reglamento (UE) 2023/1115 que ya esté en el subtítulo de la línea 124.

- [ ] **Step 5: Verificar de punta a punta**

Run: `pnpm --filter web typecheck && pnpm --filter web lint && pnpm --filter web test`

Verificación manual, que es la que cuenta acá porque el PDF no tiene tests:
1. `pnpm --filter web dev`
2. Verificar un lote nuevo (para que nazca con payload v2) y descargar el documento. Confirmar la sección «Aptitud legal» con sus cuatro filas y el caveat.
3. Descargar el documento de un lote verificado **antes** de este tajo. Confirmar que sale sin la sección nueva, sin romperse, y que la huella impresa es la misma de antes.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/services/pdf.tsx
git commit -m "feat(pdf): print the aptitude split above the export result"
```

---

## Tajo 3 — La landing y los documentos

### Task 9: El ejemplo de la landing, declaradamente ficticio

**Files:**
- Create: `apps/web/lib/landing/aptitud-ejemplo.ts`
- Test: `apps/web/lib/landing/aptitud-ejemplo.test.ts`

**Interfaces:**
- Consumes: `FilaAptitud` / `filasAptitud` de Task 4.
- Produces: `APTITUD_EJEMPLO: OtbnShare[]` y `SUPERFICIE_EJEMPLO_HA: number`. Tasks 10 y 12 los consumen.

**Corrección al spec, obligatoria.** El spec pedía hornear un desglose **real** en `lib/landing/ejemplo-capas.generated.ts`. Eso está prohibido por una guarda editorial que ese mismo archivo declara en su encabezado:

> «Guarda editorial: este módulo exporta geometría para dibujar y nada más. Ninguna hectárea, cantidad, año ni resumen sale de acá: el ejemplo ilustra el método, nunca un resultado sobre un lugar real.»

Publicar hectáreas por categoría de un departamento real de Santiago del Estero sería exactamente el resultado sobre un lugar real que la guarda prohíbe. El ejemplo de la landing es **ficticio y rotulado como tal**, igual que la hoja de `documento.tsx`, que ya se cierra con «El lote y el resultado son ficticios». `build-landing-assets.ts` no se toca en este tajo.

- [ ] **Step 1: Escribir el test que falla**

Crear `apps/web/lib/landing/aptitud-ejemplo.test.ts`:

```ts
import { describe, expect, it } from "vitest"

import { APTITUD_EJEMPLO, SUPERFICIE_EJEMPLO_HA } from "./aptitud-ejemplo"

describe("APTITUD_EJEMPLO", () => {
  it("adds up to the surface it claims", () => {
    // A fictional example still has to be arithmetically honest: a reader who
    // checks the sum and finds it wrong learns to distrust the real figures.
    const total = APTITUD_EJEMPLO.reduce(
      (sum, share) => sum + share.hectares,
      0,
    )
    expect(total).toBe(SUPERFICIE_EJEMPLO_HA)
  })

  it("adds up to a hundred percent", () => {
    const total = APTITUD_EJEMPLO.reduce((sum, share) => sum + share.pct, 0)
    expect(total).toBeCloseTo(100, 1)
  })

  it("shows all four buckets, including unzoned land", () => {
    expect(APTITUD_EJEMPLO.map((share) => share.bucket)).toEqual([
      "rojo",
      "amarillo",
      "verde",
      "fuera_de_otbn",
    ])
  })

  it("uses whole hectares, like every figure the product prints", () => {
    for (const share of APTITUD_EJEMPLO) {
      expect(Number.isInteger(share.hectares)).toBe(true)
    }
  })
})
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `pnpm --filter web test aptitud-ejemplo`
Expected: FAIL — no existe el módulo.

- [ ] **Step 3: Implementar**

Crear `apps/web/lib/landing/aptitud-ejemplo.ts`:

```ts
import type { OtbnShare } from "@/lib/db/schema"

/**
 * A fictional lote, for the landing only.
 *
 * Invented on purpose. `ejemplo-capas.generated.ts` states the rule this obeys:
 * the example illustrates the method, never a result about a real place. Real
 * per-category hectares for a real department would be exactly the result that
 * file refuses to publish — and nobody outside this product would read it as
 * illustrative. Every surface the landing shows says so in words.
 */
export const SUPERFICIE_EJEMPLO_HA = 800

export const APTITUD_EJEMPLO: readonly OtbnShare[] = [
  { bucket: "rojo", hectares: 150, pct: 18.75 },
  { bucket: "amarillo", hectares: 340, pct: 42.5 },
  { bucket: "verde", hectares: 190, pct: 23.75 },
  { bucket: "fuera_de_otbn", hectares: 120, pct: 15 },
]
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `pnpm --filter web test aptitud-ejemplo`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/landing/aptitud-ejemplo.ts apps/web/lib/landing/aptitud-ejemplo.test.ts
git commit -m "feat(landing): add the fictional aptitude example the page will show"
```

---

### Task 10: Los dos ejes en «Resultados»

**Files:**
- Modify: `apps/web/components/landing/resultados.tsx:66-112`

**Interfaces:**
- Consumes: `APTITUD_EJEMPLO`, `SUPERFICIE_EJEMPLO_HA` (Task 9); `filasAptitud` (Task 4); `RevelarEnVista` (ya presente).
- Produces: nada.

La lista de tres veredictos y el arreglo `FILAS` **no se tocan**: pasan a ser el segundo eje bajo un encabezado propio.

- [ ] **Step 1: Agregar los imports**

Arriba de `apps/web/components/landing/resultados.tsx`, junto a los existentes:

```tsx
import {
  APTITUD_EJEMPLO,
  SUPERFICIE_EJEMPLO_HA,
} from "@/lib/landing/aptitud-ejemplo"
import { filasAptitud } from "@/lib/ui/aptitud"
```

- [ ] **Step 2: Reemplazar el `<h2>` y anteponer el eje de aptitud**

Reemplazar las líneas 70-73 (el `<h2>` y la línea en blanco antes del `<ul>`) por:

```tsx
        <h2 className="landing__h2">
          Dos preguntas sobre el mismo suelo.
        </h2>

        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-xl font-bold">Qué se puede hacer</h3>
            <p className="mt-1 leading-relaxed text-ink-soft">
              Cuántas hectáreas del lote deja usar el Ordenamiento Territorial
              de Bosques Nativos. Es ley argentina, y rige hoy.
            </p>
          </div>

          <ul className="border-t border-line">
            {filasAptitud(APTITUD_EJEMPLO).map((fila) => (
              <li
                key={fila.bucket}
                className="grid grid-cols-[auto_1fr_auto] items-baseline gap-x-4 border-b border-line py-4"
              >
                <span
                  aria-hidden="true"
                  className={`${fila.swatch} mt-1 inline-block h-4 w-4 rounded-sm`}
                />
                <div>
                  <p className="font-bold">{fila.etiqueta}</p>
                  <p className="text-sm leading-relaxed text-ink-soft">
                    {fila.detalle}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold tabular-nums">
                    {fila.hectareas}
                  </p>
                  <p className="text-sm tabular-nums text-ink-soft">
                    {fila.porcentaje}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <p className="text-sm leading-relaxed text-ink-soft">
            Ejemplo ilustrativo sobre un lote ficticio de{" "}
            {SUPERFICIE_EJEMPLO_HA.toLocaleString("es-AR")} ha. Las superficies
            que informa la app se miden sobre las capas provinciales publicadas.
          </p>
        </div>

        <div>
          <h3 className="text-xl font-bold">Qué se puede vender</h3>
          <p className="mt-1 leading-relaxed text-ink-soft">
            Si la mercadería del lote entra a la Unión Europea bajo el
            Reglamento (UE) 2023/1115, exigible desde el 30/12/2026. Tres
            resultados posibles, cada uno con sus palabras.
          </p>
        </div>

```

El `<ul className="border-b border-line">` de la línea 74 y todo lo que contiene queda **sin cambios**, ahora debajo de ese encabezado.

- [ ] **Step 3: Actualizar el comentario del componente**

Reemplazar el bloque de comentario de las líneas 57-65 por uno que describa la sección como es ahora:

```tsx
/**
 * The two axes, in the order the product argues them: what the land allows
 * first, because that is Argentine law and it applies today; what it can
 * export second, because the European regulation bites on 30/12/2026.
 *
 * Colour never travels alone on either axis: every row carries its words.
 * The aptitude figures are a declared fiction — the landing illustrates the
 * method, never a result about a real place.
 */
```

- [ ] **Step 4: Verificar**

Run: `pnpm --filter web typecheck && pnpm --filter web lint && pnpm --filter web test`
Manual: `pnpm --filter web dev`, abrir `/`, bajar hasta `#resultados`, confirmar los dos ejes y que a 400 px de ancho la grilla de tres columnas no desborda.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/landing/resultados.tsx
git commit -m "feat(landing): show both axes where the traffic light stood alone"
```

---

### Task 11: El pitch — hero y cierre

**Files:**
- Modify: `apps/web/components/landing/hero.tsx:19-26`
- Modify: `apps/web/components/landing/cierre.tsx:13-15`

**Interfaces:** ninguna. Es copy.

- [ ] **Step 1: Reemplazar el bloque editorial del hero**

En `apps/web/components/landing/hero.tsx`, reemplazar las líneas 19-26:

```tsx
          <p className="text-base text-ink-soft">
            Aptitud legal y exportabilidad · Córdoba, Santiago del Estero y
            Chaco
          </p>
          <h1 className="landing__h1">Un campo no vale lo que mide.</h1>
          <p className="landing__cuerpo text-ink-soft">
            Vale lo que la ley te deja hacer con él, y lo que Europa te deja
            vender desde él. Dibujá el lote sobre el satelital y verificalo
            contra las capas oficiales.
          </p>
```

- [ ] **Step 2: Reemplazar el cierre**

En `apps/web/components/landing/cierre.tsx`, reemplazar las líneas 13-15:

```tsx
          <h2 className="landing__h2">
            Antes de firmar, sabé qué estás comprando.
          </h2>
```

- [ ] **Step 3: Verificar**

Run: `pnpm --filter web typecheck && pnpm --filter web lint`
Manual: abrir `/` a 400 px y a 1440 px. El H1 usa `clamp(2.75rem, 1.4rem + 5.6vw, 7rem)`; confirmar que «Un campo no vale lo que mide.» no rompe en un lugar feo ni desborda el gutter de 16 px.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/landing/hero.tsx apps/web/components/landing/cierre.tsx
git commit -m "feat(landing): lead with what the law allows, not with the regulation"
```

---

### Task 12: La hoja del documento muestra la aptitud

**Files:**
- Modify: `apps/web/components/landing/documento.tsx` (`HojaDocumento`, sección «Identificación del lote» y siguiente)

**Interfaces:**
- Consumes: `APTITUD_EJEMPLO` (Task 9); `filasAptitud` (Task 4).

Si la hoja dibujada no muestra la aptitud, la landing promete una sección que el papel ilustrado no tiene — y este repo ya tiene la convención de que la landing solo muestra lo que el producto hace.

- [ ] **Step 1: Agregar los imports**

```tsx
import { APTITUD_EJEMPLO } from "@/lib/landing/aptitud-ejemplo"
import { filasAptitud } from "@/lib/ui/aptitud"
```

- [ ] **Step 2: Insertar la sección entre «Identificación del lote» y «Resultado de la verificación»**

Inmediatamente después del `</section>` que cierra «Identificación del lote» (línea 108), insertar:

```tsx
        <section className="flex flex-col gap-2">
          <h3 className="font-semibold">Aptitud legal</h3>
          <ul className="flex flex-col gap-1">
            {filasAptitud(APTITUD_EJEMPLO).map((fila) => (
              <li key={fila.bucket} className="flex justify-between gap-4">
                <span>{fila.etiqueta}</span>
                <span className="tabular-nums">
                  {fila.hectareas} · {fila.porcentaje}
                </span>
              </li>
            ))}
          </ul>
        </section>
```

- [ ] **Step 3: Renombrar la sección siguiente**

En la línea 111, reemplazar `Resultado de la verificación` por `Resultado de exportación`, para que la hoja nombre los dos ejes igual que el PDF y que el panel de la app.

- [ ] **Step 4: Verificar**

Run: `pnpm --filter web typecheck && pnpm --filter web lint && pnpm --filter web test`
Manual: abrir `/`, confirmar que la hoja sigue leyéndose a 400 px y que el rótulo «El lote y el resultado son ficticios» sigue al pie.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/landing/documento.tsx
git commit -m "feat(landing): give the illustrated sheet its aptitude section"
```

---

### Task 13: PRODUCT.md y DESIGN.md

**Files:**
- Modify: `apps/web/PRODUCT.md` — secciones `Users`, `Product Purpose`, `Positioning`, `Capabilities and Constraints`, `Vocabulario del dominio`, `Product Principles`
- Modify: `apps/web/DESIGN.md` — sección `## Landing`

**Interfaces:** ninguna. Es documentación, y es la especificación real de este producto.

- [ ] **Step 1: `PRODUCT.md` — `Users`**

Agregar al usuario nuevo sin desplazar al existente. El productor sigue primero; el comprador o arrendatario entra como segundo usuario primario, con la aclaración de que carga lotes candidatos con las mismas herramientas (dibujo o importación) y que el aislamiento por `userId` no cambia: cada quien ve solo lo que cargó.

- [ ] **Step 2: `PRODUCT.md` — `Product Purpose` y `Positioning`**

Reescribir alrededor de la tesis: un campo vale lo que la ley deja hacer con él. Dos ejes —aptitud (OTBN, Argentina, hoy) y exportabilidad (EUDR, Europa, 30/12/2026)—, nunca fusionados en una escala. Conservar íntegras las tres afirmaciones que un producto vecino no podría copiar, y agregar la cuarta: el reparto por categoría sale de la misma intersección que el veredicto, y se informa en hectáreas enteras con su caveat.

- [ ] **Step 3: `PRODUCT.md` — `Capabilities and Constraints`**

Mover «reparto de superficie por categoría del OTBN» a **Construido y funcionando**. Dejar la regla del veredicto exactamente como está: no cambió. Agregar a las restricciones que la aptitud no es un semáforo y que el cuarto balde es obligatorio, con el motivo de Córdoba.

- [ ] **Step 4: `PRODUCT.md` — vocabulario y principios**

Agregar **aptitud legal** y **exportabilidad** al vocabulario del dominio, con la aclaración de que los identificadores del código no cambian. Agregar el principio: una superficie informada viaja con la escala de la capa que la produjo.

- [ ] **Step 5: `DESIGN.md` — `## Landing`**

Actualizar la sección para que describa las dos subsecciones de «Resultados» y el rótulo obligatorio del ejemplo ficticio. Anotar explícitamente la guarda editorial: ninguna hectárea de la landing sale de `ejemplo-capas.generated.ts`, y por qué.

- [ ] **Step 6: Verificar la coherencia**

Releer las dos secciones «Ausencias que no se deben fabricar» y «Deliberadamente fuera de alcance» de `PRODUCT.md` y confirmar que nada de lo agregado las contradice. En particular: sigue sin haber valuación monetaria, precio por hectárea ni comparables de mercado.

- [ ] **Step 7: Commit**

```bash
git add apps/web/PRODUCT.md apps/web/DESIGN.md
git commit -m "docs: reposition the product around aptitude and exportability"
```

---

## Self-Review

**Cobertura del spec**

| Requisito del spec | Task |
|---|---|
| Ensanchar `OtbnResult` con el desglose | 1, 2 |
| Cuatro baldes, `fuera_de_otbn` obligatorio | 1 |
| Clampear el resto en 0, no reescalar | 1 |
| `sin_cobertura` no produce desglose | 2, 7 |
| Hectáreas enteras | 1, 4 |
| Nunca un total único de «transformables» | 4, 5, 8, 10 |
| Caveat pegado al número | 4, 5, 8 |
| Aptitud no es un semáforo | 5, 10 |
| Persistir el reparto | 3 |
| Mostrarlo en `/lotes/:id` | 5 |
| `PAYLOAD_VERSION` 1 → 2 sin romper v1 | 6, 7 |
| Sección de aptitud en el PDF, aptitud antes que exportación | 8 |
| Nombre del documento nombra las dos cosas | 8 |
| `verdict.ts` intacto | ningún task lo toca |
| Hero, Resultados, Documento, Cierre | 10, 11, 12 |
| Vocabulario «tu lote» → «el lote» | 5, 10, 13 |
| `PRODUCT.md` y `DESIGN.md` | 13 |

**Desviación del spec, deliberada:** el spec pedía hornear el desglose real del ejemplo con `build-landing-assets.ts`. Task 9 lo declara ficticio en su lugar, porque la guarda editorial de `ejemplo-capas.generated.ts` prohíbe publicar hectáreas de un lugar real. `build-landing-assets.ts` no se toca.

**Consistencia de tipos**

`OtbnBucket` y `OtbnShare` se declaran una vez en `schema.ts` (Task 1) y los consumen `otbn.ts`, `verification.ts`, `aptitud.ts`, `document.ts` y `aptitud-ejemplo.ts` con ese nombre exacto. `buildOtbnBreakdown`, `filasAptitud`, `CAVEAT_APTITUD`, `PAYLOAD_VERSION`, `PayloadVersion`, `DocumentOtbnShare`, `BadgeVeredicto`, `PanelAptitud`, `APTITUD_EJEMPLO` y `SUPERFICIE_EJEMPLO_HA` se definen en un solo task cada uno y se usan con la misma firma en los demás. El campo del payload es `reparto` en los tres lugares donde aparece (tipo, `buildPayload`, `pdf.tsx`).

**Riesgo abierto que ningún task cierra:** no hay tests de componentes React en este repo, así que las Tasks 5, 8, 10, 11 y 12 se verifican a mano. Cada una lleva su paso de verificación manual con qué mirar exactamente.
