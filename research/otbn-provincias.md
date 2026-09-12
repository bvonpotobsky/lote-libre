# OTBN — Córdoba, Santiago del Estero y Chaco

Investigación técnica y normativa de las capas de Ordenamiento Territorial de Bosques Nativos (OTBN, Ley 26.331) para las tres provincias objetivo de Lote Limpio.

- **Fecha de consulta de todas las fuentes: 2026-09-12.**
- Todo dato marcado como **NO CONFIRMADO** no pudo verificarse contra fuente primaria; se indica qué se buscó.
- Nombres de campo, valores literales y citas normativas se transcriben en su forma original.

---

## 1. Tabla maestra

| Provincia | Capa | Norma provincial y año | Vintage del dato | Descarga directa (.rar) | Capa WFS | Features (WFS `resultType=hits`) | Escala de captura |
|---|---|---|---|---|---|---|---|
| Córdoba | `CD_2010_OTBN` | **Ley provincial 9.814**, sancionada 05-08-2010, B.O. 10-08-2010. Reglamentada por Decreto 170/2011 (NO CONFIRMADO contra fuente primaria) | 2010 | `https://geo.ambiente.gob.ar/documentos/sinia/bosque_OTBN/CD_2010_OTBN.rar` (HTTP 200, `application/rar`, 2.256.969 bytes) | `bosques:CD_2010_OTBN` | **3.626** | 1:250.000 |
| Chaco | `CH_2009_OTBN` | **Ley provincial 6.409** (= **Ley 1762-R** en el digesto chaqueño), 2009. Modificada por Ley 7.238 (2013) y Decreto 298/19. **Rezonificada por Ley 4005-R (2024), que NO está publicada como dato descargable** | 2009 | `https://geo.ambiente.gob.ar/documentos/sinia/bosque_OTBN/CH_2009_OTBN.rar` (HTTP 200, `application/rar`, 54.732.723 bytes) | `bosques:CH_2009_OTBN` | **42.398** | 1:250.000 |
| Santiago del Estero | `SE_2015_OTBN` | **Ley provincial 6.942** (sancionada 17-03-2009 según SAIJ), **actualizada por Decreto Provincial 3.133 del 23-12-2015** | 2015 | `https://geo.ambiente.gob.ar/documentos/sinia/bosque_OTBN/SE_2015_OTBN.rar` (HTTP 200, `application/rar`, 128.856.337 bytes) | `bosques:SE_2015_OTBN` | **23.347** | 1:250.000 |

**Endpoint WFS:** `https://geo.ambiente.gob.ar/geoserver/wfs`
**CRS declarado por GetCapabilities para las tres capas:** `<DefaultCRS>urn:ogc:def:crs:EPSG::4326</DefaultCRS>` (forma *authority*, orden de ejes lat,lon — ver sección 7).
**`.prj` de los tres shapefiles (idéntico, literal):**

```
GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]
```

**`.cpg` de los tres:** `UTF-8`. No hay que reproyectar desde POSGAR.

Extensiones declaradas (`ows:WGS84BoundingBox`, orden lon,lat):

| Capa | LowerCorner | UpperCorner |
|---|---|---|
| `CD_2010_OTBN` | `-65.7892608642578 -35.0431785583496` | `-62.1444969177246 -29.4711894989014` |
| `CH_2009_OTBN` | `-63.4007873535156 -28.0225086212158` | `-58.3573417663574 -24.0679969787598` |
| `SE_2015_OTBN` | `-65.1919937133789 -30.4927654266357` | `-61.6951179504395 -25.6249847412109` |

Contenido de cada `.rar` (verificado por listado real del archivo): `.shp`, `.shx`, `.dbf`, `.prj`, `.cpg`, `.sld` con los colores oficiales, `<XX>_OTBN_25042023.pdf` con la metadata ISO, y `sobre_capa_<capa>.txt`.

**El OTBN nacional no sirve como sustituto:**
- `https://geo.ambiente.gob.ar/documentos/sinia/bosque_OTBN/OTBN_Nacional_2023.rar` → **HTTP 404**.
- `bosques:otbn_nacional` existe pero tiene **66 features** y su esquema es `the_geom`, `fna` (string), `nam` (string), `cam` (string), `dct` (date), `sag` (string): **no trae categoría de conservación**.
- En el workspace `bosques` no existe ninguna capa OTBN más reciente para estas tres provincias. El listado completo de GetCapabilities contiene exactamente una capa OTBN por provincia: `CD_2010_OTBN`, `CH_2009_OTBN`, `SE_2015_OTBN`.

---

## 2. Esquema de atributos por provincia — transcripción literal

### 2.1 WFS `DescribeFeatureType` (WFS 2.0.0, `application/gml+xml; version=3.2`)

**Córdoba — `bosques:CD_2010_OTBN`**

```xml
<xsd:complexType name="CD_2010_OTBNType">
  <xsd:complexContent>
    <xsd:extension base="gml:AbstractFeatureType">
      <xsd:sequence>
        <xsd:element maxOccurs="1" minOccurs="0" name="the_geom" nillable="true" type="gml:MultiSurfacePropertyType"/>
        <xsd:element maxOccurs="1" minOccurs="0" name="clase" nillable="true" type="xsd:string"/>
        <xsd:element maxOccurs="1" minOccurs="0" name="cat_cons" nillable="true" type="xsd:string"/>
        <xsd:element maxOccurs="1" minOccurs="0" name="areaha" nillable="true" type="xsd:double"/>
        <xsd:element maxOccurs="1" minOccurs="0" name="id" nillable="true" type="xsd:long"/>
      </xsd:sequence>
    </xsd:extension>
  </xsd:complexContent>
</xsd:complexType>
```

**Chaco — `bosques:CH_2009_OTBN`**

```xml
<xsd:complexType name="CH_2009_OTBNType">
  <xsd:complexContent>
    <xsd:extension base="gml:AbstractFeatureType">
      <xsd:sequence>
        <xsd:element maxOccurs="1" minOccurs="0" name="the_geom" nillable="true" type="gml:MultiSurfacePropertyType"/>
        <xsd:element maxOccurs="1" minOccurs="0" name="clase" nillable="true" type="xsd:string"/>
        <xsd:element maxOccurs="1" minOccurs="0" name="cat_cons" nillable="true" type="xsd:string"/>
        <xsd:element maxOccurs="1" minOccurs="0" name="area_ha" nillable="true" type="xsd:double"/>
        <xsd:element maxOccurs="1" minOccurs="0" name="id" nillable="true" type="xsd:long"/>
      </xsd:sequence>
    </xsd:extension>
  </xsd:complexContent>
</xsd:complexType>
```

**Santiago del Estero — `bosques:SE_2015_OTBN`**

```xml
<xsd:complexType name="SE_2015_OTBNType">
  <xsd:complexContent>
    <xsd:extension base="gml:AbstractFeatureType">
      <xsd:sequence>
        <xsd:element maxOccurs="1" minOccurs="0" name="the_geom" nillable="true" type="gml:MultiSurfacePropertyType"/>
        <xsd:element maxOccurs="1" minOccurs="0" name="clase" nillable="true" type="xsd:string"/>
        <xsd:element maxOccurs="1" minOccurs="0" name="cat_cons" nillable="true" type="xsd:string"/>
        <xsd:element maxOccurs="1" minOccurs="0" name="area_ha" nillable="true" type="xsd:decimal"/>
        <xsd:element maxOccurs="1" minOccurs="0" name="id" nillable="true" type="xsd:long"/>
      </xsd:sequence>
    </xsd:extension>
  </xsd:complexContent>
</xsd:complexType>
```

> **Los tres esquemas NO son idénticos.** Difieren en dos puntos:
> 1. Córdoba llama al campo de superficie **`areaha`** (sin guion bajo); Chaco y SdE lo llaman **`area_ha`**.
> 2. El tipo del campo de superficie es **`xsd:double`** en Córdoba y Chaco, y **`xsd:decimal`** en Santiago del Estero.
>
> `the_geom`, `clase`, `cat_cons` e `id` sí coinciden en nombre y tipo en las tres.

### 2.2 Cabecera DBF del shapefile (dentro del `.rar`) — aún más divergente

Los nombres reales dentro del `.dbf` **no** son los que expone el WFS. GeoServer los sirve en minúscula porque la capa fue cargada a PostGIS; el archivo descargable conserva el casing original. Si el código lee el `.shp` directamente, los nombres son estos:

| Provincia | Campo 1 | Campo 2 | Campo 3 | Campo 4 |
|---|---|---|---|---|
| **Córdoba** (3.626 registros, `last_update` 2023-09-05) | `Clase` — tipo `C`, len 100 | `Cat_cons` — tipo `C`, len 10 | `AreaHa` — tipo `N`, len 19, dec 10 | `ID` — tipo `N`, len 16, dec 0 |
| **Chaco** (42.398 registros, `last_update` 2023-08-29) | `CLASE` — tipo `C`, len 100 | `CAT_CONS` — tipo `C`, len 10 | `AREA_HA` — tipo `N`, len 10, dec 2 | `ID` — tipo `N`, len 10, dec 0 |
| **Santiago del Estero** (23.347 registros, `last_update` 2023-09-05) | `Clase` — tipo `C`, len 254 | `Cat_cons` — tipo `C`, len 254 | `Area_ha` — tipo `N`, len 21, dec 5 | `ID` — tipo `N`, len 10, dec 0 |

**Tres casings distintos para el mismo concepto**: `Cat_cons` / `CAT_CONS` / `Cat_cons`, y `AreaHa` / `AREA_HA` / `Area_ha`. Chaco está íntegramente en mayúsculas. Córdoba pierde el guion bajo en el campo de área tanto en el DBF (`AreaHa`) como en el WFS (`areaha`).

**Nota adicional:** el PDF de metadata de las tres provincias documenta el campo como `Area_ha`, lo que **no coincide** con el `AreaHa` real del DBF de Córdoba ni con el `AREA_HA` de Chaco. La documentación oficial es inexacta en este punto; vale el archivo, no el PDF.

### 2.3 Nombres de campo en los `.sld` oficiales

Los `.sld` filtran por el campo de categoría con un casing propio, distinto según provincia:

| Provincia | `<ogc:PropertyName>` en el SLD | Reglas presentes |
|---|---|---|
| Córdoba | `Cat_cons` | **Solo 2**: Categoría I y Categoría II |
| Chaco | `CAT_CONS` | 3: Categorías I, II y III |
| Santiago del Estero | `Cat_cons` | 3: Categorías I, II y III |

**Colores oficiales, literales del SLD:**

| Categoría | Córdoba | Chaco | Santiago del Estero |
|---|---|---|---|
| I — "Categoría I: Alto valor de conservación" | `#f10000` | `#f10000` | `#f10000` |
| II — "Categoría II: Mediano valor de conservación" | `#eff60b` | `#eff60b` | `#eff60b` |
| III — "Categoría III: Bajo valor de conservación" | *(no existe la regla)* | `#33a02c` | **`#339823`** |

> El verde de Santiago del Estero es **`#339823`**, no `#33a02c`. Son dos verdes distintos en dos provincias. Si la UI usa un único verde institucional hay que decidirlo explícitamente, no heredarlo del SLD.

---

## 3. Valores literales de `cat_cons` y `clase`, con conteos

Obtenidos enumerando la totalidad de cada capa vía WFS `outputFormat=csv` con `propertyName` acotado (sin geometría) y verificados contra `resultType=hits`. Las sumas por categoría coinciden exactamente con el total de features de cada capa, por lo que **no hay valores nulos ni vacíos** en `clase` ni en `cat_cons` en ninguna de las tres provincias.

### Córdoba — `CD_2010_OTBN` (3.626 features)

| `clase` | `cat_cons` | features | Σ `areaha` |
|---|---|---|---|
| `Bosque Nativo` | `I` | 2.702 | 2.391.796,2 |
| `Bosque Nativo` | `II` | 924 | 528.499,8 |
| — | `III` | **0** | **0** |

- Valores distintos de `clase`: **`Bosque Nativo`** (único, 3.626/3.626).
- Valores distintos de `cat_cons`: **`I`**, **`II`**. **`III` no aparece nunca.**
- Total: 3.626 features, 2.920.296,0 ha.

### Chaco — `CH_2009_OTBN` (42.398 features)

| `clase` | `cat_cons` | features | Σ `area_ha` |
|---|---|---|---|
| `Bosque Nativo` | `I` | 185 | 296.662,1 |
| `Bosque Nativo` | `II` | 17.034 | 3.107.980,4 |
| `Bosque Nativo` | `III` | 25.179 | 1.530.991,4 |

- Valores distintos de `clase`: **`Bosque Nativo`** (único, 42.398/42.398).
- Valores distintos de `cat_cons`: **`I`**, **`II`**, **`III`**.
- Total: 42.398 features, 4.935.633,9 ha.

### Santiago del Estero — `SE_2015_OTBN` (23.347 features)

| `clase` | `cat_cons` | features | Σ `area_ha` |
|---|---|---|---|
| `Bosque Nativo` | `I` | 180 | 973.406,9 |
| `Bosque Nativo` | `II` | 11.606 | 5.964.301,0 |
| `Bosque Nativo` | `III` | 305 | 168.172,8 |
| `Bosque a restaurar` | `I` | 180 | 9.358,4 |
| `Bosque a restaurar` | `II` | 3.835 | 321.442,7 |
| `Bosque a restaurar` | `III` | 7.241 | 285.411,1 |

- Valores distintos de `clase`: **`Bosque Nativo`** (12.091 features, 7.105.880,8 ha) y **`Bosque a restaurar`** (11.256 features, 616.212,3 ha).
- Valores distintos de `cat_cons`: **`I`** (360 / 982.765,3 ha), **`II`** (15.441 / 6.285.743,8 ha), **`III`** (7.546 / 453.583,9 ha).
- Total: 23.347 features, 7.722.093,1 ha.

> **`clase` es ortogonal a `cat_cons` en SdE**: `Bosque a restaurar` aparece en las tres categorías, incluida la I (rojo). El PDF de metadata de SdE define el campo como *"Leyenda de Bosque Nativo o Bosque a restaurar, conforme art. 40 Ley 26.331"*. El Art. 40 dispone que la restauración **mantiene la categoría de clasificación** original, así que `clase` no modifica el veredicto: modifica la explicación. Un polígono `Bosque a restaurar` + `cat_cons='I'` sigue siendo Categoría I a todos los efectos.

### 3.1 Contraste con las cifras oficiales del validador

Validador oficial de superficies: `https://ciam.ambiente.gob.ar/dt_csv.php?dt_id=388` (HTTP 200, `text/csv;charset=UTF-8`). Cabecera literal, separador `;`:

```
"provincia";"unidad";"total";"rojo_i";"amarillo_ii";"verde_ii"
"Sgo. del Estero";"Hectáreas";"7718990";"982299";"6158124";"578567"
"Chaco";"Hectáreas";"4617924";"441952";"3049948";"1126024"
"Córdoba";"Hectáreas";"2923985";"2393791";"530194";"0"
```

(La cuarta columna se llama `verde_ii` por errata del origen; corresponde a Categoría III. El CSV además repite el bloque completo de filas dos veces.)

| Provincia | Categoría | Σ campo de área en el dato | Cifra oficial | Diferencia |
|---|---|---|---|---|
| **Córdoba** | I | 2.391.796,2 | 2.393.791 | −1.994,8 (−0,08 %) |
| | II | 528.499,8 | 530.194 | −1.694,2 (−0,32 %) |
| | III | 0 | **0** | 0 |
| | **Total** | 2.920.296,0 | 2.923.985 | −3.689,0 (−0,13 %) |
| **Santiago del Estero** | I | 982.765,3 | 982.299 | +466,3 (+0,05 %) |
| | II | 6.285.743,8 | 6.158.124 | **+127.619,8 (+2,07 %)** |
| | III | 453.583,9 | 578.567 | **−124.983,1 (−21,6 %)** |
| | **Total** | 7.722.093,1 | 7.718.990 | +3.103,1 (+0,04 %) |
| **Chaco** | I | 296.662,1 | 441.952 | **−145.289,9 (−32,9 %)** |
| | II | 3.107.980,4 | 3.049.948 | +58.032,4 (+1,9 %) |
| | III | 1.530.991,4 | 1.126.024 | **+404.967,4 (+36,0 %)** |
| | **Total** | 4.935.633,9 | 4.617.924 | **+317.709,9 (+6,9 %)** |

**Lectura para el informe de due diligence:**
- Córdoba cierra con el oficial dentro del 0,4 % por categoría. El dato es consistente.
- SdE cierra en el total (0,04 %) pero **no por categoría**: hay ~125.000 ha que el dato clasifica como II y el registro oficial cuenta como III. Los desvíos son casi exactamente compensatorios, lo que sugiere una recategorización II↔III entre el shapefile publicado y la planilla oficial.
- **Chaco no cierra por ningún lado.** Un tercio de la Categoría I oficial no está en la capa publicada, y hay 400.000 ha de más en Categoría III. Ninguna superficie de Chaco derivada de esta capa debe presentarse como cifra oficial.
- Advertencia metodológica: estas sumas son del **campo de atributo**, no del área calculada sobre la geometría. No son intercambiables.

---

## 4. Mapeo hacia un esquema único

### 4.1 Equivalencias campo por campo

Esquema canónico propuesto a la izquierda; a la derecha, de dónde sale en cada origen. Se listan por separado el origen WFS y el origen shapefile porque **difieren**.

| Campo canónico | Tipo canónico | Córdoba WFS | Chaco WFS | SdE WFS | Córdoba DBF | Chaco DBF | SdE DBF |
|---|---|---|---|---|---|---|---|
| `geom` | MultiPolygon, EPSG:4326 | `the_geom` (`gml:MultiSurfacePropertyType`) | `the_geom` (idem) | `the_geom` (idem) | geometría `.shp` | geometría `.shp` | geometría `.shp` |
| `categoria` | enum `I` \| `II` \| `III` | `cat_cons` (`xsd:string`) | `cat_cons` (`xsd:string`) | `cat_cons` (`xsd:string`) | `Cat_cons` (C,10) | `CAT_CONS` (C,10) | `Cat_cons` (C,254) |
| `clase_bosque` | enum `bosque_nativo` \| `bosque_a_restaurar` | `clase` (`xsd:string`) | `clase` (`xsd:string`) | `clase` (`xsd:string`) | `Clase` (C,100) | `CLASE` (C,100) | `Clase` (C,254) |
| `area_ha_origen` | numeric | **`areaha`** (`xsd:double`) | `area_ha` (`xsd:double`) | `area_ha` (**`xsd:decimal`**) | **`AreaHa`** (N 19,10) | `AREA_HA` (N 10,2) | `Area_ha` (N 21,5) |
| `id_origen` | bigint | `id` (`xsd:long`) | `id` (`xsd:long`) | `id` (`xsd:long`) | `ID` (N 16,0) | `ID` (N 10,0) | `ID` (N 10,0) |
| `provincia` | enum `CBA` \| `CHA` \| `SDE` | *derivado de la capa* | *derivado de la capa* | *derivado de la capa* | *derivado del archivo* | *derivado del archivo* | *derivado del archivo* |
| `vintage` | año | `2010` | `2009` | `2015` | `2010` | `2009` | `2015` |
| `norma` | texto | `Ley provincial 9.814 (2010)` | `Ley provincial 6.409 / 1762-R (2009)` | `Ley provincial 6.942 + Decreto 3.133/2015` | idem | idem | idem |

**Regla de normalización de nombres, en una línea:** minúsculizar el nombre del campo y, si el resultado es `areaha`, reescribirlo como `area_ha`. Cubre los seis casings observados. No asumir que basta con minúsculizar: Córdoba rompe esa regla.

**Precisión del campo de área:** Chaco tiene solo 2 decimales (`N 10,2`), SdE 5 (`N 21,5`) y Córdoba 10 (`N 19,10`). El esquema único debe elegir una precisión de destino y documentar el redondeo; no hay una precisión común nativa.

### 4.2 Equivalencias valor por valor

**Campo `categoria`:**

| Valor canónico | Alias color | Literal en Córdoba | Literal en Chaco | Literal en SdE | Presente en Córdoba |
|---|---|---|---|---|---|
| `categoria_i` | `rojo` | `I` | `I` | `I` | Sí (2.702) |
| `categoria_ii` | `amarillo` | `II` | `II` | `II` | Sí (924) |
| `categoria_iii` | `verde` | `III` | `III` | `III` | **No. Cero features.** |

Los literales son idénticos en las tres provincias: numerales romanos en mayúscula, sin espacios, sin prefijo. No hay `1`/`2`/`3`, ni `Cat I`, ni `Rojo`.

**Campo `clase_bosque`:**

| Valor canónico | Literal en Córdoba | Literal en Chaco | Literal en SdE |
|---|---|---|---|
| `bosque_nativo` | `Bosque Nativo` | `Bosque Nativo` | `Bosque Nativo` |
| `bosque_a_restaurar` | *(no existe)* | *(no existe)* | `Bosque a restaurar` |

Casing literal exacto: `Bosque Nativo` con ambas iniciales en mayúscula; `Bosque a restaurar` con solo la primera en mayúscula. La comparación debe ser exacta o normalizada, nunca "capitalize each word".

### 4.3 Decisión de modelado que el mapeo obliga a tomar

El dominio de `categoria` es **`I` | `II` | `III` a nivel nacional**, pero el dominio **observado en Córdoba es `I` | `II`**. Son dos cosas distintas y el código no debe confundirlas:

- Un tipo `Categoria = 'I' | 'II' | 'III'` es correcto como tipo de dominio.
- Una UI o un informe que muestre "Categoría III: 0 ha" para Córdoba está diciendo la verdad.
- Una UI que muestre las tres categorías como leyenda de un mapa de Córdoba está mostrando una categoría que la provincia no usó.
- Cualquier lógica del estilo "si no es I ni II, entonces es III" produce una respuesta legalmente incorrecta. En Córdoba, "ni I ni II" significa **fuera del OTBN**, no "Categoría III". Ver sección 6.

---

## 5. Qué implica jurídicamente cada categoría — Art. 9 Ley 26.331

**Ley 26.331, "Presupuestos Mínimos de Protección Ambiental de los Bosques Nativos".** Sancionada: Noviembre 28 de 2007. Promulgada de Hecho: Diciembre 19 de 2007.

### Texto literal del Artículo 9

> **ARTICULO 9º** — Las categorías de conservación de los bosques nativos son las siguientes:
>
> — **Categoría I (rojo):** sectores de muy alto valor de conservación que no deben transformarse. Incluirá áreas que por sus ubicaciones relativas a reservas, su valor de conectividad, la presencia de valores biológicos sobresalientes y/o la protección de cuencas que ejercen, ameritan su persistencia como bosque a perpetuidad, aunque estos sectores puedan ser hábitat de comunidades indígenas y ser objeto de investigación científica.
>
> — **Categoría II (amarillo):** sectores de mediano valor de conservación, que pueden estar degradados pero que a juicio de la autoridad de aplicación jurisdiccional con la implementación de actividades de restauración pueden tener un valor alto de conservación y que podrán ser sometidos a los siguientes usos: aprovechamiento sostenible, turismo, recolección e investigación científica.
>
> — **Categoría III (verde):** sectores de bajo valor de conservación que pueden transformarse parcialmente o en su totalidad aunque dentro de los criterios de la presente ley.

### Artículos operativos que convierten la categoría en una consecuencia concreta

> **ARTICULO 13.** — Todo desmonte o manejo sostenible de bosques nativos requerirá autorización por parte de la Autoridad de Aplicación de la jurisdicción correspondiente.

> **ARTICULO 14.** — No podrán autorizarse desmontes de bosques nativos clasificados en las Categorías I (rojo) y II (amarillo).

> **ARTICULO 15.** — Se prohíbe la quema a cielo abierto de los residuos derivados de desmontes o aprovechamientos sostenibles de bosques nativos.

> **ARTICULO 16.** — Las personas físicas o jurídicas, públicas o privadas, que soliciten autorización para realizar manejo sostenible de bosques nativos clasificados en las categorías II y III, deberán sujetar su actividad a un Plan de Manejo Sostenible de Bosques Nativos que debe cumplir las condiciones mínimas de persistencia, producción sostenida y mantenimiento de los servicios ambientales que dichos bosques nativos prestan a la sociedad.

> **ARTICULO 17.** — Las personas físicas o jurídicas, públicas o privadas, que soliciten autorización para realizar desmontes de bosques nativos de la categoría III, deberán sujetar su actividad a un Plan de Aprovechamiento del Cambio de Uso del Suelo, el cual deberá contemplar condiciones mínimas de producción sostenida a corto, mediano y largo plazo y el uso de tecnologías disponibles que permitan el rendimiento eficiente de la actividad que se proponga desarrollar.

> **ARTICULO 40.** — En los casos de bosques nativos que hayan sido afectados por incendios o por otros eventos naturales o antrópicos que los hubieren degradado, corresponde a la autoridad de aplicación de la jurisdicción respectiva la realización de tareas para su recuperación y restauración, manteniendo la categoría de clasificación que se hubiere definido en el ordenamiento territorial.

> **ARTICULO 41.** — Las Autoridades de Aplicación de cada jurisdicción determinarán el plazo en que los aprovechamientos de bosques nativos o desmontes preexistentes en las áreas categorizadas I y II adecuarán sus actividades a lo establecido en la presente ley.

### Tabla operativa para el motor de veredicto

| Categoría | Desmonte / cambio de uso del suelo | Manejo sostenible | Instrumento exigido | Base |
|---|---|---|---|---|
| **I (rojo)** | **Prohibido.** No puede autorizarse. | El Art. 9 admite hábitat de comunidades indígenas e investigación científica; el Art. 16 **no** incluye la Categoría I entre las que pueden pedir Plan de Manejo Sostenible | — | Arts. 9, 14, 16 |
| **II (amarillo)** | **Prohibido.** No puede autorizarse. | Permitido: aprovechamiento sostenible, turismo, recolección e investigación científica | Plan de Manejo Sostenible de Bosques Nativos | Arts. 9, 14, 16 |
| **III (verde)** | **Posible, con autorización.** Puede transformarse parcial o totalmente, dentro de los criterios de la ley | Permitido | Desmonte: Plan de Aprovechamiento del Cambio de Uso del Suelo. Manejo: Plan de Manejo Sostenible | Arts. 9, 13, 16, 17 |

**Tres precisiones que el motor de veredicto no debe perder:**

1. Categoría III **no es "libre"**. Requiere autorización (Art. 13) y un Plan de Aprovechamiento del Cambio de Uso del Suelo (Art. 17), además de EIA y audiencia o consulta pública (Arts. 22 a 26). El veredicto correcto es "sujeto a autorización", no "permitido".
2. La categoría **sobrevive a la degradación** (Art. 40). Un lote quemado o degradado no baja de categoría. Esto es exactamente lo que codifica el campo `clase='Bosque a restaurar'` de Santiago del Estero.
3. La prohibición del Art. 14 es **de presupuesto mínimo**: las provincias pueden ser más restrictivas, nunca menos. El veredicto provincial puede ser más duro que el nacional, jamás más laxo.

---

## 6. Estado normativo por provincia

### Córdoba — Ley 9.814 (2010). Vigente.

- **Ley provincial 9.814**, "Ordenamiento Territorial de Bosques Nativos de la Provincia de Córdoba". Sancionada **05-08-2010**, publicada en Boletín Oficial **10-08-2010**. El portal de normativa nacional la califica textualmente como **"vigente, de alcance general"**.
- El PDF de metadata ISO dentro del `.rar` lo confirma de forma independiente: *"El OTBN fue aprobado por Ley provincial 9.814 el 5 de agosto de 2010. El mapa de OTBN fue presentado por la Secretaría de Ambiente de la provincia como Autoridad Local de Aplicación (ALA) ante la Autoridad Nacional de Aplicación (ANA) en abril de 2013, en el marco de la acreditación del OTBN (Expediente 0056449/2010)."*
- **La Ley 9.814 sí define las tres categorías** en su Art. 5 (I rojo, II amarillo, III verde) y su Art. 9 aprueba el mapa del Anexo I con las tres calificaciones posibles. **Es el mapa el que no asigna ninguna superficie a Categoría III**, no la ley. La distinción importa: no es que Córdoba haya derogado la Categoría III; es que su zonificación 2010 no usó ninguna.
- **Actualizaciones:** el Art. 6 de la Ley 26.331 obliga a actualizar periódicamente, y la Ley 9.814 prevé actualización quinquenal. Córdoba **no ha aprobado ninguna actualización**. Hubo una mesa de diálogo convocada desde agosto de 2016 y un proyecto de ley en 2017 que no prosperó; en 2025 la Dirección General de Ordenamiento Territorial del Ministerio de Ambiente y Economía Circular reconvocó una mesa de diálogo para fortalecer la implementación de la Ley 9.814. **A 2026-09-12 la norma vigente sigue siendo la 9.814 de 2010 y el OTBN publicado sigue siendo el de 2010.**
- Decreto reglamentario 170/2011: mencionado en fuentes secundarias. **NO CONFIRMADO** contra Boletín Oficial de Córdoba — el sitio `www.cba.gov.ar` responde HTTP 403 a solicitudes automatizadas, y el portal nacional de normativa provincial no lista modificatorias ni reglamentación para esta ley.

### Chaco — Ley 6.409 / 1762-R (2009) es el dato. Ley 4005-R (2024) es la norma. No coinciden.

- **Ley provincial 6.409**, "Aprueba el Ordenamiento Territorial de los Bosques Nativos de la Provincia del Chaco". SAIJ la fecha en **2009-09-23**; el PDF de metadata de la Dirección Nacional de Bosques dice *"aprobado por Ley provincial 6.409 el 24 de septiembre de 2009"*. Discrepancia de un día entre sanción y promulgación/publicación: no resuelta, se citan ambas. En el digesto chaqueño la norma se renumeró como **Ley 1762-R**.
- Modificada por **Ley 7.238 (2013)**, que cambió el Art. 2° respecto de la conformación de la Categoría I (rojo), y por **Decreto 298/19**, que derogó las disposiciones que permitían recategorizaciones prediales.
- **Ley 4005-R (2024)**: actualización del OTBN, aprobada por la Cámara de Diputados del Chaco el **30 de abril de 2024** y publicada en el Boletín Oficial el **10 de mayo de 2024**. Fue modificada por una ley posterior del mismo año (ver hueco abajo) que elevó del 80 % al 100 % la proporción de bosque nativo a conservar en el área amarilla.
- **Impugnación y estado judicial a hoy (2026-09-12):**
  - El **29 de julio de 2024** la Asociación Civil Conciencia Solidaria al Cuidado del Medioambiente, el Equilibrio Ecológico y los Derechos Humanos promovió acción de inconstitucionalidad, alegando vicios en el procedimiento de actualización y en el trámite legislativo, y regresión ambiental por reducción de superficie en Categoría II y habilitación de desmonte sobre más de 230.000 ha.
  - Por **Sentencia 19/26 del 11 de febrero de 2026**, el Superior Tribunal de Justicia del Chaco **rechazó la acción por 4 votos contra 1** (mayoría: Enrique Varela, Víctor del Río, Emilia Valle, Alberto Mario Modi; disidencia: Iride Isabel María Grillo) y **mantuvo vigente** la Ley 4005-R y su modificatoria. Impuso al Estado provincial condiciones: implementar mecanismos documentados de participación ciudadana, acreditar afectación directa a territorios indígenas para activar consulta previa, intensificar control y fiscalización de desmontes ilegales, y adoptar medidas de recomposición y restauración ambiental.
  - **En junio de 2026 la Sala IV de la Cámara Federal de Casación Penal anuló por unanimidad** una decisión previa que había flexibilizado la suspensión de desmontes, **restableciendo plenamente la medida cautelar de 2024 que prohíbe otorgar nuevos permisos de cambio de uso de suelo** en Chaco. El tribunal sostuvo que la sanción de nuevas normas provinciales no basta por sí sola para levantar la cautelar sin demostrar que no reducen protecciones previas.
- **Consecuencia operativa:** a 2026-09-12 Chaco tiene simultáneamente (a) una capa pública con vintage **2009**, (b) una rezonificación **2024** constitucionalmente ratificada pero **sin publicación como dato geoespacial descargable**, y (c) una **cautelar federal vigente que frena nuevos permisos de desmonte**. Mapa Legal CREA declara explícitamente que su propio mapa aún no refleja la actualización 2024 por falta de formato apropiado — es decir, el problema de disponibilidad del dato no es específico de este proyecto.
- El portal del Ministerio de la Producción del Chaco sobre el proceso de actualización (`https://produccion.chaco.gov.ar/ordenamiento-de-bosques-nativos-proceso-de-actualizacion/`) responde **HTTP 503** al 2026-09-12; no pudo verificarse si ofrece descarga del SIG.

### Santiago del Estero — Ley 6.942 + Decreto 3.133/2015. Vigente.

- **Ley provincial 6.942**, "Ordenamiento Territorial de Bosques Nativos de la Provincia de Santiago del Estero". SAIJ la registra con fecha **2009-03-17**.
- **Actualizada por Decreto Provincial 3.133 del 23-12-2015**, que es el instrumento que produce la zonificación que la capa `SE_2015_OTBN` representa. El PDF de metadata dentro del `.rar` lo afirma textualmente: *"aprobado por Ley provincial 6.942 y actualizado por Decreto Prov. 3.133 el 23 de diciembre de 2015"*, y el Abstract de la capa en GetCapabilities repite la misma fórmula.
- **Segunda Actualización del OTBN: en curso, NO adoptada.** El **10 de octubre de 2024** el Ministerio de Producción provincial y la Universidad Nacional de Santiago del Estero firmaron un convenio de cooperación y asistencia técnica para llevarla adelante, financiado con fondos del Programa de Bosques Nativos en el marco del Art. 6 de la Ley 26.331. Hubo reuniones de avance en **febrero de 2026**. **A 2026-09-12 no hay norma que apruebe la segunda actualización y la zonificación vigente sigue siendo la de 2015.**

---

## 7. Trampas operativas

### 7.1 Orden de ejes — CRÍTICA, y peor de lo esperado

Las tres capas declaran `<DefaultCRS>urn:ogc:def:crs:EPSG::4326</DefaultCRS>`, la forma *authority* de EPSG:4326, cuyo orden de ejes canónico es **latitud, longitud**. El servidor **no** se comporta igual en todos los parámetros. Medido hoy contra `bosques:CD_2010_OTBN` sobre el mismo rectángulo:

| Mecanismo | Sintaxis probada | Resultado |
|---|---|---|
| WFS 2.0.0, `bbox=` con `urn:ogc:def:crs:EPSG::4326` | `bbox=-31.5,-65.0,-31.0,-64.5,urn:ogc:def:crs:EPSG::4326` (**lat,lon**) | **69 features** ✅ |
| WFS 2.0.0, `bbox=` con `urn:ogc:def:crs:EPSG::4326` | `bbox=-65.0,-31.5,-64.5,-31.0,urn:ogc:def:crs:EPSG::4326` (lon,lat) | **0 features**, HTTP 200, sin error ❌ |
| WFS 1.1.0, `bbox=` con `EPSG:4326` | `bbox=-65.0,-31.5,-64.5,-31.0,EPSG:4326` (**lon,lat**) | **69 features** ✅ |
| `CQL_FILTER=BBOX(...)` | `BBOX(the_geom,-31.5,-65.0,-31.0,-64.5)` (**lat,lon**) | **69 features** ✅ |
| `CQL_FILTER=BBOX(...)` | `BBOX(the_geom,-65.0,-31.5,-64.5,-31.0)` (lon,lat) | **0 features**, HTTP 200, sin error ❌ |
| `CQL_FILTER=INTERSECTS(the_geom, POINT(...))` | `POINT(-30.79 -65.0)` (**lat lon**) | devuelve `CD_2010_OTBN.2612` ✅ |
| `CQL_FILTER=INTERSECTS(the_geom, POINT(...))` | `POINT(-65.0 -30.79)` (lon lat) | **0 filas**, HTTP 200, sin error ❌ |

Verificado también en Chaco (`POINT(-24.4539 -62.1856)` devuelve `CH_2009_OTBN.42340`; el orden invertido devuelve 0) y en Santiago del Estero (`BBOX(the_geom,-26.4,-62.4,-26.2,-62.1)` devuelve 312; el orden invertido devuelve 0).

**Reglas, entonces:**
1. **El parámetro `bbox=` en WFS 1.1.0 con sufijo `EPSG:4326` usa lon,lat.** Es la forma más limpia y la que menos sorprende.
2. **El literal geométrico de CQL (`BBOX`, `INTERSECTS`, `POLYGON`, `POINT`) usa lat,lon en este servidor, en cualquier versión de WFS.** Esto es lo contrario de lo que asume cualquier código que trabaje en GeoJSON.
3. El modo de falla es siempre el mismo: **0 features, HTTP 200, sin excepción, sin advertencia**. Un lote sobre bosque nativo Categoría I se reporta como "sin coincidencias". Es la falla más peligrosa de todo el pipeline y exige un test de regresión con coordenadas conocidas por provincia.
4. La salida **GeoJSON de `geo.ambiente.gob.ar` sí es correcta**: emite `[lon, lat]`. Verificado: el primer vértice de `CD_2010_OTBN.1` es `[-65.00881621, -34.99658839]`, coherente con la extensión de Córdoba, y declara `crs: {"type":"name","properties":{"name":"urn:ogc:def:crs:EPSG::4326"}}`. La inversión de coordenadas en GeoJSON es un defecto de **`geo2.ambiente.gob.ar`** (capa `ordenamiento:OTBN_SIG250nov2017`), no de este servidor.

### 7.2 Tope duro de 28.000 features por request — CRÍTICA

GetCapabilities declara literalmente:

```xml
<ows:Constraint name="CountDefault"><ows:NoValues/><ows:DefaultValue>28000</ows:DefaultValue></ows:Constraint>
```

y el tope **se aplica aunque se pida más explícitamente**. Medido: un `GetFeature` a `CH_2009_OTBN` con `count=50000` devolvió **28.000 filas**, HTTP 200, sin advertencia. Chaco tiene 42.398 features: **una sola request deja afuera 14.398 polígonos (34 % de la provincia) en silencio.**

- Córdoba (3.626) y Santiago del Estero (23.347) caben en una request. **Chaco no.**
- La descarga completa de Chaco exige paginar: `count=28000&startIndex=0` + `count=28000&startIndex=28000`. Verificado: 28.000 + 14.398 = 42.398 FIDs únicos, 0 duplicados, 0 faltantes.
- Cualquier ETL debe **comparar el conteo obtenido contra `resultType=hits`** y fallar ruidosamente si no coinciden. No hay ninguna señal en la respuesta que indique truncamiento.

### 7.3 Paginación e `startIndex`

`startIndex` sin `sortBy` no tiene garantía de estabilidad: sin `ORDER BY`, PostgreSQL no promete un orden de filas consistente entre consultas, y páginas sucesivas pueden solaparse o dejar huecos. Una sesión previa midió en Chaco 4.710 features duplicados y 4.710 nunca traídos (11 % de la provincia ausente, HTTP 200 en ambas requests).

**Hoy no pude reproducir esa falla.** Dos intentos contra `CH_2009_OTBN` sin `sortBy` (páginas de 10.000 y páginas de 28.000) dieron cobertura perfecta: 0 duplicados, 0 faltantes. **Esto no invalida la advertencia, la agrava:** el bug es intermitente y depende del plan de ejecución del servidor, así que puede no aparecer en desarrollo y aparecer en producción.

**Regla:** pasar siempre `sortBy=id` en toda request paginada, y validar el conteo final contra `resultType=hits`. Verificado que `sortBy=id` funciona y produce paginación estable.

### 7.4 Córdoba no tiene Categoría III

Cero features, cero hectáreas, y el `.sld` oficial de Córdoba ni siquiera define una regla de estilo para Categoría III. La cifra oficial del validador nacional lo confirma de forma independiente: `"Córdoba";"Hectáreas";"2923985";"2393791";"530194";"0"`.

Consecuencias:
- Un `switch` sobre la categoría que trate el caso por defecto como III miente.
- La leyenda de un mapa de Córdoba con tres categorías muestra una que no existe en el territorio.
- Para un lote en Córdoba, "no intersecta ninguna categoría" significa **fuera del OTBN**, no "Categoría III / verde / puede desmontarse". Confundir ambas cosas produce exactamente el consejo opuesto al correcto.
- Santa Fe y Santa Cruz están en la misma situación en el validador nacional (`"Santa Fe";...;"0"` y `"Santa Cruz";...;"0"`), así que el caso no es una anomalía de Córdoba sino un patrón que se repetirá al sumar provincias.

### 7.5 "Fuera de la capa" no es un veredicto

Las tres capas cubren solo la superficie **categorizada como bosque nativo**, no el territorio provincial completo. Un lote que no intersecta ningún polígono puede ser: (a) tierra sin bosque nativo, (b) bosque nativo no relevado por la escala 1:250.000, (c) territorio fuera de las tres provincias cubiertas. El sistema debe distinguir "verificamos y no cae en OTBN" de "no tenemos capa para esa jurisdicción".

### 7.6 La escala 1:250.000 no tiene precisión de lote

Los tres PDF de metadata declaran literalmente `Escala: 250000.`. A 1:250.000, un error de trazo de 0,5 mm en el mapa original equivale a **125 metros en el terreno**. Ningún resultado derivado de estas capas tiene resolución suficiente para dirimir el límite de un lote, y el informe de due diligence debe declararlo explícitamente. Además, los tres PDF advierten sobre el postprocesamiento aplicado por la Dirección Nacional de Bosques:

> *"En base a las coberturas vectoriales entregadas, la Dirección Nacional de Bosques ha realizado un post procesamiento obteniendo un archivo vectorial del OTBN para la provincia. […] **Por lo cual, dicho producto no refleja estrictamente el OTBN aprobado por la ALA.** El post procesamiento consistió en ajustar la cobertura vectorial, identificando errores topológicos (superposición, duplicados, geometrías multipartes y no válidas y saltos). El post procesamiento se realizó con programas gratuitos y de código abierto QGIS 2.4 a 2.12 y SAGA 2.1.2 de 32 bit."*

Esa frase — *"no refleja estrictamente el OTBN aprobado por la ALA"* — es del propio organismo que publica el dato y debería aparecer textual en el informe al productor.

### 7.7 Otras trampas menores confirmadas

- **Nombres de campo distintos entre WFS y shapefile.** El WFS sirve minúsculas; el DBF conserva `Cat_cons` / `CAT_CONS` / `AreaHa`. Un pipeline que cambie de fuente WFS a descarga de archivo se rompe.
- **Tamaño descomprimido.** El `.shp` de Santiago del Estero pesa **267 MB** descomprimido (el `.rar` son 128 MB). El DBF de Chaco son 5,6 MB.
- **El listado de directorio está cerrado.** `https://geo.ambiente.gob.ar/documentos/sinia/bosque_OTBN/` devuelve **HTTP 403**. Los `.rar` responden 200 solo por URL directa. Sí aceptan `Accept-Ranges: bytes`, lo que permite bajar los primeros MB y extraer el `.sld`, el `.prj`, el `.cpg`, el `.dbf` y el PDF sin descargar los 128 MB completos (el orden interno del `.rar` pone el PDF tercero).
- **El CSV del validador oficial duplica todas sus filas** y su cuarta columna se llama `verde_ii` cuando corresponde a Categoría III.
- **`Last-Modified` de los `.rar`:** Chaco `Mon, 23 Oct 2023 20:01:00 GMT`; SdE `Thu, 14 Dec 2023 18:26:19 GMT`. El dato publicado no se toca desde 2023.

---

## 8. Huecos — lo NO CONFIRMADO

1. **Número exacto de la ley chaqueña que modifica la Ley 4005-R.** Las fuentes se contradicen: FARN y Mapa Legal CREA dicen **Ley 4152-R**; las crónicas de la Sentencia 19/26 del STJ dicen **Ley 4125-R**. Puede tratarse de dos normas distintas o de una errata propagada. Buscado en: FARN, Mapa Legal CREA, El Diario de la Región (HTTP 403), Resumen Latinoamericano, y búsqueda dirigida por ambos números. **No resuelto.** Requiere consulta al Boletín Oficial del Chaco.
2. **Decreto reglamentario 170/2011 de la Ley 9.814 de Córdoba.** Mencionado por fuentes secundarias; no verificado contra Boletín Oficial de Córdoba (`www.cba.gov.ar` devuelve HTTP 403 a solicitudes automatizadas) ni listado como norma complementaria en el portal nacional de normativa provincial.
3. **Fecha exacta de la Ley 6.409 del Chaco.** SAIJ la fecha **2009-09-23**; la metadata de la Dirección Nacional de Bosques dice **24 de septiembre de 2009**. No determiné cuál corresponde a sanción y cuál a promulgación o publicación.
4. **Dato geoespacial de la rezonificación chaqueña 2024 (Ley 4005-R).** No existe como descarga pública verificable. El visor oficial está filtrado, el anexo del Boletín Oficial es una imagen, la página del Ministerio de la Producción del Chaco responde **HTTP 503** hoy, y Mapa Legal CREA declara que tampoco pudo incorporarlo por falta de formato apropiado. **Confirmado que no está disponible; no confirmado que no exista en algún repositorio provincial no indexado.**
5. **Origen de la discrepancia de superficies en Chaco** (Cat. I −33 %, Cat. III +36 %, total +6,9 % respecto del validador oficial). No pude determinar si la planilla del validador refleja una versión posterior del OTBN chaqueño, una corrección del postprocesamiento, o un error de una de las dos fuentes.
6. **Origen del corrimiento II↔III en Santiago del Estero** (~125.000 ha). Mismo caso: los desvíos son casi compensatorios, lo que sugiere recategorización, pero no lo verifiqué.
7. **Número de causa del fallo de la Cámara Federal de Casación Penal (Sala IV, junio 2026)** que restableció la cautelar sobre desmontes en Chaco. La fuente consultada no lo consigna. Tampoco verifiqué si esa cautelar sigue firme al 2026-09-12 o si fue recurrida ante la CSJN.
8. **Existencia de una Categoría III de derecho en Córdoba.** Confirmado que la Ley 9.814 define las tres categorías en su Art. 5 y que el mapa no asigna superficie a la III. **No confirmado** si alguna resolución posterior recategorizó predios puntualmente.
9. **Reproducibilidad del bug de paginación sin `sortBy`.** Reportado en sesión previa (4.710 duplicados / 4.710 faltantes en Chaco); **no reproducido hoy** en dos intentos con distintos tamaños de página. Se trata como riesgo intermitente, no como comportamiento determinístico.
10. **Precisión real de la geometría.** Todas las escalas provienen del campo `Escala: 250000.` del PDF de metadata. No verifiqué la escala de captura original que cada provincia usó antes del postprocesamiento nacional, que podría ser distinta y peor.

---

## 9. Fuentes

Todas consultadas el **2026-09-12**. Se indica el estado HTTP verificado con `curl` en esa fecha.

### Datos y servicios

1. Descarga Córdoba — `https://geo.ambiente.gob.ar/documentos/sinia/bosque_OTBN/CD_2010_OTBN.rar` — HTTP 200, `application/rar`, 2.256.969 bytes.
2. Descarga Chaco — `https://geo.ambiente.gob.ar/documentos/sinia/bosque_OTBN/CH_2009_OTBN.rar` — HTTP 200, `application/rar`, 54.732.723 bytes, `Last-Modified: Mon, 23 Oct 2023 20:01:00 GMT`.
3. Descarga Santiago del Estero — `https://geo.ambiente.gob.ar/documentos/sinia/bosque_OTBN/SE_2015_OTBN.rar` — HTTP 200, `application/rar`, 128.856.337 bytes, `Last-Modified: Thu, 14 Dec 2023 18:26:19 GMT`.
4. OTBN nacional — `https://geo.ambiente.gob.ar/documentos/sinia/bosque_OTBN/OTBN_Nacional_2023.rar` — **HTTP 404**.
5. Listado del directorio — `https://geo.ambiente.gob.ar/documentos/sinia/bosque_OTBN/` — **HTTP 403**.
6. Endpoint WFS — `https://geo.ambiente.gob.ar/geoserver/wfs` — GetCapabilities 2.0.0 HTTP 200, 52.430 bytes.
7. `DescribeFeatureType` Córdoba — `https://geo.ambiente.gob.ar/geoserver/wfs?service=WFS&version=2.0.0&request=DescribeFeatureType&typeNames=bosques:CD_2010_OTBN` — HTTP 200, `application/gml+xml; version=3.2`, 1.319 bytes.
8. `DescribeFeatureType` Chaco — misma URL con `typeNames=bosques:CH_2009_OTBN` — HTTP 200, 1.320 bytes.
9. `DescribeFeatureType` Santiago del Estero — misma URL con `typeNames=bosques:SE_2015_OTBN` — HTTP 200, 1.321 bytes.
10. Validador oficial de superficies — `https://ciam.ambiente.gob.ar/dt_csv.php?dt_id=388` — HTTP 200, `text/csv;charset=UTF-8`, 2.904 bytes.
11. Metadata ISO Córdoba — `CD_OTBN_25042023.pdf`, dentro de `CD_2010_OTBN.rar`. Fecha de creación del metadato: 25/04/23.
12. Metadata ISO Chaco — `CH_OTBN_25042023.pdf`, dentro de `CH_2009_OTBN.rar`. Fecha de creación del metadato: 25/08/23.
13. Metadata ISO Santiago del Estero — `SE_OTBN_25042023.pdf`, dentro de `SE_2015_OTBN.rar`. Fecha de creación del metadato: 25/04/23.

### Normativa

14. Ley 26.331 (texto completo, InfoLEG) — `https://servicios.infoleg.gob.ar/infolegInternet/anexos/135000-139999/136125/norma.htm` — HTTP 200, `text/html`. Fuente de las transcripciones literales de los Arts. 9, 13, 14, 15, 16, 17, 40 y 41.
15. Ley 9.814 de Córdoba, resumen oficial — `https://www.argentina.gob.ar/normativa/provincial/ley-9814-123456789-0abc-defg-418-9000ovorpyel` — HTTP 200. Sanción 05-08-2010, B.O. 10-08-2010, estado "vigente, de alcance general".
16. Ley 9.814 de Córdoba, texto actualizado — `https://www.argentina.gob.ar/normativa/provincial/ley-9814-123456789-0abc-defg-418-9000ovorpyel/actualizacion` — HTTP 200, 96.278 bytes. Fuente de los Arts. 5 y 9 provinciales.
17. Ley 6.409 del Chaco, SAIJ — `https://www.saij.gob.ar/6409-local-chaco-aprueba-ordenamiento-territorial-bosque-nativos-provincia-chaco-lph0006409-2009-09-23/123456789-0abc-defg-904-6000hvorpyel` — HTTP 200, 66.105 bytes.
18. Ley 6.409 del Chaco, portal nacional — `https://www.argentina.gob.ar/normativa/provincial/ley-6409-123456789-0abc-defg-904-6000hvorpyel` — HTTP 200, 33.215 bytes.
19. Ley 6.942 de Santiago del Estero, SAIJ — `https://www.saij.gob.ar/6942-local-santiago-estero-ordenamiento-territorial-bosques-nativos-provincia-santiago-estero-lpg0006942-2009-03-17/123456789-0abc-defg-249-6000gvorpyel` — HTTP 200. Fecha registrada: 2009-03-17.
20. Mapa Legal CREA, OTBN Chaco — `https://mapalegal.crea.org.ar/otbn/chaco` — HTTP 200. Fuente de la cadena normativa Ley 6.409 / 1762-R → Ley 7.238 (2013) → Decreto 298/19 → Ley 4005-R (2024) → Ley 4152-R (2024), y de la declaración de que el mapa CREA no refleja la actualización 2024.
21. Mapa Legal CREA, OTBN Córdoba — `https://mapalegal.crea.org.ar/otbn/cordoba` — HTTP 200.
22. FARN, amicus curiae en la causa de inconstitucionalidad de la Ley 4005-R — `https://farn.org.ar/inconstitucionalidad-bosques-chaco/` — HTTP 200 vía GET (HEAD devuelve 403). Publicado 04-09-2025. Fuente de la fecha de la acción (29-07-2024) y del actor procesal.
23. Resumen Latinoamericano, Sentencia 19/26 del STJ del Chaco — `https://www.resumenlatinoamericano.org/2026/02/11/argentina-por-4-votos-a-1-el-stj-ratifico-la-ley-de-bosques-y-puso-condiciones-al-estado-chaqueno` — publicado 11-02-2026. Fuente del número de sentencia, votos, jueces y condiciones impuestas.
24. Radio Clan FM, fallo de la Sala IV de la Cámara Federal de Casación Penal — `https://radioclanfm.com/politica/2026/06/14/la-justicia-ratifico-la-proteccion-de-los-bosques-nativos-del-chaco-y-freno-nuevos-desmontes/` — publicado 14-06-2026.
25. Gobierno de Santiago del Estero, convenio Ministerio de Producción – UNSE para la Segunda Actualización del OTBN — `https://sde.gob.ar/2024/10/10/el-ministerio-de-produccion-y-la-unse-firmaron-un-convenio/` — HTTP 200, 109.062 bytes. Publicado 10-10-2024.
26. Ministerio de la Producción del Chaco, proceso de actualización del OTBN — `https://produccion.chaco.gov.ar/ordenamiento-de-bosques-nativos-proceso-de-actualizacion/` — **HTTP 503 al 2026-09-12**, no verificable.
27. Boletín Oficial de Córdoba vía `www.cba.gov.ar` — **HTTP 403 a solicitudes automatizadas**, no utilizable como fuente verificable.
