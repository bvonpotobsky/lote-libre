import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer"

import type { DueDiligencePayload } from "./document"

const VERDICT_COLOR: Record<string, string> = {
  verde: "#15803d",
  amarillo: "#b45309",
  rojo: "#b91c1c",
}

const VERDICT_LABEL: Record<string, string> = {
  verde: "SIN OBSERVACIONES",
  amarillo: "CON OBSERVACIONES",
  rojo: "NO CUMPLE",
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 56,
    paddingHorizontal: 40,
    backgroundColor: "#ffffff",
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#111827",
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: "#111827",
    paddingBottom: 8,
    marginBottom: 14,
  },
  title: { fontSize: 15, fontFamily: "Helvetica-Bold" },
  subtitle: { fontSize: 8, color: "#4b5563", marginTop: 3 },
  verdictBox: {
    borderWidth: 2,
    borderRadius: 3,
    padding: 10,
    marginBottom: 14,
  },
  verdictLabel: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  verdictMeta: { fontSize: 8, marginTop: 3, color: "#374151" },
  section: { marginBottom: 12 },
  sectionTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "#4b5563",
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    paddingBottom: 3,
    marginBottom: 6,
  },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: 130, color: "#4b5563" },
  value: { flex: 1, fontFamily: "Helvetica-Bold" },
  bullet: { flexDirection: "row", marginBottom: 3, paddingRight: 10 },
  bulletMark: { width: 10 },
  sourceBlock: {
    marginBottom: 6,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: "#d1d5db",
  },
  caveat: { color: "#92400e", marginTop: 2 },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: "#d1d5db",
    paddingTop: 6,
  },
  footerLabel: { fontSize: 7, color: "#4b5563" },
  hash: { fontSize: 7, fontFamily: "Courier", marginTop: 2 },
})

const Field = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
)

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

const pct = (value: number | null): string =>
  value === null ? "sin dato" : `${value.toFixed(2)} %`

function DueDiligenceDocument({
  payload,
  hash,
}: {
  payload: DueDiligencePayload
  hash: string
}) {
  const { lote, verificacion, productor, imagenes, fuentes } = payload
  const color = VERDICT_COLOR[verificacion.veredicto] ?? "#4b5563"

  return (
    <Document
      title={`Debida diligencia EUDR - ${lote.nombre}`}
      author="Lote Limpio"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>
            Declaración de debida diligencia — EUDR
          </Text>
          <Text style={styles.subtitle}>
            Reglamento (UE) 2023/1115. Fecha de corte de deforestación:
            31/12/2020. Documento emitido el {formatDate(payload.emitidoEl)}.
          </Text>
        </View>

        <View style={[styles.verdictBox, { borderColor: color }]}>
          <Text style={[styles.verdictLabel, { color }]}>
            {VERDICT_LABEL[verificacion.veredicto] ??
              verificacion.veredicto.toUpperCase()}
          </Text>
          <Text style={styles.verdictMeta}>
            Pérdida de cobertura arbórea posterior al 31/12/2020 dentro del
            lote: {pct(verificacion.perdidaForestal.porcentajeSuperficie)} de la
            superficie
            {verificacion.perdidaForestal.hectareas !== null
              ? ` (${verificacion.perdidaForestal.hectareas.toFixed(2)} ha)`
              : ""}
            . Categoría OTBN: {verificacion.otbn.categoria ?? "sin dato"}
            {verificacion.otbn.porcentajeSuperficie !== null
              ? ` — ${pct(verificacion.otbn.porcentajeSuperficie)} del lote`
              : ""}
            .
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Productor</Text>
          <Field label="Nombre" value={productor.nombre} />
          <Field label="Correo electrónico" value={productor.email} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Identificación del lote</Text>
          <Field label="Denominación" value={lote.nombre} />
          <Field label="Provincia" value={lote.provincia} />
          <Field label="Superficie" value={`${lote.superficieHa.toFixed(2)} ha`} />
          <Field
            label="Geolocalización"
            value={`${lote.centroide.lat.toFixed(6)}, ${lote.centroide.lon.toFixed(6)} (WGS84)`}
          />
          <Field label="RENSPA declarado" value={lote.renspa ?? "no declarado"} />
          <Field label="Huella de geometría" value={lote.geometriaHash} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resultado de la verificación</Text>
          <Field label="Fecha" value={formatDate(verificacion.fecha)} />
          <Field
            label="Pérdida de cobertura"
            value={pct(verificacion.perdidaForestal.porcentajeSuperficie)}
          />
          <Field
            label="Primer año detectado"
            value={
              verificacion.perdidaForestal.primerAnio?.toString() ??
              "sin detección posterior al corte"
            }
          />
          <Field
            label="Categoría OTBN"
            value={`${verificacion.otbn.categoria ?? "sin dato"} (${pct(verificacion.otbn.porcentajeSuperficie)})`}
          />
        </View>

        {verificacion.motivos.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fundamento</Text>
            {verificacion.motivos.map((motivo) => (
              <View key={motivo.codigo} style={styles.bullet}>
                <Text style={styles.bulletMark}>•</Text>
                <Text>{motivo.texto}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {imagenes.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Evidencia satelital — ventanas observadas
            </Text>
            {imagenes.map((imagen) => (
              <Text key={imagen.periodo} style={{ marginBottom: 3 }}>
                {imagen.periodo === "referencia" ? "Referencia" : "Actual"}:{" "}
                {formatDate(imagen.desde)} a {formatDate(imagen.hasta)}
                {imagen.nubosidadMediaPct !== null
                  ? ` — nubosidad media ${imagen.nubosidadMediaPct.toFixed(1)} %`
                  : " — ventana amplia, sin selección por nubosidad"}
                {imagen.origenVentana === "fallback"
                  ? " (sin datos meteorológicos; se aplicó el criterio de menor nubosidad de Sentinel Hub)"
                  : ""}
                {imagen.origenVentana === "ampliada"
                  ? " (la ventana despejada no tuvo imágenes utilizables; se amplió al período completo)"
                  : ""}
                {imagen.sinImagen ? " — no se obtuvo imagen despejada" : ""}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fuentes consultadas</Text>
          {fuentes.map((fuente) => (
            <View key={fuente.id} style={styles.sourceBlock}>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>{fuente.label}</Text>
              <Text style={{ color: "#4b5563" }}>
                Vigencia del dato: {fuente.vintage} · Consultada el{" "}
                {formatDate(fuente.consultedAt)}
                {fuente.url ? ` · ${fuente.url}` : ""}
              </Text>
              {fuente.caveat ? (
                <Text style={styles.caveat}>Advertencia: {fuente.caveat}</Text>
              ) : null}
            </View>
          ))}
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerLabel}>
            Huella SHA-256 del contenido declarado. Permite verificar que este
            documento no fue alterado.
          </Text>
          <Text style={styles.hash}>{hash}</Text>
        </View>
      </Page>
    </Document>
  )
}

export function renderDueDiligencePdf(
  payload: DueDiligencePayload,
  hash: string,
): Promise<Buffer> {
  return renderToBuffer(<DueDiligenceDocument payload={payload} hash={hash} />)
}
