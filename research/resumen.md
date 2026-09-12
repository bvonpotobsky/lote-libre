# Resumen — Investigación previa Lote Limpio

**Fecha de la investigación:** 2026-09-12
**Alcance:** cinco líneas de investigación previas al hackatón de 24 h. Ningún código de aplicación.
**Estado:** las cinco cerradas. 4.098 líneas de documentación, con fuente y fecha de consulta al pie de cada archivo.

> Todo dato que no se pudo confirmar está marcado literalmente como `NO CONFIRMADO` en el archivo
> correspondiente, con constancia de qué se buscó. Hay 46 marcas de ese tipo repartidas en los cinco
> documentos. No se completó ningún campo por suposición.

---

## 1. Decisiones que el equipo tiene que tomar antes de escribir la primera línea

Estas cuatro no las resuelve la investigación. Son decisiones de producto y de arquitectura de datos, y
cada una tiene consecuencias que se propagan a todo lo demás.

### Decisión 1 — Cuál es la representación canónica interna de una geometría, y dónde vive la conversión de ejes

Aparecieron **tres convenciones de orden de coordenadas incompatibles entre sí**, y el proyecto las toca a todas:

| Frontera | Convención | Fuente |
|---|---|---|
| Declaración EUDR (GeoJSON, RFC 7946) | `[lon, lat]` | `geolocalizacion-eudr.md` §3 |
| Exportación VISEC (columna `Polígono` del XLSX) | `(lat, lon)` | `visec.md` §4 |
| WFS `geo.ambiente.gob.ar`, parámetro `bbox=` en WFS 1.1.0 | `lon, lat` | `otbn-provincias.md` §7 |
| WFS `geo.ambiente.gob.ar`, parámetro `bbox=` en WFS 2.0 | `lat, lon` | `otbn-provincias.md` §7 |
| WFS `geo.ambiente.gob.ar`, filtro `CQL_FILTER` espacial | `lat, lon` | `otbn-provincias.md` §7 |

Nótese que las dos últimas filas son **el mismo endpoint con dos parámetros de convención opuesta**.

**Por qué esto no es un detalle:** en Argentina continental latitud y longitud son ambas negativas y de
magnitud comparable. Invertirlas **no lanza excepción y no produce un error visible**: produce un polígono
plausible en el lugar equivocado, y el sistema receptor lo acepta. Las tres fuentes consultadas coinciden en
que el modo de falla es silencioso y con HTTP 200.

**Lo que hay que decidir:** cuál es el formato canónico interno (la recomendación de esta investigación es
GeoJSON `[lon, lat]`, por ser el que exige la declaración europea y el único con especificación formal), y
que **cada frontera tenga su adaptador explícito y su test de ida y vuelta**. No un helper genérico
compartido: cinco conversiones distintas no se resuelven con una sola función.

### Decisión 2 — De dónde sale la pérdida de cobertura forestal

Hay tres candidatas, y la elección tiene un componente contractual además de técnico.

| Fuente | Credencial | Año final | Licencia | Observación |
|---|---|---|---|---|
| Granules estáticos Hansen `GFC-2025-v1.13` | No | 2025 | CC BY 4.0, uso comercial permitido | Sin dependencia humana |
| GFW Data API `umd_tree_cover_loss v1.13` | Sí (Okta) | 2025 | ToS restrictivo | Ver abajo |
| WFS UMSEF (Ambiente, Argentina) | No | — | `NO CONFIRMADO` | Trae causa y categoría OTBN pre-cruzada |

**Contra la API de GFW** (documentado en `perdida-forestal.md` §7): el ToS limita la responsabilidad del
proveedor a **USD 100**, permite **suspender el acceso sin aviso**, y **obliga a mostrar la atribución
"powered by Resource Watch"** en el producto. Para una herramienta cuyo entregable es un documento de
cumplimiento normativo, depender de un servicio que puede cortarse sin preaviso es un riesgo de negocio,
no solo de disponibilidad.

**A favor del WFS argentino:** es la única fuente que entrega la **causa** del evento (`infobs`, p. ej.
`agricultura`) y la categoría OTBN ya cruzada. Pero su licencia está declarada como
`"Creative Conmons. Esta licencia es una licencia libre"` — con la errata incluida, sin versión ni variante.
**Jurídicamente inutilizable tal como está.** Si se la usa, hay que pedir aclaración de licencia a Ambiente.

### Decisión 3 — Qué es la clave primaria de un lote

**No existe identificador oficial de parcela en la declaración europea.** Ni en el Reglamento ni en el XSD.
Solo hay `ProductionPlace` (texto libre) y el ordinal `position`. El campo `cadastralIdentifier` existe
**únicamente en la Declaración Simplificada**, que no aplica a un productor argentino exportando vía
operador europeo (`geolocalizacion-eudr.md` §2).

Del lado argentino, en cambio, VISEC **sí** tiene una clave: `Número RENSPA` (17 caracteres, formato
`00.000.0.00000/00`, confirmado en Res. SENASA 423/2014 Art. 3°).

Entonces: el ID de lote es **nuestro, interno**, y hay que decidir cómo se relaciona con el RENSPA —
que es por establecimiento, no por lote — y cómo se estabiliza entre exportaciones sucesivas para que un
operador europeo pueda reconciliar declaraciones a lo largo del tiempo.

### Decisión 4 — Cómo se declara la incertidumbre en el documento de debida diligencia

Tres limitaciones documentadas que el informe **no puede ocultar**:

1. **Las tres capas OTBN están a escala 1:250.000** y sus PDF de metadata admiten textualmente que el
   producto *"no refleja estrictamente el OTBN aprobado por la ALA"*. No tienen precisión de lote.
2. **El mapa oficial del JRC europeo (GFC2020 V3) declara** *"The map has no legal value"* y
   *"non-mandatory, non-exclusive and not legally binding"*. Ni la cartografía oficial de la Comisión da cobertura.
3. **Tres incisos del Art. 2(40) — d), f) y g) — solo se pueden cubrir por declaración jurada del productor**,
   porque el documento acreditante no existe en el ordenamiento argentino (`legalidad-origen.md`).

Hay que decidir si el documento las declara explícitamente (recomendado: sí) y con qué redacción. Un informe
que afirma "este lote está en Categoría II" sin declarar la escala de la capa está afirmando más de lo que
el dato soporta.

---

## 2. Bloqueos que dependen de un trámite externo — conviene iniciarlos hoy

| # | Trámite | Vía | Plazo | Bloquea |
|---|---|---|---|---|
| 1 | **VISEC: figura "Operador Facilitador de carga de UP"** (Protocolo §7.1) | `visec-mrv@bcr.com.ar` | `NO CONFIRMADO` | La integración sin retoque manual |
| 2 | **GFW API key** (solo si se elige la API) | `/auth/sign-up` → correo Okta → `/auth/token` → `/auth/apikey` | `NO CONFIRMADO`; la key vence al año | Consultas por geometría propia |
| 3 | **Aclaración de licencia del WFS de Ambiente** | Dirección Nacional de Bosques, MAyDS | — | Uso legal de la capa UMSEF |
| 4 | **Listado de Organismos de Verificación habilitados** | No existe listado público pese a que el Protocolo §10.2 dice que debería | — | Saber ante quién se verifica |

**El trámite 1 es el crítico.** No hay API pública de VISEC (Swagger da 404), pero la FAQ de la Bolsa de
Comercio de Rosario documenta **NDAs ya firmados con Integra Labs, Ucrop.it, VEGA y TSA** *"mientras se
evalúan y desarrollan las API's de integración"*. Es decir: el canal de integración de terceros existe y
está en uso. No se conoce cuánto tarda, y por eso conviene abrirlo antes del hackatón y no durante.

**Impedimento de entorno, no del proveedor:** el sitio `mrvvisec.com.ar` no se pudo inspeccionar porque la
red desde la que se investigó lo bloquea (Cloudflare Gateway corporativo). Conviene reintentar desde otra
red antes de dar por cerrados los huecos de `visec.md`.

---

## 3. Respuestas al criterio de éxito

Quien no participó de la investigación debería poder responder esto sin volver a buscar.

### ¿Qué campos exporta nuestra herramienta y en qué formato?

**Dos salidas distintas, no una.**

**(a) Hacia VISEC — XLSX**, según `Template-UP-ORIGINAL-Sistema-VISEC-MRV.xlsx`. 16 columnas, orden fijo A–P:

```
Número RENSPA | Descripción Unidad Productiva | Polígono | Punto Referencia | Código Localidad |
Superficie | Código Producto | Código Campaña | Has Productivas | PCUS1 | PCUS2 | PCUS3 |
CUIT Productor | Razón Social Productor | Código Tipo Sociedad Productor | Mail Contacto Productor
```

La columna `Polígono` va en **grados decimales, orden `(latitud, longitud)`**, negativos, sin símbolo de
grado, pares entre paréntesis separados por coma, anillo cerrado, mínimo 4 vértices distintos.
`Punto Referencia` es un campo aparte con un solo par.

**(b) Hacia la declaración europea — GeoJSON RFC 7946 en Base64.** El esquema está publicado y accesible
sin autenticación (WSDL + XSD en vivo, HTTP 200). El GeoJSON viaja **Base64 dentro del campo
`geometryGeojson`**. Las propiedades admitidas son una lista cerrada: `ProducerName`, `ProducerCountry`,
`ProductionPlace`, `Area`.

Reglas duras de esa salida:
- **Mínimo 6 decimales** de latitud y longitud (Art. 2(28)). El sistema trunca a 6 si se mandan más y
  rellena con ceros si se mandan menos.
- **Deduplicar vértices DESPUÉS de redondear a 6 decimales**, o la geometría se invalida.
- **Polígono obligatorio si la parcela supera 4 ha**, para todo lo que no sea ganado. Si es `Point` y no es
  ganado, `Area` pasa a ser obligatoria, numérica, en rango `[0.0001, 4]` ha.
- **Ganado: siempre punto por establecimiento, sin umbral de superficie.**
- **La fecha o rango de producción NO es campo de la declaración.** El Art. 9(1)(d) obliga a recolectarla
  pero el Anexo II no la lista y el XSD no la tiene: vive en nuestro documento de debida diligencia.

### ¿Qué credenciales hay que tramitar y con cuánta anticipación?

Ver tabla de la sección 2. En resumen: **VISEC ya** (plazo desconocido, canal de terceros confirmado en uso),
**GFW solo si se elige la API** (y la recomendación de la investigación es evitarla por su ToS), y
**ninguna credencial** para los granules de Hansen, para las capas OTBN ni para el XSD europeo.

### ¿De qué URL sale cada capa geográfica y cómo se llama su campo de categoría?

Descarga directa, verificada HTTP 200, base `https://geo.ambiente.gob.ar/documentos/sinia/bosque_OTBN/`:

| Provincia | Archivo | Norma / vintage | Capa WFS |
|---|---|---|---|
| Córdoba | `CD_2010_OTBN.rar` | Ley 9.814, 2010 | `bosques:CD_2010_OTBN` |
| Chaco | `CH_2009_OTBN.rar` | 2009 | `bosques:CH_2009_OTBN` |
| Santiago del Estero | `SE_2015_OTBN.rar` | Ley 6.942 + Decreto 3.133/2015 | `bosques:SE_2015_OTBN` |

**Campo de categoría: `cat_cons`**, con literales `I` / `II` / `III` **idénticos en las tres provincias**.
CRS ya en EPSG:4326 WGS84, no hay que reproyectar.

**Pero los esquemas NO son idénticos.** El campo de superficie difiere:

| Provincia | WFS | Tipo | DBF del shapefile |
|---|---|---|---|
| Córdoba | `areaha` | `xsd:double` | `Cat_cons` / `AreaHa` |
| Chaco | `area_ha` | `xsd:double` | `CAT_CONS` / `AREA_HA` |
| Santiago del Estero | `area_ha` | `xsd:decimal` | `Cat_cons` / `Area_ha` |

**Normalización:** minusculizar todo y reescribir `areaha` → `area_ha`. El mapeo completo campo por campo y
valor por valor está en `otbn-provincias.md` §4.

Ojo también con `clase`: el valor `Bosque a restaurar` aparece **solo en Santiago del Estero** y es
**ortogonal a la categoría** (art. 40), no un cuarto valor de `cat_cons`.

### ¿Qué preguntas le hacemos al productor?

**22 preguntas en total, con un tronco común de 9 y el resto condicional.** Recorridos medidos:

- Soja, productor propietario: **13–15 preguntas, 5–7 minutos**
- Ganadería con animales comprados: **15 preguntas, 8–11 minutos**
- Caso complejo: 22 preguntas

Cubre los 8 incisos del Art. 2(40). El cuestionario completo, con tipo de respuesta, obligatoriedad,
condición de aparición, commodity al que aplica, inciso del EUDR que cubre y documento adjunto esperado,
está en `legalidad-origen.md`.

---

## 4. Trampas que atraviesan varias líneas

Cinco hallazgos con un patrón común: **el sistema responde HTTP 200 y da una respuesta incorrecta sin
señalar error.** Todos necesitan test explícito.

1. **`lossyear` va de 0 a 25, no de 1 a 20.** La página de UMD está desactualizada; el `values_table` de la
   API tiene 25 filas. El corte EUDR es `lossyear >= 21`. **Codificar contra la documentación de UMD
   descarta silenciosamente 2021–2025, que es exactamente nuestra ventana de interés.**
2. **GeoServer trunca a 28.000 features por request** (`CountDefault`). Pedir `count=50000` devuelve 28.000
   igual. Chaco tiene 42.398: **se pierde el 34 % de la provincia en silencio**. Por eso el `.rar` gana sobre
   el WFS para la carga inicial.
3. **Orden de ejes invertido** en cinco fronteras distintas (ver Decisión 1).
4. **`POST /geostore` de GFW redirige 307 a un ELB de AWS sobre HTTP en texto plano.** Si se siguen
   redirects, los polígonos de los productores viajan sin cifrar. Es una fuga de datos de clientes.
5. **Nunca usar el alias `latest`** del dataset de GFW: devuelve 307. Y el `latest` de
   `gadm__tcl__adm1_change` apunta a `v20250515`, que solo llega a 2024. Hay que pinear `v20260424`.

**Versión a citar en el informe para que un tercero pueda reproducir el análisis:**
`umd_tree_cover_loss v1.13` (ingerida 2026-03-18), equivalente al producto Hansen `GFC-2025-v1.13`,
cobertura 2001–2025, granules con `Last-Modified: 2026-03-16`.

---

## 5. Contexto normativo confirmado

- **Aplicación general del Reglamento (UE) 2023/1115: 30/12/2026.**
- **Personas físicas y micro/pequeñas empresas establecidas antes del 31/12/2024: 30/06/2027.**
  (Art. 38, modificado por Reglamento (UE) 2025/2650.)
- **Corte de deforestación: 31/12/2020**, sin cambios.
- **Argentina es país de riesgo estándar** (Reglamento (UE) 2025/1093; verificado: no figura en el Anexo).
  **No hay diligencia debida simplificada disponible.**
- **Chaco:** Ley 4005-R ratificada por el STJ (Sentencia 19/26, 11/02/2026, 4-1), pero hay **cautelar federal
  de junio de 2026** (Casación Sala IV) que frena nuevos permisos de desmonte.
- **La emergencia de la Ley 26.160** (relevamiento territorial de comunidades indígenas) **está terminada**
  desde el 11/12/2024 (DNU 1083/2024). Contra la intuición, eso **aumenta** el riesgo del inciso d) del
  Art. 2(40): sin relevamiento vigente no hay mapa oficial en el que apoyarse.

---

## 6. Huecos que más conviene cerrar antes del hackatón

Ordenados por impacto sobre el trabajo del día 1:

1. **Obligatoriedad campo por campo del XLSX de VISEC.** Los templates no traen `dataValidation` ni
   comentarios y ningún documento público la publica. Sin esto, la exportación se valida a ciegas.
2. **Catálogo de `Código Localidad`** (ARCA): la hoja `Localidades` de ambos templates viene **vacía**.
3. **Verificar a mano la Res. SENASA 1332/2024.** De ella depende el hallazgo de que existe una vía oficial
   para transmitir el **polígono del lote junto con su RENSPA** a esquemas inscriptos en el Directorio
   (Res. SAGyP 50/2024). Si se confirma, cambia de dónde sale la geometría.
4. **Máximo de commodities por declaración:** el XSD dice 200, la página de validación dice 100.
   Recomendación mientras no se resuelva: diseñar contra 100.
5. **Datum/CRS de VISEC:** no está declarado en ningún documento. Se infiere WGS84, no está confirmado.
   Tampoco hay decimales exigidos ni sentido de giro del anillo.

---

## 7. Índice de archivos

| Archivo | Líneas | Línea de investigación |
|---|---|---|
| [`visec.md`](./visec.md) | 529 | Formato de salida hacia VISEC |
| [`geolocalizacion-eudr.md`](./geolocalizacion-eudr.md) | 728 | Estructura de geolocalización de la declaración |
| [`perdida-forestal.md`](./perdida-forestal.md) | 1.051 | Acceso a datos de pérdida de cobertura forestal |
| [`otbn-provincias.md`](./otbn-provincias.md) | 484 | OTBN de Córdoba, Santiago del Estero y Chaco |
| [`legalidad-origen.md`](./legalidad-origen.md) | 1.306 | Requisitos de legalidad del país de origen + cuestionario |

Cada archivo lleva al pie su lista de fuentes con URL completa y fecha de consulta, y una sección explícita
de lo que quedó sin confirmar.

---

*Este documento sintetiza investigación técnica y normativa. No constituye asesoramiento legal.*
