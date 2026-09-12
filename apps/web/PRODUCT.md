# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Usuario primario: el productor argentino** de soja o ganadería con campos en
Córdoba, Santiago del Estero o Chaco. Es quien entra a la app, carga sus propios
lotes y descarga el documento. La tenencia es individual: no hay organizaciones,
equipos ni roles, y el aislamiento por `userId` vive en la capa de datos.

Escena de uso confirmada: afuera o en la oficina del campo, con luz fuerte, una
sola mano libre, el pulgar posiblemente enguantado, a veces en un vehículo en
movimiento. Frecuencia baja — una o dos veces por campaña, cuando el acopio se lo
pide. La interfaz es sólo clara (no hay modo oscuro montado) por esa escena.

**Usuario primario, segundo: el comprador o arrendatario.** Evalúa lotes
candidatos antes de una operación —compra, alquiler o cotización— con las mismas
herramientas de carga que el productor: dibujo sobre el mapa o importación de
`.kml` / `.geojson`. El aislamiento por `userId` no cambia por esto: cada usuario
ve solo los lotes que cargó, sin excepción por rol. RENSPA ya es opcional, así
que evaluar un lote que todavía no es propio no queda bloqueado.

**Audiencia del output, no usuario de la app: el acopio o exportador.** Es quien
exige el papel antes de comprar y quien tiene que poder defender el resultado río
arriba, hacia el operador europeo. No se loguea, no carga lotes y no audita
lotes de terceros dentro de la app. Confirmado explícitamente con el usuario el
2026-09-12.

Cuenta de demostración sembrada: `demo@lotelimpio.ar` (Ana Gómez), con dos lotes
reales verificados.

## Product Purpose

**Un campo no vale lo que mide. Vale lo que la ley te deja hacer con él.**

Dos techos legales sobre el mismo suelo, derivados de las dos capas que el
producto ya calcula:

- **Qué se puede hacer** con esta tierra — aptitud legal, OTBN (Ley 26.331),
  Argentina, vigente hoy.
- **Qué se puede vender** desde esta tierra — exportabilidad, Reglamento (UE)
  2023/1115, Unión Europea, exigible desde el 30/12/2026.

Los dos ejes nunca se fusionan en una escala: responden preguntas distintas y no
comparten unidad. Un productor o un comprador dibuja o importa el contorno de un
lote, lo verifica contra las capas oficiales, y descarga un documento de debida
diligencia con una huella verificable — para entregárselo al acopio, o para
decidir antes de firmar una operación.

El Reglamento (UE) 2023/1115 exige demostrar que la mercadería no proviene de
tierra deforestada después del **31/12/2020**. La exigencia baja en cadena hasta
el productor, que hasta ahora no tenía con qué responder.

Éxito: el acopio acepta el documento sin que el productor tenga que improvisar, y
cualquier tercero puede recomputar la huella y confirmar que no fue alterado.

Constantes regulatorias confirmadas:

- Aplicación general del Reglamento: **30/12/2026**. Personas físicas y micro/
  pequeñas empresas establecidas antes del 31/12/2024: **30/06/2027**
  (Art. 38, según Reglamento (UE) 2025/2650).
- Fecha de corte de deforestación: **31/12/2020**, sin cambios.
- **Argentina es país de riesgo estándar** (Reglamento (UE) 2025/1093,
  verificada su ausencia del Anexo). La debida diligencia simplificada **no está
  disponible**.

## Positioning

Dos ejes legales, nunca fusionados en una escala: la aptitud (OTBN, qué se puede
hacer con la tierra) responde una pregunta distinta de la exportabilidad (EUDR,
qué se puede vender desde ella), y no comparten unidad — hectáreas repartidas
contra un semáforo de tres estados.

**El veredicto no sale de las imágenes satelitales.** Sale de dos capas oficiales
ya calculadas —pérdida de bosque nativo de UMSEF posterior a 2020, y la categoría
del OTBN provincial— y esa distinción es el producto entero. Las imágenes son
evidencia visual; las capas son lo que el documento cita.

Dos fotos no distinguen una cosecha de un topado: un lote agrícola pasa de NDVI
0,8 a 0,15 todos los años. UMSEF y Hansen sí, porque usan series temporales
largas y validadas.

Cuatro afirmaciones que un producto vecino no podría copiar sin rehacer su
mecanismo:

1. **Verde exige evidencia positiva de las dos capas.** La ausencia de dato nunca
   es verde. `fuera_de_otbn` (la capa está cargada y el lote cae fuera de toda
   zona) es información positiva; `sin_cobertura` (no hay capa para esa
   provincia) no lo es, y colapsar las dos haría inalcanzable el verde en
   Córdoba, que no zonifica ninguna Categoría III.
2. **La huella SHA-256 se calcula sobre el contenido declarado, no sobre los
   bytes del PDF.** Un PDF embebe su fecha de creación, así que hashear el
   archivo daría un número irrecomputable. El payload se serializa de forma
   canónica (claves ordenadas a toda profundidad), se congela junto con el hash
   en la primera generación, y se guarda: cualquiera puede re-serializarlo y
   verificar.
3. **La incertidumbre se imprime, no se esconde.** Cada fuente lleva un `caveat`
   que la UI muestra en ámbar y el PDF imprime.
4. **El reparto de aptitud sale de la misma intersección que el veredicto.**
   `buildOtbnBreakdown` no vuelve a medir nada: reutiliza las hectáreas por
   categoría que `lookupOtbn` ya calculaba para elegir el color del semáforo. Se
   informa en hectáreas enteras —un decimal sobre una capa 1:250 000 es una
   mentira de precisión— con la escala y el caveat de la capa consultada
   impresos al lado del reparto, nunca como un total único de "hectáreas
   transformables". El caveat acompaña al reparto entero, no a cada balde por
   separado: es la capa la que tiene límites, no la categoría.

## Operating Context

- La exigencia viaja en cadena: operador europeo → exportador → acopio →
  productor. El disparador de uso es el acopio pidiendo el papel antes de comprar.
- Cobertura de capas: **Córdoba, Santiago del Estero y Chaco**. Un lote en otra
  provincia se guarda igual y lo dice con todas las letras, en lugar de mandar a
  reintentar algo que no puede funcionar. Sumar una provincia es agregar dos
  GeoJSON y una línea en `COVERED_PROVINCES`.
- La provincia se infiere del centroide contra la capa del IGN, nunca se toma del
  cliente.
- Las capas se hornean en tiempo de build (`pnpm --filter web build:layers`)
  desde las fuentes oficiales, y su procedencia queda en `data/sources.json`, que
  es lo que el PDF cita. La demo no depende de que un servidor del Estado esté
  arriba.

**Formatos río abajo que existen y que la app todavía no produce** (relevados en
`research/`, no implementados):

- **VISEC — XLSX** `Template-UP-ORIGINAL-Sistema-VISEC-MRV.xlsx`, 16 columnas
  fijas A–P. La columna `Polígono` va en grados decimales en orden
  **`(latitud, longitud)`**, negativos, pares entre paréntesis, anillo cerrado,
  mínimo 4 vértices distintos.
- **Declaración EUDR (DDS)** — GeoJSON RFC 7946 en **Base64** dentro de
  `geometryGeojson`. Lista cerrada de propiedades: `ProducerName`,
  `ProducerCountry`, `ProductionPlace`, `Area`. Mínimo **6 decimales**
  (Art. 2(28)), y hay que **deduplicar vértices DESPUÉS de redondear** o la
  geometría se invalida. Polígono obligatorio por encima de 4 ha para commodities
  distintos de ganado. La fecha de producción **no es un campo de la declaración**:
  el Art. 9(1)(d) obliga a recolectarla, pero el Anexo II y el XSD la omiten, así
  que tiene que vivir en el documento de debida diligencia.

## Capabilities and Constraints

**Construido y funcionando**

- Alta de lote por dibujo sobre el mapa o importación de `.kml` / `.geojson`.
- Compuerta de geometría del lado del servidor, en este orden porque el área de
  un moño es ruido: no-polígono → fuera de Argentina continental → auto-
  intersección → menor a 0,5 ha → mayor a 100 000 ha.
- Verificación contra UMSEF (pérdida posterior a 2020) y OTBN provincial.
- **Reparto de superficie por categoría del OTBN** (aptitud legal): la misma
  intersección que decide el semáforo, ensanchada en cuatro baldes —Categoría
  I, II, III y `fuera_de_otbn`—, en hectáreas enteras. Persistido con la
  verificación (`otbn_breakdown`, columna jsonb nullable) y mostrado en
  `/lotes/:id` y en el PDF, antes de la sección de exportación.
- Semáforo de tres estados con motivos legibles por máquina y por persona.
- Geometría editable: al cambiar, el veredicto anterior **se retiene, no se
  anota**, y lo obsoleto se deriva comparando huellas de geometría, nunca se
  guarda como bandera.
- Comparador satelital antes/después con NDVI de Sentinel-2.
- PDF de debida diligencia con huella verificable.
- Autenticación por correo y contraseña, con aislamiento por usuario en la capa de
  datos. Un lote ajeno devuelve **404, no 403**: un 403 confirmaría que el id
  existe y convertiría el endpoint en un oráculo de enumeración.

**La regla del veredicto** (`lib/services/verdict.ts`)

```
rojo      pérdida ≥ 0,5 % de la superficie (MARGINAL_LOSS_PCT), posterior al corte
amarillo  pérdida marginal (> 0 y < 0,5 %), u OTBN Categoría I o II,
          o sin_cobertura
verde     sin hallazgos; OTBN_OUTSIDE se registra como nota aun en verde
```

`MIN_OTBN_SHARE_PCT = 1`, y la categoría dominante es **la más restrictiva** por
encima de ese umbral, no la de mayor superficie: un lote 60 % Cat III / 40 % Cat I
es un problema de Categoría I. Un lote en Categoría I sin desmonte posterior a
2020 da **amarillo, no rojo** — no incumple EUDR, pero es una bandera legal que el
acopio necesita ver.

**Vocabulario del dominio** (literal, tal como lo usa el código)

- **lote** — una parcela: polígono GeoJSON canónico (WGS84, `[lon, lat]`) más
  nombre, provincia, RENSPA opcional, superficie, centroide, bbox, huella de
  geometría y origen. Identificador **interno y propio** (`nanoid(12)`): no existe
  identificador oficial de parcela en la declaración europea, y el RENSPA es por
  establecimiento, no por lote.
- **veredicto** — `"verde" | "amarillo" | "rojo"`. Etiquetas de interfaz:
  "Sin observaciones" / "Con observaciones" / "No cumple".
- **exportabilidad** — nombre de presentación del veredicto EUDR existente. Los
  identificadores del código (`verdict`, `VerdictReason`, `verdict.ts`) no
  cambian.
- **aptitud legal** — el reparto de la superficie del lote entre las cuatro
  categorías del OTBN (`OtbnShare[]`, campo `otbnBreakdown` /
  `otbn_breakdown`). Los identificadores del código no cambian.
- **OTBN** — Ordenamiento Territorial de Bosques Nativos (Ley 26.331).
  Categorías: `"rojo" | "amarillo" | "verde" | "fuera_de_otbn" | "sin_cobertura"`.
  El campo de origen es `cat_cons`, con literales `I`/`II`/`III` idénticos en las
  tres provincias; normaliza `I → rojo`, `II → amarillo`, `III → verde`.
- **Categoría I / II / III** — Conservación, no se puede desmontar / Uso
  sostenible, sin desmonte / Puede transformarse, con autorización.
- **UMSEF** — Unidad de Manejo del Sistema de Evaluación Forestal (MAyDS). Fuente
  de la capa de pérdida de bosque nativo posterior a 2020.
- **acopio** — quien compra y exige el documento.
- **RENSPA** — registro de establecimiento de SENASA. **Texto libre**: viaja al
  PDF tal cual y a ningún otro lado. Formato oficial `00.000.0.00000/00`, 17
  caracteres (Res. SENASA 423/2014 Art. 3°), pero no se valida.
- **debida diligencia** — el documento bajo Reglamento (UE) 2023/1115.
- **fecha de corte** — `2020-12-31` (`CUTOFF_YEAR = 2020`).
- **ventana despejada / ventana ampliada** — el período de 5 días más despejado
  elegido con datos de nubosidad, contra el rango amplio de respaldo.
  `windowSource: "xweather" | "ampliada" | "fallback"`.
- **referencia / actual** — imagen de línea de base 2020 contra la pasada
  despejada más reciente. `ImagePeriod = "reference" | "current"`.
- **NDVI** — el índice usado para las imágenes, elegido sobre el color verdadero
  porque el dosel seco del Chaco y el suelo recién topado son igual de oscuros y
  barrosos a 512 px.
- **motivos / fuentes** — razones del veredicto y referencias de capa citadas,
  renderizadas en la interfaz y en el PDF.

Otros enums literales: `VerificationStatus = "pending" | "ready" | "failed"`,
`LoteSource = "draw" | "kml" | "geojson"`,
`failureCode = "PROVINCE_NOT_COVERED" | "FOREST_LOSS_UNAVAILABLE"`,
`VerdictReason = "FOREST_LOSS_AFTER_CUTOFF" | "FOREST_LOSS_MARGINAL" | "OTBN_CATEGORY_I" | "OTBN_CATEGORY_II" | "OTBN_NO_COVERAGE" | "OTBN_OUTSIDE" | "NO_FINDINGS"`.

**Restricciones técnicas que el diseño no puede ignorar**

- Geometría interna canónica en GeoJSON `[lon, lat]`, con adaptador explícito en
  cada frontera. En Argentina continental latitud y longitud son ambas negativas y
  de magnitud comparable, así que invertirlas **no lanza error y devuelve HTTP
  200**: un polígono plausible en el lugar equivocado.
- PostgreSQL **sin PostGIS**; toda la geometría se resuelve con Turf.js contra
  archivos GeoJSON. Coordenadas en `double precision`, nunca `real`.
- Una verificación fallida es un hecho de dominio persistido, no un pedido roto:
  la ruta responde **200 aun cuando falla**.
- Sin imágenes de Copernicus el veredicto no cambia; se dice en la interfaz, en el
  PDF y en el README.
- Xweather degrada en silencio a `fallback` sin bloquear nada.
- El mapa monta MapLibre imperativamente y necesita que el worker esté copiado a
  `public/`; si no, toda fuente GeoJSON se cuelga sin error.
- **La aptitud legal no es un semáforo.** Se presenta como reparto de
  hectáreas, nunca colapsada a un color único: eso repetiría el error que este
  eje deshace y violaría la misma Regla de la Palabra que rige el veredicto
  EUDR.
- **El cuarto balde (`fuera_de_otbn`) es obligatorio, no opcional.** Córdoba no
  zonifica ninguna Categoría III: sin ese balde, todo lote cordobés informaría
  cero hectáreas aprovechables, que es falso.

**Deliberadamente fuera de alcance** (decisiones, no faltantes)

- Detección propia de deforestación a partir de imágenes.
- Validación de RENSPA contra SENASA (no hay API pública; requeriría un convenio).
- GFW Data API (alta con Okta, tope de responsabilidad de USD 100, suspensión sin
  aviso, atribución obligatoria, y un `POST /geostore` que redirige 307 a AWS en
  HTTP plano — filtraría polígonos del productor sin cifrar).
- OTBN en vivo por WFS (funciona, ~2,5 s, documentado; la demo no puede depender
  de un servidor del Estado).
- Equipos, roles, notificaciones, panel de administración, exportación a Excel.
- Verificación de correo (no hay proveedor de correo en el alcance).
- Tests automatizados de interfaz. Los tests unitarios cubren la lógica pura.
- Provincias fuera de las tres cubiertas.
- El XLSX de VISEC y el cuestionario de 22 preguntas del legajo.

**Decisiones de producto explícitamente abiertas** (registrar, no inventar)

- Si el XLSX de VISEC y el cuestionario de legalidad de origen entran al alcance.
- Acceso a VISEC como "Operador Facilitador de carga de UP" (`visec-mrv@bcr.com.ar`).
  No hay API pública; el canal de terceros existe y está en uso, pero es un
  trámite externo bloqueante.
- La licencia de la capa de UMSEF dice literalmente *"Creative Conmons. Esta
  licencia es una licencia libre"* —con el error de tipeo—, sin versión.
  **Legalmente inutilizable tal como está** sin aclaración de Ambiente.
- Obligatoriedad por campo del template de VISEC: las plantillas no traen
  `dataValidation` ni comentarios, y la hoja `Localidades` viene vacía.
- Máximo de commodities por declaración: el XSD dice 200, la página de validación
  dice 100. Diseñar contra 100.

## Brand Commitments

- **Nombre:** Lote Limpio.
- **Idioma y voz:** castellano rioplatense con voseo en toda la interfaz
  ("Verificá", "Cargá", "Dibujá", "Tocá", "Entrá"), `lang="es-AR"`, formato de
  números y fechas `es-AR`. Incluso los mensajes de error se redactan en
  castellano **en el servidor** y se muestran tal cual, así el cliente nunca
  necesita un switch de código a copy. La voz es directa y llana, sin jerga.
- **Tipografía:** **Archivo**, de Omnibus-Type (Buenos Aires), única familia del
  producto. Elegida como grotesca argentina para una herramienta de campo
  argentina, y por rendir a tamaños chicos con luz fuerte.
- **Colores de OTBN:** `#f10000` / `#eff60b` / `#33a02c` son los valores SLD
  publicados por el Ministerio de Ambiente. Son una restricción factual, no una
  elección estética: el chip tiene que coincidir con un mapa que el productor tal
  vez ya vio.
- **Assets de marca que no existen:** no hay logo, no hay imagen de Open Graph, no
  hay fotografía de producto. `public/` sólo contiene el worker de MapLibre. El
  único archivo de marca es `app/favicon.ico`.

## Evidence on Hand

**Real y citable**

- `README.md` — narrativa de producto, el semáforo, las decisiones técnicas y lo
  que quedó afuera con su porqué.
- `research/` — cinco líneas de investigación previa (`resumen.md`,
  `geolocalizacion-eudr.md`, `legalidad-origen.md`, `otbn-provincias.md`,
  `perdida-forestal.md`, `visec.md`), con **46 ítems marcados `NO CONFIRMADO`**.
  Ningún campo se completó por suposición.
- `apps/web/data/sources.json` — manifiesto de procedencia (editor, vigencia,
  instrumento legal, licencia, fecha de descarga, cantidad de features, comando de
  simplificación, superficie retenida, caveat). Es lo que el PDF cita.
- Dos lotes de demostración reales y cruzados: **Pellegrini Norte** (Santiago del
  Estero, bosque chaqueño seco cerrado en 2020, desmontado para agricultura en
  2023 → rojo esperado) y **La Amarga** (Córdoba, agrícola de larga data, pérdida
  cero → control limpio).
- Más de 400 tests unitarios sobre lógica pura: veredicto, geometría,
  intersección de capas, reparto de aptitud, selección de ventana despejada y
  reproducibilidad del hash (`pnpm --filter web test` para el número exacto).

**Advertencias declaradas que ningún trabajo futuro puede ocultar**

- Las tres capas de OTBN son **1:250 000**, y sus propios PDF de metadatos
  admiten que el producto *"no refleja estrictamente el OTBN aprobado por la ALA"*.
- **Chaco** publica el ordenamiento de 2009. La rezonificación de 2024 (Ley 4005-R,
  vigente desde la Sentencia 19/2026 del STJ) **no existe como dato geográfico
  publicado en ningún lado**.
- **Córdoba** no tiene ninguna zona de Categoría III, y sus polígonos fueron
  digitalizados de un mapa JPG: cerca de un límite, la intersección es indicativa.
- La simplificación necesaria para servir las capas elimina ~7 % de la superficie
  de Categoría III, en parches chicos y dispersos.
- Tres subincisos del Art. 2(40) —d, f, g— **sólo** pueden cubrirse con
  declaración jurada del productor, porque el documento que los acreditaría no
  existe en el derecho argentino.

**Ausencias que no se deben fabricar**

No hay clientes reales, testimonios, precios, benchmarks, despliegue en
producción, cuenta de VISEC, ni acuerdo con SENASA. Nada de eso puede aparecer en
una superficie futura.

## Product Principles

1. **Un dato faltante nunca es un resultado limpio.** Verde exige evidencia
   positiva de las dos capas. Un amarillo honesto vale más que un verde prestado,
   porque alguien río abajo va a confiar en él.
2. **El documento cita capas, nunca nuestra propia inferencia sobre imágenes.**
   Las fotos son evidencia visual; la autoridad está en la fuente oficial.
3. **La incertidumbre se imprime.** Cada límite conocido de cada capa viaja al
   PDF y a la pantalla.
4. **El color nunca carga significado solo.** Todo veredicto viaja con sus
   palabras, en la lista, en el marcador del mapa y en el documento.
5. **El límite de tenencia es el productor individual, y se hace cumplir en la
   capa de datos**, no en el handler: toda consulta filtra por `userId` para que
   ningún endpoint pueda olvidarse.
6. **Una superficie informada viaja con la escala de la capa que la produjo.**
   Un reparto sobre una capa 1:250 000 se informa en hectáreas enteras y en
   porcentajes de un decimal, y lleva al lado tanto el caveat general de escala
   y simplificación como la advertencia propia de la capa provincial
   consultada, nunca como un total único de "hectáreas transformables": la
   precisión que se muestra no puede superar la que la fuente puede sostener.

## Accessibility & Inclusion

Requisitos de usuario establecidos, ya implementados y que no se pueden perder:

- **Aproximadamente uno de cada doce varones no separa el rojo del verde, y esta
  audiencia es mayormente de varones trabajando al aire libre.** Por eso cada
  veredicto empaqueta su propio título y resumen en palabras.
- `prefers-reduced-motion: reduce` lleva toda animación y transición a `0.01ms`.
- Objetivos táctiles de **mínimo 3.25rem**, dimensionados para un pulgar
  enguantado en un vehículo en movimiento. Filas de lista de `4.5rem`.
- **La etiqueta del mapa es el objetivo táctil, no el polígono.** Con el zoom
  lejos para ver todos los lotes, un campo mide dos o tres píxeles: no hay dedo
  que lo acierte. Los marcadores son `<button>` reales con `aria-label`.
- El comparador es un `<input type="range">` nativo, así funciona con pulgar, con
  mouse y con teclado, y se anuncia solo a un lector de pantalla.
- Errores con `role="alert"`, cada uno con un *qué pasó* en negrita y un *qué
  hacer* en tono suave.
- Formularios con `<Label htmlFor>` real, `autoComplete` correcto, `text-base`
  para evitar el zoom al enfocar en iOS, y `noValidate` para que gane la copy en
  castellano.
- `font-variant-numeric: tabular-nums` para que hectáreas y porcentajes alineen
  columna a columna; `viewportFit: "cover"` para teléfonos con muesca.
