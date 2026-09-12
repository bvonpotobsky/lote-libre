import { eq } from "drizzle-orm"
import { nanoid } from "nanoid"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { lotes, user } from "@/lib/db/schema"
import { measure } from "@/lib/geo/metrics"
import { getOrCreateImage } from "@/lib/services/imagery"
import { runVerification } from "@/lib/services/verification"
import { resolveProvince } from "@/lib/geo/provinces"

const PRODUCTOR = {
  name: "Ana Gómez",
  email: "demo@lotelimpio.ar",
  password: "lotelimpio2026",
}

/**
 * Two real places, chosen so the verdicts are not a matter of opinion.
 *
 * Both were cross-checked against the official UMSEF polygons and against the
 * raw Hansen lossyear raster before being written down here.
 */
const DEMO = [
  {
    nombre: "Pellegrini Norte",
    renspa: "22.019.0.00471/AB",
    // Departamento Pellegrini, Santiago del Estero. Closed dry-Chaco forest in
    // 2020; cleared for cropping in 2023 (UMSEF periodo 2023, infobs
    // agricultura). Press-documented case at estancia "Algarrobal Viejo".
    coordinates: [
      [-64.00069, -25.86162],
      [-63.97838, -25.86162],
      [-63.97838, -25.84144],
      [-64.00069, -25.84144],
      [-64.00069, -25.86162],
    ],
  },
  {
    nombre: "La Amarga",
    renspa: "14.105.0.00238/CD",
    // Pedanía La Amarga, Pres. Roque Sáenz Peña, Córdoba. Long-standing
    // cropland: zero tree cover in 2000, zero loss since, outside every forest
    // region. Deliberately NOT near Huinca Renancó, where caldén remnants of
    // the Espinal would muddy a clean negative control.
    coordinates: [
      [-63.79244, -34.26518],
      [-63.76816, -34.26518],
      [-63.76816, -34.24502],
      [-63.79244, -34.24502],
      [-63.79244, -34.26518],
    ],
  },
] as const

async function ensureProducer(): Promise<string> {
  const [existing] = await db
    .select()
    .from(user)
    .where(eq(user.email, PRODUCTOR.email))
    .limit(1)

  if (existing) return existing.id

  await auth.api.signUpEmail({ body: PRODUCTOR })

  const [created] = await db
    .select()
    .from(user)
    .where(eq(user.email, PRODUCTOR.email))
    .limit(1)

  if (!created) throw new Error("could not create the demo producer")
  return created.id
}

async function main(): Promise<void> {
  const userId = await ensureProducer()
  await db.delete(lotes).where(eq(lotes.userId, userId))

  for (const demo of DEMO) {
    const geometry: GeoJSON.Polygon = {
      type: "Polygon",
      coordinates: [demo.coordinates.map(([lon, lat]) => [lon, lat])],
    }
    const metrics = measure(geometry)
    const provincia = await resolveProvince(metrics.centroid)

    const [lote] = await db
      .insert(lotes)
      .values({
        id: nanoid(12),
        userId,
        nombre: demo.nombre,
        provincia: provincia?.slug ?? "desconocida",
        renspa: demo.renspa,
        geometry,
        geometryHash: metrics.geometryHash,
        areaHa: metrics.areaHa,
        centroidLon: metrics.centroid.lon,
        centroidLat: metrics.centroid.lat,
        bboxMinLon: metrics.bbox.minLon,
        bboxMinLat: metrics.bbox.minLat,
        bboxMaxLon: metrics.bbox.maxLon,
        bboxMaxLat: metrics.bbox.maxLat,
        source: "draw",
      })
      .returning()

    const verification = await runVerification(userId, lote!)
    console.log(
      `[seed] ${demo.nombre.padEnd(18)} ${metrics.areaHa.toFixed(1)} ha  ` +
        `${(provincia?.slug ?? "?").padEnd(21)} -> ${verification.verdict ?? verification.failureCode}`,
    )

    // Warm the image cache here rather than on the first click. A demo that
    // waits seven seconds for Copernicus in front of a jury is a demo that
    // looks broken.
    for (const period of ["reference", "current"] as const) {
      // Seeding is the densest burst of Xweather calls the app ever makes.
      // Pacing it is what keeps the demo's windows real instead of falling
      // back to the wide range.
      //
      // The pause is per period, not per layer: the first layer of a period
      // resolves the window and the second reads it back off that row, so the
      // second costs one Copernicus call and no Xweather traffic at all.
      await new Promise((resolve) => setTimeout(resolve, 2_000))
      try {
        for (const layer of ["trueColor", "ndvi"] as const) {
          const { meta } = await getOrCreateImage(
            geometry,
            metrics.geometryHash,
            metrics.centroid,
            period,
            layer,
          )
          console.log(
            `[seed]   ${period.padEnd(9)} ${layer.padEnd(9)} ${meta.dateFrom} a ${meta.dateTo}  ` +
              `${meta.cloudAvgPct === null ? "rango amplio" : `${meta.cloudAvgPct.toFixed(1)} % nubes`}` +
              `${meta.clearRatio === null ? "" : `  ${Math.round(meta.clearRatio * 100)} % limpio`}` +
              `${meta.isEmpty ? "  (sin imagen despejada)" : ""}`,
          )
        }
      } catch (error) {
        console.warn(
          `[seed]   ${period}: no se pudo precargar la imagen —`,
          error instanceof Error ? error.message : error,
        )
      }
    }
  }

  console.log(
    `\n[seed] listo. Entrá con ${PRODUCTOR.email} / ${PRODUCTOR.password}`,
  )
}

await main()
