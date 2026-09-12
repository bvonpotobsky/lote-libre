# Reposicionamiento: aptitud legal y exportabilidad

Fecha: 2026-09-12

## Por qué

Hoy el producto se presenta como trazabilidad EUDR: «Tu lote, con evidencia»,
para «presentar al acopio». Ese mensaje le habla a un solo momento —el acopio te
exigió el papel—, que es reactivo, de frecuencia baja («una o dos veces por
campaña», según PRODUCT.md) y ajeno: el productor entra porque otro lo obligó.

Además lidera con el eje equivocado. El Reglamento (UE) 2023/1115 recién es
exigible el 30/12/2026. El OTBN (Ley 26.331) es ley argentina vigente hoy y
decide si un campo se puede poner en producción nueva. El producto ya calcula el
segundo y lo estaba escondiendo detrás del primero.

El disparador nuevo es una transacción de campo —compra, alquiler o cotización—,
donde la aptitud legal del suelo y su exportabilidad tienen implicancia directa
en el precio.

## La tesis

**Un campo no vale lo que mide. Vale lo que la ley te deja hacer con él.**

Dos techos legales sobre el mismo suelo, ambos derivados de las dos capas que el
producto ya hornea en tiempo de build:

- **Qué se puede hacer** con esta tierra → OTBN, Argentina, vigente hoy.
- **Qué se puede vender** desde esta tierra → EUDR, Unión Europea, 30/12/2026.

La pata EUDR no se degrada ni se mueve: gana una pata que la precede en el
tiempo y que aplica a más gente.

## Decisiones tomadas

1. **Reposicionamiento completo**, no un segundo argumento pegado al pitch
   existente. PRODUCT.md, DESIGN.md y la landing se reescriben alrededor de la
   tesis única.
2. **Dos usuarios, un solo flujo.** El comprador o arrendatario se registra y
   evalúa lotes candidatos; el dueño sigue verificando los propios para exportar.
   Ambos dibujan o importan geometría con las herramientas que ya existen
   (`LoteSource = "draw" | "kml" | "geojson"`). El aislamiento por `userId` y el
   404 sobre lote ajeno **no se tocan**: cada usuario ve solo lo que cargó.
   RENSPA ya es opcional, así que un comprador no queda bloqueado.
3. **Dos ejes separados, nunca fusionados en una escala.** Aptitud es un reparto
   de hectáreas; exportabilidad es el semáforo actual. Responden preguntas
   distintas y no comparten unidad.
4. **Un informe con dos secciones y una sola huella**, no dos documentos.

## Eje 1 — Aptitud legal (nuevo)

### El cálculo ya existe y se descarta

`lib/geo/layers.ts:86` (`overlapByKey`) acumula hectáreas reales por categoría
del OTBN vía `turf.intersect` + `turf.area` (líneas 112-115). `lookupOtbn`
(`lib/services/otbn.ts`) lo convierte a porcentajes y lo colapsa a una sola
categoría dominante con `dominantOtbnCategory`, descartando el reparto.

El cambio es ensanchar `OtbnResult` para que además cargue el desglose.
`lib/services/verdict.ts` no se modifica: sigue recibiendo la misma forma que
hoy y sus tests siguen válidos.

### Cuatro baldes, no tres

| Balde | Significado legal |
|---|---|
| Categoría I | Conservación. No se puede desmontar. |
| Categoría II | Uso sostenible. Sin desmonte. |
| Categoría III | Puede transformarse, con autorización. |
| Fuera del OTBN | No clasificado como bosque nativo. Sin restricción por esta ley. |

El cuarto balde se deriva de `loteAreaHa − Σ hectáreas por categoría` y es
**obligatorio**. Córdoba no zonifica ninguna Categoría III: sin ese balde, todo
lote cordobés informaría cero hectáreas aprovechables, que es falso. En Córdoba
la superficie relevante para un comprador es precisamente la que cae fuera del
ordenamiento.

Si la capa contuviera polígonos superpuestos, la suma por categoría puede
exceder el área del lote. El resto se clampea a 0; nunca se informa un balde
negativo ni se reescala el reparto para que cierre.

### El eje de aptitud no es un semáforo

Se presenta como reparto de hectáreas, no como un color. Colapsarlo a un estado
único repetiría el error que este cambio deshace, y violaría el principio de que
el color nunca carga significado solo. Cada balde viaja con su frase legal.

### Reglas de honestidad del número

Las capas no sostienen precisión de agrimensor, y los propios metadatos lo
admiten: son 1:250 000 y «no refleja estrictamente el OTBN aprobado por la ALA».
La simplificación de servido elimina ~7 % de la superficie de Categoría III en
parches chicos y dispersos, de modo que ese balde sale **subestimado por
construcción**. Los polígonos de Córdoba fueron digitalizados de un JPG. Chaco
publica el ordenamiento de 2009; la rezonificación de 2024 no existe como dato
geográfico publicado.

Por lo tanto:

1. **Hectáreas enteras, nunca decimales.** Un decimal sobre 1:250 000 es una
   mentira de precisión.
2. **Nunca un total único de «hectáreas transformables».** Se muestran los
   cuatro baldes y el lector suma. Categoría III exige autorización, y «fuera
   del OTBN» significa que esta ley no lo alcanza, no que sea libre.
3. **El caveat viaja pegado al número**, en el ámbar de `alerta`, en pantalla y
   en el PDF. Es el principio «la incertidumbre se imprime» aplicado al eje
   nuevo.
4. `sin_cobertura` (provincia sin capa) **no produce desglose**. Ausencia de
   dato nunca se presenta como reparto.

## Eje 2 — Exportabilidad (sin cambios)

El semáforo `verde | amarillo | rojo` y toda la regla de `verdict.ts` quedan
intactos, incluidos sus tests. Un lote en Categoría I sin desmonte posterior
al corte sigue dando amarillo. El acopio sigue leyendo exactamente lo que hoy
sabe leer.

## El informe

Un solo PDF, dos secciones, una sola huella SHA-256 que congela ambas.

`PAYLOAD_VERSION` pasa de `1` a `2` en `lib/services/document.ts:7`. Los
documentos ya emitidos siguen verificando sin migración: el payload se persiste y
se re-serializa desde lo guardado, no se recomputa (`document.ts:24`). Un payload
v1 sin desglose produce el mismo hash que siempre.

Orden del documento:

```
Encabezado + veredicto            sin cambios
Identificación del lote           sin cambios
Aptitud legal (OTBN)              nuevo: cuatro baldes + caveat
Resultado de exportación (EUDR)   el bloque actual, intacto
Comparación satelital             sin cambios
Fuentes consultadas               sin cambios
```

Aptitud precede a exportación porque es derecho vigente hoy. El badge de
veredicto **permanece en el encabezado**: bajarlo le quitaría al acopio lo único
que vino a buscar.

Nombre del documento: «Informe de lote — aptitud legal y debida diligencia», con
la cita textual al Reglamento (UE) 2023/1115 donde ya está.

## La landing

Se tocan cuatro secciones; cuatro quedan intactas.

- **Hero** — copy nuevo sobre la tesis. Reemplaza «Trazabilidad EUDR para soja y
  ganadería» / «Tu lote, con evidencia» / «para presentar al acopio».
- **Resultados** — hoy muestra las tres filas del semáforo. Pasa a mostrar los
  dos ejes: reparto de hectáreas arriba, semáforo EUDR abajo. Es el cambio
  estructural mayor de la landing.
- **Documento** — la hoja dibujada debe incluir la sección de aptitud, o el pitch
  promete algo que el papel ilustrado no tiene.
- **Cierre** — «Cuando el acopio pida el papel, tené cómo respaldarlo» es el
  disparador viejo. Se reescribe hacia el momento nuevo: antes de firmar.
- **EscenaTerritorio, EvidenciaSatelital, AlcanceFuentes, encabezado y pie** —
  sin cambios. `AlcanceFuentes` gana peso argumental por sí sola: los caveats de
  1:250 000 dejan de leerse como disculpa y pasan a ser parte de la propuesta.

El lote de ejemplo de la landing trae un desglose **inventado**, escrito a mano
en `lib/landing/aptitud-ejemplo.ts` y compartido por la sección de resultados y
por la hoja del documento.

Esta decisión revierte el requisito original de esta misma spec, que pedía un
desglose real horneado por `scripts/build-landing-assets.ts` hacia
`lib/landing/ejemplo-capas.generated.ts`. El motivo es la Regla del Ejemplo
Rotulado de `DESIGN.md`: el encuadre generado es un lugar real —Pellegrini
Norte— y publicar el reparto por categoría de un departamento real es
exactamente el resultado que esa regla veta, porque nadie fuera del producto lo
leería como ilustrativo. Un dato horneado sería más verificable y menos
publicable.

Lo que sí se conserva del requisito es la disciplina: el ejemplo cierra
aritméticamente (sus hectáreas suman las 312 que declara y sus porcentajes el
100 %), usa el mismo redondeo que `buildOtbnBreakdown`, produce el mismo
veredicto que `lib/services/verdict.ts` daría para ese reparto, viaja con el
rótulo obligatorio de ejemplo ficticio y está cubierto por
`aptitud-ejemplo.test.ts`. Ninguna hectárea sale de
`lib/landing/ejemplo-capas.generated.ts`, que sigue sin exportar resúmenes.

## Vocabulario

«Tu lote» deja de funcionar cuando quien mira es un comprador. Pasa a «el lote» /
«este lote» en toda superficie compartida. El voseo se conserva íntegro: cambia
el posesivo, no la voz. La app autenticada puede seguir usando «tus lotes» en
la lista propia del usuario.

Términos nuevos del dominio:

- **aptitud legal** — el reparto de la superficie del lote entre las cuatro
  categorías del OTBN.
- **exportabilidad** — el veredicto EUDR existente, renombrado solo en la
  presentación; los identificadores del código no cambian.

## Fuera de alcance

- Valuación monetaria, precio por hectárea, comparables de mercado o cualquier
  cifra en pesos o dólares. El producto informa techos legales, no tasa campos.
- Búsqueda de campos por nomenclatura catastral o resolución de geometría desde
  un aviso. El comprador dibuja o importa, como hoy.
- Compartir un lote entre cuentas, roles, equipos o permisos de lectura. El
  aislamiento por `userId` se mantiene tal cual.
- Cambios a `verdict.ts` o a la regla del semáforo.
- Provincias fuera de Córdoba, Santiago del Estero y Chaco.
- Renombrar el producto. «Lote Limpio» se sostiene bajo el enfoque nuevo.

## Orden de implementación

Tres tajos, cada uno desplegable por separado.

1. **Cálculo.** Ensanchar `OtbnResult` con el desglose de cuatro baldes,
   persistirlo con la verificación y mostrarlo en `/lotes/:id`. Tests sobre el
   reparto, el clampeo del resto y el caso `sin_cobertura`.
2. **Informe.** `PAYLOAD_VERSION = 2`, sección de aptitud en el PDF, caveat
   impreso, y un test que demuestre que un payload v1 sigue produciendo su hash
   original.
3. **Landing y documentos.** Hero, Resultados, Documento y Cierre; horneado del
   ejemplo real; reescritura de PRODUCT.md y de la sección Landing de DESIGN.md.

La landing va última a propósito: la convención vigente del proyecto es que la
landing solo promete lo que el código hace.

## Riesgos

- **Precisión percibida.** Un reparto en hectáreas invita a confiar más de lo que
  la capa permite. Mitigado por hectáreas enteras, ausencia de total único y
  caveat pegado al número; si la mitigación se debilita en implementación, el
  riesgo vuelve entero.
- **Chaco desactualizado.** El ordenamiento de 2009 puede repartir hectáreas de
  forma que la rezonificación de 2024 contradiga. El caveat de la fuente ya lo
  declara y debe viajar al PDF sin excepción.
- **Dilución del mensaje.** Dos audiencias pueden producir un pitch que no le
  hable a ninguna. Mitigado por la tesis única: no son dos mensajes, es una sola
  frase con dos consecuencias.
- **Licencia de UMSEF.** Sigue siendo legalmente inutilizable tal como está
  publicada. Este cambio no la agrava ni la resuelve.
