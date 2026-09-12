# Estructura de geolocalización de la Declaración de Diligencia Debida (DDS) — EUDR

**Fecha de investigación:** 2026-09-12
**Alcance:** formato exacto del insumo geolocalizado que "Lote Limpio" debe producir para que un operador europeo pueda presentar su DDS en el sistema de información de la Comisión.

**Nota metodológica.** Todas las citas normativas provienen del texto consolidado de EUR-Lex obtenido vía CELLAR (`publications.europa.eu/resource/celex/02023R1115-20251226`), versión consolidada **02023R1115 — EN — 26.12.2025 — 002.001**. Los esquemas de datos se transcriben desde el **XSD en vivo** publicado por el propio sistema de información, no desde documentación de terceros.

---

## 1. Fechas vigentes de aplicación (confirmadas)

El Reglamento (UE) 2023/1115 fue modificado dos veces en cuanto a fechas:

| Marca en el texto consolidado | Reglamento modificatorio | DOUE |
|---|---|---|
| ►M1 | **Reglamento (UE) 2024/3234** del Parlamento Europeo y del Consejo, de 19 de diciembre de 2024 | L 3234, 23.12.2024, p. 1 |
| ►M2 | **Reglamento (UE) 2025/2650** del Parlamento Europeo y del Consejo, de 19 de diciembre de 2025 | L 2650, 23.12.2025, p. 1 |

Texto vigente del **Artículo 38** («Entry into force and date of application»), transcripción literal:

> **2.** Subject to paragraph 3 of this Article, Articles 3 to 13, Articles 16 to 24 and Articles 26, 31 and 32 shall apply **from 30 December 2026**.
>
> **3.** Except as regards the products covered by the Annex to Regulation (EU) No 995/2010, for operators, whether natural persons or micro- or small undertakings within the meaning of Article 3(1) or Article 3(2), first subparagraph, respectively, of Directive 2013/34/EU, irrespective of their legal form, who were established as such by 31 December 2024, the Articles referred to in paragraph 2 of this Article shall apply **from 30 June 2027**.

**Conclusión operativa al 2026-09-12:**

- **Operadores grandes y medianos: 30 de diciembre de 2026.**
- **Personas físicas y micro/pequeñas empresas establecidas como tales antes del 31/12/2024: 30 de junio de 2027.**
- La fecha de corte de deforestación **no cambió**: sigue siendo **31 de diciembre de 2020** (Art. 2(13)).

La FAQ oficial confirma lo mismo: *"The EUDR will be enforceable from 30 December 2026 (except for most micro and small operators, where the date is 30 June 2027)"* (FAQ v5, abril 2026, §6.x).

**Atención adicional relevante para ganadería (Art. 1(2) + Art. 2(14), vía FAQ 1.25):** el EUDR *no* se aplica a ganado ni productos derivados si el animal nació **antes del 29 de junio de 2023** (entrada en vigor).

---

## 2. Definición de parcela y su identificación

### 2.1. Definición legal — Art. 2(27), literal

> **(27)** ‘plot of land’ means land within a single real-estate property, as recognised by the law of the country of production, which enjoys sufficiently homogeneous conditions to allow an evaluation of the aggregate level of risk of deforestation and forest degradation associated with relevant commodities produced on that land;

### 2.2. Definición de establecimiento (ganadería) — Art. 2(29), literal

> **(29)** ‘establishment’ means any premises, structure, or, in the case of open-air farming, any environment or place, where livestock are kept, on a temporary or permanent basis;

### 2.3. ¿Existe un identificador de parcela? — **NO**

**Hallazgo central: el Reglamento no define ningún identificador de parcela, ni formato, ni autoridad emisora. La parcela se identifica por su geometría.**

Verificado en tres niveles:

1. **Reglamento:** ni el Art. 2, ni el Art. 9(1)(d), ni el Anexo II mencionan un "plot ID", código catastral obligatorio ni número de registro de parcela.
2. **XSD en vivo de la DDS (V3):** el tipo `DdsProducerType` contiene exactamente cuatro elementos — `position`, `country`, `name`, `geometryGeojson`. **No hay campo de identificador de parcela.**
3. **GeoJSON:** las únicas propiedades que el sistema procesa son `ProducerName`, `ProducerCountry`, `ProductionPlace` y `Area`. `ProductionPlace` es un **nombre libre**, explícitamente opcional y no normalizado.

**Los únicos identificadores existentes son:**

| Identificador | Quién lo asigna | Formato | Dónde vive |
|---|---|---|---|
| `internalReferenceNumber` | **El operador**, en su propio sistema. Si no se provee, lo genera el sistema. | `string`, max **50** | Nivel DDS (no parcela) |
| `referenceNumber` (número de referencia DDS) | **El sistema de información** al enviar la DDS | `string`, max **14** | Nivel DDS |
| `verificationNumber` | **El sistema de información** | `string`, min 5 / max **35** | Nivel DDS |
| `position` (ordinal) | El operador | `xs:long`, opcional | Nivel commodity y nivel producer |
| `ProductionPlace` | El operador | texto libre en la propiedad GeoJSON | Nivel geometría |
| `cadastralIdentifier` | El operador | `string` max **80** | **Solo en la Declaración Simplificada (SD)**, no en la DDS |

> **Implicancia para Lote Limpio:** nuestro identificador interno de lote NO viaja a la DDS como tal. La forma soportada de que el productor y el acopio reconcilien un lote es (a) el nombre en `ProductionPlace`, y (b) el orden (`position`) de los `producers` dentro del commodity. Conviene emitir el GeoJSON con `ProductionPlace` = nuestro identificador legible de lote, y documentar el mapeo `position` → lote en el documento de debida diligencia.

### 2.4. Reglas de delimitación (FAQ v5, abril 2026)

- **FAQ 1.14 — Un polígono no puede cubrir varias parcelas** (literal):
  > Polygons are to be used to describe the perimeter of the plots of land where the commodity has been produced. **Each polygon should indicate one single plot of land, whether contiguous or not.** Where relevant products are made of commodities from several plots of land, several polygons must be provided in one due diligence statement. A polygon cannot be used to trace the perimeter of an area of land that might include plots of land only in some of its parts.

- **FAQ 1.15 — Parcela dentro de una propiedad mayor:** una parcela puede ser toda la propiedad (si es suficientemente homogénea) o solo la parte cultivada. En el ejemplo de la Comisión, *"either area B or, if the property is homogeneous, single property A must be provided"*.
  - Si hay deforestación legal posterior al corte en otra área (C) de la misma propiedad y **no** se produce commodity allí, no afecta a B siempre que **solo B esté declarada**.
  - **Pero:** si el estatus legal de la propiedad entera está viciado por ilegalidad (p. ej. deforestación ilegal en C), **la soja de B no es conforme**, porque la legalidad se evalúa sobre el área de producción en el sentido del Art. 2(40).
- **FAQ 1.6 — Tierra sin registro:** la ausencia de catastro o de título **no impide** designar una parcela de facto.
- **FAQ 1.7 — No hay umbral mínimo ni máximo de superficie** para que algo sea "parcela"; el criterio es homogeneidad + precisión del área de producción.
- **FAQ 4.2:** no es necesario listar todas las parcelas de un mismo propietario si algunas no se usan para commodities EUDR.

---

## 3. Sistema de coordenadas y precisión decimal exigida

### 3.1. Precisión decimal — **Art. 2(28)**, transcripción literal

> **(28)** ‘geolocation’ means the geographical location of a plot of land described by means of latitude and longitude coordinates corresponding to at least one latitude and one longitude point and **using at least six decimal digits**; for plots of land of more than four hectares used for the production of the relevant commodities other than cattle, this shall be provided using polygons with sufficient latitude and longitude points to describe the perimeter of each plot of land;

**El número exacto es: al menos SEIS dígitos decimales, en latitud y en longitud. Artículo 2, punto 28, del Reglamento (UE) 2023/1115.**

### 3.2. Comportamiento real del sistema (importante — no es solo "al menos 6")

| Situación | Comportamiento del sistema | Fuente |
|---|---|---|
| Menos de 6 decimales | El sistema **rellena con ceros** hasta 6 | FAQ v5 §7.17 |
| Más de 6 decimales | El sistema **trunca a 6** | Reglas de validación oficiales; GeoJSON File Description |
| Riesgo derivado | Puntos distintos con >6 decimales pueden **colapsar en duplicados** tras el redondeo, invalidando la geometría | GeoJSON File Description, error común nº 7 |

FAQ v5 §7.17, literal:
> According to Art. 2(28) the geolocation coordinates shall be provided by using at least 6 decimal digits both for latitude and longitude coordinates. When the user uploads geolocation files into the Information System, the system automatically validates the number of digits. To ensure a smooth data upload the system provides flexibility by automatically adjusting to six digits, and if the number of the provided digits is less than 6 then fills the remaining digits with zeroes.

Regla de validación oficial, literal:
> **Geolocation invalid coordinates** — Latitude and longitude values of coordinates must be in range. Note that if there are more than 6 decimals for the coordinates, the system truncate the value to 6 decimals.

GeoJSON File Description (versión en vivo, actualizada 17 de agosto de 2026), literal:
> The information system will truncate coordinate points to 6 decimal places before storing. It is superfluous/wasteful to send a higher resolution, and may, in extreme cases, even result in invalid geometries where the original is valid.

> **Implicancia para Lote Limpio:** exportar **exactamente 6 decimales**, redondeando nosotros, y deduplicar vértices *después* del redondeo. No enviar más precisión.

### 3.3. CRS — WGS84 / EPSG:4326, orden longitud-latitud

El Reglamento **no** nombra un CRS. El CRS lo fija el sistema de información. GeoJSON File Description, literal:

> GeoJSON uses the World Geodetic System 1984 (WGS 84) [WGS84] datum, with longitude and latitude units of decimal degrees.
>
> If the geocoordinates available to the Economic Operator are in another coordinates system, these must be **converted to the WGS84 (EPSG:4326)** coordinate system with longitude and latitude units of decimal degrees.
>
> Support of additional coordinate system formats is deferred for future versions of the system.

Orden de ejes, literal:
> A position is represented by an array of numbers. There must be at least two elements and may be more. **The order of elements must follow longitude, latitude** for coordinates in a the EPSG:4326 geographic coordinate reference system.

FAQ v5 §7.8, literal:
> The format of the supported files in the Information System is GeoJson. The Information System supports currently **WGS-84 coordinate format, with EPSG-4326 projection**.

FAQ v5 §7.26 — por qué solo GeoJSON, literal:
> GeoJSON is a general standard and the only non-proprietary system which allows submission of the extra properties needed, and where a very specific coordinate system is enforced. Using multiple formats in the Information System would increase the risk of erroneous or inaccurate information. The exclusive use of GeoJSON was announced in April 2024.

**Estándar base:** IETF RFC 7946.

> **Ojo con Argentina:** los datos catastrales provinciales suelen venir en POSGAR 2007 / Gauss-Krüger (EPSG:5343–5349) o POSGAR 94. Hay que reproyectar a EPSG:4326 antes de exportar. WGS84 y POSGAR 2007 son prácticamente coincidentes a nivel de datum, pero las coordenadas proyectadas Gauss-Krüger **no** lo son.

---

## 4. Punto vs. polígono: umbrales exactos

### 4.1. Regla normativa

La regla vive en la **definición** del Art. 2(28), no en el Art. 9:

> for plots of land of **more than four hectares** used for the production of the relevant commodities **other than cattle**, this shall be provided **using polygons** with sufficient latitude and longitude points to describe the perimeter of each plot of land

El Art. 9(1)(d) es el que **obliga** a aportar esa geolocalización, y separa cultivo de ganadería (transcripción literal):

> **(d)** the geolocation of all plots of land where the relevant commodities that the relevant product contains, or has been made using, were produced, as well as the **date or time range of production**; where a relevant product contains or has been made with relevant commodities produced on different plots of land, the geolocation of all different plots of land shall be included; any deforestation or forest degradation on the given plots of land shall automatically disqualify all relevant commodities and relevant products from those plots of land from being placed or made available on the market or exported; **for relevant products that contain or have been made using cattle, and for such relevant products that have been fed with relevant products, the geolocation shall refer to all the establishments where the cattle were kept; for all other relevant products of Annex I, the geolocation shall refer to the plots of land;**

### 4.2. Cuadro de umbrales

| Caso | Geometría exigida | Umbral exacto | Cita |
|---|---|---|---|
| **Cultivo (soja, maíz, etc.), parcela > 4 ha** | **Polígono obligatorio** | estrictamente **más de 4 hectáreas** | Art. 2(28) |
| **Cultivo, parcela ≤ 4 ha** | **Punto O polígono**, a elección del operador | 4 ha o menos | Art. 2(28) + FAQ 1.1, 1.8 |
| **Ganadería (cattle)** | **Punto único por establecimiento.** Nunca se exige polígono. | **Sin umbral de superficie** | Art. 2(28) («other than cattle») + Art. 9(1)(d) + FAQ 1.8 |

FAQ v5 §1.1, literal:
> For plots of land of more than 4 hectares used for the production of commodities other than cattle, the geolocation must be provided using polygons, meaning latitude and longitude points of six decimal digits to describe the perimeter of each plot of land. For plots of land under 4 hectares, operators can use a polygon or a single point of latitude and longitude of six decimal digits to provide geolocation. **Establishments where cattle are kept can be described with a single point of geolocation coordinate.**

FAQ v5 §1.8, literal:
> No. For plots of land of a size below four hectares (only), geolocation can be described with one latitude and longitude point only. In case of cattle, **no polygons but only single geolocation points required**, notably for all ‘establishments’ (as defined in Art. 2(29) EUDR), where cattle have been held.

FAQ v5 §1.16 — prohibición de círculos, literal:
> There is neither an obligation nor a possibility to provide the plot of land information by means of circumference. For plots of land of more than four hectares (for the production of the relevant commodities other than cattle), geolocation has to be provided using polygons (**not a unique central point with a circumference**) with sufficient latitude and longitude points to describe the perimeter of each plot of land.

### 4.3. Cómo se ENFORCEA el umbral en el sistema (la regla operativa clave)

El sistema **no calcula el área del punto**: la exige como dato. Regla de validación oficial, transcripción literal:

> **Geolocation area for point** — In case a point is provided for a geolocation, **the area is mandatory**. If the user provided no data, **the value 4 (ha) is introduced by default** for the area. **If the commodity is not cattle and the user provided a value higher than 4ha then the system will raise an error.** When provided, the area must also be **higher or equal to 0.0001ha**.

GeoJSON File Description, literal:
> The property “Area” for points is optional. If it is not provided, then it will be set by default to “4” (four) hectares when processed by the EUDR system.

**Traducción práctica para nuestro exportador:**

1. Si la geometría es `Point` y el commodity **no** es ganado → la propiedad `Area` debe estar presente, ser **numérica** (no string), estar en el rango **[0.0001, 4]** hectáreas. Un valor > 4 ha **es rechazado por el sistema**.
2. Si falta `Area` en un punto, el sistema asume 4 ha — lo que equivale a una declaración implícita que quizá no queremos.
3. Para ganado, el punto es válido sin restricción de superficie.
4. Conclusión de diseño: **en Lote Limpio, todo lote agrícola > 4 ha debe exportarse como polígono. No hay alternativa.**

### 4.4. Ganadería: qué establecimientos hay que declarar

Guidance Document C/2025/4524, literal:
> For relevant products that consist of or have been made from cattle, according to Article 2(29) the geolocation requirement refers to **all premises or structures associated with raising the cattle, encompassing the birthplace, farms where they were kept** – in case of open-air farming, any environment or place, where livestock are kept on a temporary or permanent basis -, **until the time of slaughtering**.

FAQ v5 §1.25, literal:
> For relevant products under the commodity “cattle”, the time range of production refers to the lifetime of the animals from the moment the cattle were born until the time of slaughtering. If live cattle (HS Code 0102 21, 0102 29) are placed on the EU market (...), **all geolocations (or postal addresses, if applicable) until the first placing on the EU market will have to be collected and submitted** with the DDS or SD.

> **Implicancia:** para ganadería, el insumo no es "un punto", es **la cadena completa de establecimientos desde el nacimiento hasta la faena**, cada uno como punto. Esto es sustancialmente más complejo que el caso agrícola y conviene modelarlo como una secuencia de establecimientos con fechas.

---

## 5. Rotación de cultivos y usos múltiples

### 5.1. Rotación de cultivos — "declaración en exceso" (FAQ v5 §1.18)

La Comisión admite explícitamente declarar **más parcelas de las efectivamente usadas**, y la rotación de cultivos es un caso nombrado. Transcripción literal:

> **Declaration in excess can also be applied in case of crop rotation on a set of agricultural land plots on a farm, where e.g. soy is produced each year in a different part of the farm’s total arable land area.**

Condiciones y consecuencias, literal:

> Operators may declare "in excess" **only** in situations where a bulk commodity is **fully traced to the plot of land** and is not being subject to mixing with commodity of unknown origin or non-compliant commodities. (...)
>
> If the operator declares ‘in excess’ in the due diligence statement, the operator **assumes full responsibility for compliance of all plots of land for which geolocation is provided**, regardless of whether such plots of land are concerned by the production of commodities/products eventually placed on the market. **If one plot of land ‘geolocalised’ in the due diligence statement is not compliant, the entire set of plots of land ‘geolocalised’ is non-compliant.**

Además exige, para todas las parcelas declaradas (incluidas las "en exceso"): evaluación de riesgo conforme Art. 10(2), con atención particular a los criterios (i) y (j) del Art. 10, y demostrar riesgo **insignificante** para todas ellas.

Límite explícito, literal:
> traceability practices that aim to declare an excessive amount of plots of land (for instance, on a **regional or country-wide basis**) are generally **not in line** with the rules of this regulation.

> **Implicancia de producto para Lote Limpio:** declarar toda el área agrícola del establecimiento para cubrir la rotación es **legal pero contagia el riesgo**: un solo lote con pérdida de cobertura post-2020-12-31 invalida el conjunto. Nuestro verdicto debe distinguir claramente entre "el lote sembrado este año" y "el conjunto declarado en exceso", y advertir el efecto contagio.

### 5.2. Múltiples producciones sobre la misma propiedad (FAQ v5 §1.15)

- Si se produce **otro** commodity EUDR en un área con deforestación posterior al corte (p. ej. ganado en el área C), **ese** commodity es no conforme, pero la soja del área B en principio sigue siendo conforme **si solo se declara B**.
- Si **el mismo** commodity se produce en B y en C, el operador debe alcanzar riesgo insignificante considerando especialmente el **riesgo de mezcla dentro de la misma propiedad** (Art. 10(2)(j)).
- La ilegalidad que afecta el estatus legal de la propiedad entera **sí** contamina a B.

### 5.3. Productos compuestos / mezclas en silo (FAQ v5 §1.17)

Para commodities mezclados en silo, el lugar de producción declarado debe incluir el de **toda la mercadería que entró al silo desde el último vaciado**; si el silo no se vacía, la Comisión sugiere declarar hasta un **200 % de la capacidad del silo** bajo FIFO. Declarar solo "x cantidad equivalente a lo embarcado" **no está permitido**.

### 5.4. Una DDS, múltiples países

FAQ v5 §7.13, literal:
> If a relevant product is produced in multiple countries, the user must **enter the geolocation coordinates separately for each country**, as required by Annex II, point 3, of EUDR.

En el esquema esto se refleja en que `country` es un campo **por `producer`**, no por DDS.

---

## 6. Esquema de datos publicado — transcripción literal

**Sí existe esquema publicado, y es machine-readable y accesible sin autenticación.** Son dos piezas complementarias:

### 6.1. Pieza A — GeoJSON (el archivo de geolocalización)

Documento oficial: **"EUDR GeoJSON File Description"**, publicado por la Comisión dentro del propio sistema. Versión en vivo verificada: **"Updated 17 August 2026"**. Versión PDF anterior: **v1.5, 5 de mayo de 2025**.

**Tipos de geometría — literal:**

> The terms "geometry” and “type" refer to seven case-sensitive strings:
>
> **Point**: Point geometry types consist of two coordinate values.
> **MultiPoint**: MultiPoint geometry types consist of two or more points (coordinate pairs).
> **Polygon**: Polygon geometry types consist of at least four pairs of coordinates and represent an enclosed area by these coordinate points.
> **MultiPolygon**: MultiPolygon geometry types contain two or more polygon definitions.
>
> Please note that the first and last point’s coordinates of polygons are the same (they coincide geographically to close the shape).
>
> **Feature** / **FeatureCollection** / **GeometryCollection**
>
> Please note that geometry types of **"LineString" and "MultiLineString" do not represent valid geocoordinate shapes** for declaring production places and will not be accepted/processed.

**Restricción geométrica dura — literal:**

> Important note: **Polygons with holes (i.e., doughnut shapes) and shapes with crossing lines (like a figure eight for example) are not supported and will not be processed.** If a doughnut shape is needed, it can be defined by combining two half-doughnut shaped polygons.

> The system does not take into account holes inside a polygon, but only the outer boundaries. The user needs to provide separate polygons to simulate the holes.

**Propiedades aceptadas — transcripción literal completa (esta es la lista cerrada):**

> The system additionally accepts and will process the following optional properties:
>
> **ProducerName**: An optional producer name for the corresponding geometry type.
> **ProducerCountry**: The country of production ISO2 code.
> **ProductionPlace**: An optional name for the corresponding geometry type.
> **Area**: This represents the area in Hectares of the geometry element “Point” in the GeoJSON file.
>
> **Any other properties that are syntactically valid but not included in the optional properties list above, will be ignored.**

**Variantes de archivo — literal:**

> **Type I:** This file variant is for use by the web services interface (API) and via the application’s UI import utility **at producer level** (...)
>   1. Includes any required features listed in the “Definitions” section (such as point, polygon).
>   2. May include any of the optional properties.
>
> **Type II:** This file variant is for use via the application’s UI file import utility **at commodity level**. It contains multiple producers grouped by the “ProducerName” and “ProducerCountry” and has the following additional characteristics:
>   1. Includes any required features listed in the “Definitions” section (such as point, multipoint, polygon, multipolygon).
>   2. **Includes the “ProducerCountry” property per “Feature”.**
>   3. May include any of the optional properties.

**Ejemplo oficial Type I (transcripción literal, recortado en coordenadas por extensión):**

```json
{"type":"FeatureCollection","features":[{"type":"Feature","properties":{"ProductionPlace":"FAZENDA TABOAO I","Area":23.72,"ProducerCountry":"BR"},"geometry":{"type":"Polygon","coordinates":[[[-49.004616,-22.734322],[-49.004675,-22.734318], ... ,[-49.004616,-22.734322]]]}},{"type":"Feature","properties":{"ProductionPlace":"FAZENDA TABOAO II","Area":2.39,"ProducerCountry":"BR"},"geometry":{"type":"Polygon","coordinates":[[[-48.186023,-22.880156], ... ,[-48.186023,-22.880156]]]}}]}
```

*(Nota: en el ejemplo oficial la propiedad `Area` aparece incluso en polígonos, con valores muy superiores a 4 ha. La regla de validación restringe `Area` ≤ 4 ha **solo cuando la geometría es un `Point`** y el commodity no es ganado.)*

**Lista oficial de errores comunes (transcripción literal, 16 ítems):**

> 1. Coordinate lines crossing (i.e. figure eight shapes or intersecting polygon lines)
> 2. Overlapping sides: Internal overlap or holes where part of the polygon folds inward, creating a concave shape within the boundary are not accepted by the system
> 3. Coordinate shapes with holes (i.e. doughnut shapes) — Workaround: Two half-moon shapes
> 4. “Open” polygons. All polygons must represent closed shapes (i.e. the 1st coordinate pair same as the last)
> 5. Invalid geometry types (i.e. LineString)
> 6. Coordinates representing straight lines
> 7. Duplicate coordinates due to 6 decimals rounding in the system (For example the 2 following points with 10 decimals become the same after rounding):
>    `-5.8227391234 ,144.2567071234 -> -5.822739,144.256707`
>    `-5.8227394567,144.2567074567 -> -5.822739,144.256707`
> 8. File syntax errors (i.e. missing “)” or “}”)
> 9. Invalid property names (e.g. “geometry” or incorrect property keyword case – “productionplace” instead of “ProductionPlace”)
> 10. Invalid file format (PDF, txt)
> 11. Invalid coordinate range (outside the value ranges 90/-90 or 180/-180)
> 12. Invalid producer country ISO2 code
> 13. Password Protected files
> 14. Data representation issues:
>     - For example, `"Area": "3"` instead of `"Area": 3` will result in area = 0 because the value 3 in quotes is not recognized as a number which is what is expected.
>     - The coordinates for points should be array and not array of arrays. While uploading these files, no coordinates are rendered.
> 15. Polygons with holes inside
> 16. GeoJSON files exceeding 25 Mb size limit

### 6.2. Pieza B — XSD / WSDL de la DDS (el sobre que transporta el GeoJSON)

**Servicio:** `EUDRDueDiligenceStatementServiceV3`
**Namespace:** `http://ec.europa.eu/tracesnt/certificate/eudr/due-diligence-statement/v3`
**Namespace común:** `http://ec.europa.eu/tracesnt/certificate/eudr/common/v3`
**Endpoint producción:** `https://eudr.webcloud.ec.europa.eu/tracesnt/ws/EUDRDueDiligenceStatementServiceV3`
**Endpoint aceptación:** `https://acceptance.eudr.webcloud.ec.europa.eu/tracesnt/ws/EUDRDueDiligenceStatementServiceV3`
**Seguridad:** WS-Security, `UsernameToken` con `PasswordDigest` sobre HTTPS + header `WebServiceClientId`.
**Acceso al XSD:** reemplazar `?wsdl` por `?xsd=1`, `?xsd=2`, etc. **Verificado el 2026-09-12: el WSDL y los XSD responden HTTP 200 sin autenticación.**

**Transcripción literal del XSD (`?xsd=4`) — los tres tipos que importan:**

```xml
<xs:complexType name="DueDiligenceStatementBaseType">
  <xs:sequence>
    <xs:element name="internalReferenceNumber" type="eudrCommon:InternalReferenceNumberType" minOccurs="0"/>
    <xs:element name="activityType" type="eudrCommon:ActivityType"/>
    <xs:element name="representedOperator" type="eudrCommon:EconomicOperatorIdentificationType" minOccurs="0"/>
    <xs:element name="countryOfActivity" type="eudrCommon:EuropeanCountryType" minOccurs="0"/>
    <xs:element name="borderCrossCountry" type="eudrCommon:EuropeanCountryType" minOccurs="0"/>
    <xs:element name="comment" type="eudrCommon:EditorialCommentType" minOccurs="0"/>
    <xs:element name="commodities" type="dds:DdsCommodityType" maxOccurs="200"/>
    <xs:element name="geoLocationConfidential" type="xs:boolean"/>
    <xs:element name="groupedDeclarations" type="eudrCommon:GroupedDeclarationsType" minOccurs="0" maxOccurs="2000"/>
  </xs:sequence>
</xs:complexType>

<xs:complexType name="DdsCommodityType">
  <xs:sequence>
    <xs:element name="position" type="xs:long" minOccurs="0"/>
    <xs:element name="descriptors" type="eudrCommon:CommercialDescriptionType"/>
    <xs:element name="hsHeading" type="eudrCommon:HSHeadingType"/>
    <xs:element name="speciesInfo" type="dds:SpeciesInformationType" minOccurs="0" maxOccurs="500"/>
    <xs:element name="producers" type="dds:DdsProducerType" minOccurs="0" maxOccurs="1000"/>
  </xs:sequence>
</xs:complexType>

<xs:complexType name="DdsProducerType">
  <xs:sequence>
    <xs:element name="position" type="xs:long" minOccurs="0"/>
    <xs:element name="country" type="eudrCommon:CountryType"/>
    <xs:element name="name" minOccurs="0">
      <xs:simpleType>
        <xs:restriction base="xs:string">
          <xs:maxLength value="500"/>
        </xs:restriction>
      </xs:simpleType>
    </xs:element>
    <xs:element name="geometryGeojson" type="xs:base64Binary"/>
  </xs:sequence>
</xs:complexType>
```

Documentación literal de `geometryGeojson` dentro del XSD:

> GeoJSON geometry (base64 encoded) representing the geolocation of the plot of land. Must contain lat/long coordinates with minimum 6 decimal digits. Polygons required for plots greater than 4 hectares (except cattle where point coordinates for the establishment suffice). **Supported geometry types: Point, MultiPoint, Polygon, MultiPolygon, GeometryCollection.**

> **El GeoJSON viaja codificado en Base64 dentro del elemento `geometryGeojson`, uno por `producer`.**

**Tipos comunes — transcripción literal de nombres, tipos y restricciones:**

| Tipo | Base | Restricciones |
|---|---|---|
| `ReferenceNumberType` | `string` | Max length: **14** |
| `VerificationNumberType` | `string` | Min 5, Max **35** |
| `InternalReferenceNumberType` | `string` | Max length: **50** |
| `UuidType` | `string` | Pattern `[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}` |
| `CountryType` | `string` | Pattern `[a-zA-Z]{2}` — ISO 3166-1 alpha-2 |
| `HSHeadingType` | `string` | Pattern `[0-9]{2,6}`, Min 2, Max 6 |
| `ScientificNameType` | `string` | Min 1, Max 200 |
| `EditorialCommentType` | `string` | Max 2000 |
| `RejectionReasonType` | `string` | Min 0, Max 1000 |
| `IdentifierValueType` | `string` | Max 80 |
| `SupplementaryUnitQualifierType` | `string` | Min 3, Max 4 |
| `DecimalThreePrecType` | `decimal` | precisión 3 |
| `DecimalSixteenTotalSixPrecType` | `decimal` | total 16 dígitos, 6 decimales |
| `StreetAndNumberType` | `string` | Min 1, Max 300 |
| `PostalCodeType` | `string` | Min 1, Max 80 |
| `CityType` | `string` | Min 1, Max 200 |
| `NonStructuredAddressType` | `string` | Min 1, Max 250 |
| `EmailType` | `string` | Pattern `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`, Max 200 |
| `PhoneType` | `string` | Max 50 |

**Enumeraciones literales:**

```
ActivityType          : DOMESTIC | IMPORT | EXPORT
OperatorRoleType      : OPERATOR | REPRESENTATIVE_OPERATOR
EudrStatusType        : SUBMITTED | AVAILABLE | REJECTED | WITHDRAWN | ARCHIVED
                        | SUSPENDED (not active in current release)
                        | UPDATED   (not active in current release)
                        | GROUPED | OBSOLETE
IdentifierTypeType    : eori | vat | gln | tin | cbr | cin | duns | comp_num | comp_reg | oni
EuropeanCountryType   : AT BE BG CY CZ DE DK EE ES FI FR GR HR HU IE IT LT LU LV MT NL PL PT RO SE SI SK XI
```

**`CommercialDescriptionType` / `GoodsMeasureType` — literal:**

```
CommercialDescriptionType
  descriptionOfGoods            string (max 150)          Required   Single commercial description.
  goodsMeasure                  GoodsMeasureType          Required   Units of measurement combinations

GoodsMeasureType
  percentageEstimationOrDeviation  DecimalThreePrecType              Optional
  netWeight                        DecimalSixteenTotalSixPrecType    Optional   Mandatory if activity type is IMPORT/EXPORT. The weight must be provided in Kg.
  supplementaryUnit                DecimalSixteenTotalSixPrecType    Optional
  supplementaryUnitQualifier       SupplementaryUnitQualifierType    Optional   Required if supplementaryUnit is provided
```

**Ejemplo oficial de request SOAP (transcripción literal del sample publicado):**

```xml
<dds:SubmitDdsRequest>
  <dds:operatorRole>OPERATOR</dds:operatorRole>
  <dds:statement>
    <dds:internalReferenceNumber></dds:internalReferenceNumber>
    <dds:activityType>IMPORT</dds:activityType>
    <dds:countryOfActivity>BE</dds:countryOfActivity>
    <dds:borderCrossCountry>BE</dds:borderCrossCountry>
    <dds:commodities>
      <dds:position>1</dds:position>
      <dds:descriptors>
        <eudrCommon:descriptionOfGoods>Test wood product</eudrCommon:descriptionOfGoods>
        <eudrCommon:goodsMeasure>
          <eudrCommon:netWeight>200</eudrCommon:netWeight>
          <eudrCommon:supplementaryUnit>20</eudrCommon:supplementaryUnit>
          <eudrCommon:supplementaryUnitQualifier>MTQ</eudrCommon:supplementaryUnitQualifier>
        </eudrCommon:goodsMeasure>
      </dds:descriptors>
      <dds:hsHeading>4410</dds:hsHeading>
      <dds:speciesInfo>
        <dds:scientificName>Bifora testiculata</dds:scientificName>
        <dds:commonName>Test Name</dds:commonName>
      </dds:speciesInfo>
      <dds:producers>
        <dds:position>1</dds:position>
        <dds:country>FR</dds:country>
        <dds:name>Producer Name</dds:name>
        <dds:geometryGeojson>BASE64_ENCODED_GEOJSON</dds:geometryGeojson>
      </dds:producers>
    </dds:commodities>
    <dds:geoLocationConfidential>false</dds:geoLocationConfidential>
  </dds:statement>
</dds:SubmitDdsRequest>
```

**Operaciones del servicio DDS V3:** `submitDds`, `amendDds`, `withdrawDds`, `getDds`, `getDdsByInternalReference`, `getDdsByIdentifiers`.

Ventana de modificación, literal:
> Amend an existing DDS within the **72-hour amendment window**. The operator may amend the declaration while retaining the same reference number. After this window closes, amendments result in a new submission with a new identifier. Blocked if the DDS is not in available status or is subject to a **customs lock** — the immutability constraint applied once used for customs clearance.

### 6.3. Pieza C — Declaración Simplificada (SD) V3, para micro/pequeños productores primarios

**Servicio:** `EUDRSimplifiedDeclarationServiceV3`. Relevante porque **admite dirección postal o catastro en lugar de GeoJSON** (Art. 4a(5)).

Transcripción literal de `SdProducerLocationType`:

```
SdProducerLocationType  (Choice — exactamente una de las tres)
  geometryGeojson       base64Binary                  Choice   GeoJSON geometry (base64 encoded)... minimum 6 decimal digits.
                                                               Supported types: Point, MultiPoint, Polygon, MultiPolygon, GeometryCollection.
  postalAddress         SdProducerPostalAddressType   Choice   Postal address(es) of the production location.
  cadastralIdentifier   string (max 80)               Choice   Cadastral identifier(s) referencing the plot(s) of land in a national land registry.
```

y `SdProducerType`:

```
SdProducerType
  producerPosition   long                      Optional
  producerCountry    CountryType               Required   ISO 3166-1 alpha-2
  producerName       string (max 500)          Optional
  producerLocation   SdProducerLocationType    Required
```

**Formato del número de referencia de la SD, literal:**
> SD reference number format: **14 characters starting with `S`** (e.g., `S26FRNMNBSA96Q`), same length as DDS but with the `S` prefix distinguishing the type.

> **Nota:** `cadastralIdentifier` es **el único** campo de identificador catastral en todo el modelo de datos EUDR, y **solo existe en la SD**, no en la DDS. Un productor argentino que exporta vía operador europeo cae en la DDS, donde ese campo no existe.

---

## 7. Resto de campos de la DDS — Anexo II transcripto

Transcripción literal del **Anexo II** del texto consolidado (26.12.2025). **Importante: el punto 4 fue suprimido por el Reglamento (UE) 2025/2650** — el texto consolidado lo marca como `▼M2 —————`, por lo que la numeración vigente salta de 3 a 5.

> **ANNEX II**
> **Due diligence statement**
>
> Information to be contained in the due diligence statement in accordance with Article 4(2):
>
> **1.** Operator’s name, address and, in the event of relevant commodities and relevant products entering or leaving the market, the Economic Operators Registration and Identification (EORI) number in accordance with Article 9 of Regulation (EU) No 952/2013.
>
> **2.** Harmonised System code, free-text description, including the trade name as well as, where applicable, the full scientific name, and quantity of the relevant product that the operator intends to place on the market or export. For relevant products entering or leaving the market, the quantity is to be expressed in kilograms of net mass and, where applicable, in the supplementary unit set out in Annex I to Regulation (EEC) No 2658/87 against the indicated Harmonised System code or, in all other cases, expressed in net mass specifying a percentage estimate or deviation or, where applicable, volume or number of items. A supplementary unit is applicable where it is defined consistently for all possible subheadings under the Harmonised System code referred to in the due diligence statement.
>
> **3.** Country of production and the geolocation of all plots of land where the relevant commodities were produced. For relevant products that contain or have been made using cattle, and for such relevant products that have been fed with relevant products, the geolocation shall refer to all the establishments where the cattle were kept. Where the relevant product contains or has been made using commodities produced in different plots of land, the geolocation of all plots of land shall be included in accordance with Article 9(1), point (d).
>
> **4.** *[suprimido por el Reglamento (UE) 2025/2650]*
>
> **5.** The text: ‘By submitting this due diligence statement the operator confirms that due diligence in accordance with Regulation (EU) 2023/1115 was carried out and that no or only a negligible risk was found that the relevant products do not comply with Article 3, point (a) or (b), of that Regulation.’.
>
> **6.** Signature in the following format:
> ‘Signed for and on behalf of:
> Date:
> Name and function: Signature:’.

### 7.1. Mapeo Anexo II → campos del esquema

| Anexo II | Campo(s) en el esquema V3 |
|---|---|
| 1 — nombre, dirección, EORI del operador | `representedOperator` → `EconomicOperatorIdentificationType` (`operatorName`, `operatorAddress`, `operatorEmail`, `operatorPhone`, `operatorReferenceNumber{identifierType, identifierValue}` con `identifierType = eori`). Para el operador propio, se toma del perfil registrado. |
| 2 — código HS | `commodities[].hsHeading` (`[0-9]{2,6}`) |
| 2 — descripción libre / nombre comercial | `commodities[].descriptors.descriptionOfGoods` (max 150) |
| 2 — nombre científico completo | `commodities[].speciesInfo[].scientificName` + `commonName` (**obligatorio solo para commodity Wood**) |
| 2 — cantidad | `commodities[].descriptors.goodsMeasure.netWeight` (kg; obligatorio si IMPORT/EXPORT), `supplementaryUnit` + `supplementaryUnitQualifier`, `percentageEstimationOrDeviation` |
| 3 — país de producción | `commodities[].producers[].country` |
| 3 — geolocalización de todas las parcelas | `commodities[].producers[].geometryGeojson` (GeoJSON en Base64) |
| 5 — texto de confirmación | Implícito en el acto de envío; no es un campo del XSD |
| 6 — firma | No es un campo del XSD; se materializa en la autenticación WS-Security / EU Login |
| — (no Anexo II) | `activityType`, `countryOfActivity`, `borderCrossCountry`, `comment`, `geoLocationConfidential`, `groupedDeclarations`, `internalReferenceNumber` |

### 7.2. Número de referencia DDS y verification number

- Ambos los **asigna el sistema** al enviar la DDS (Art. 33(2)(b) para el número de referencia).
- Art. 33(2)(b), literal:
  > registration of due diligence statements including the communication to the operator concerned of a **reference number** for each due diligence statement submitted through the information system;
- El `verificationNumber` **no está en el Reglamento**; es una construcción del sistema. Definición oficial, literal:
  > The **verification number is a security number assigned by the Information System** to ensure additional security of data.
- Art. 4(7), literal:
  > Operators shall communicate to downstream operators and to traders further down the supply chain of the relevant products they placed on the market or exported **the reference numbers of the due diligence statements** or, if applicable, the declaration identifiers associated to those products.
- Acceso a la geolocalización aguas abajo: controlado por el booleano `geoLocationConfidential`. FAQ v5 §7.7, literal:
  > those supply chain members that have access to the DDS (or SD) via reference number (or declaration identifier) and verification number will have access **if the user that submitted the statement allowed to reveal the geolocation**.

### 7.3. Fecha o rango de producción — dato exigido, pero NO es campo de la DDS

**Hallazgo relevante y contraintuitivo.**

- El **Art. 9(1)(d) exige recolectar** *"the date or time range of production"*.
- Pero el **Anexo II no lo incluye** entre la información que debe contener la DDS.
- Y el **XSD V3 no tiene ningún campo de fecha de producción** (verificado exhaustivamente sobre `?xsd=1..5`; los únicos `dateTime` son metadatos de sistema en `OverviewType` y `CommunicationToOperatorType`).

Es decir: **es información que el operador debe tener y poder exhibir a la autoridad competente (Art. 9(2)), pero que no se transmite en la declaración electrónica.**

Definición oficial de qué es (FAQ v5 §1.25, literal):
> For commodities other than cattle, the **date of production refers to the date of harvesting** of the commodities, and the **time range of production refers to the period/duration of the production process**. (...) If more precise information is not available, due to the specificities of the production, **the crop year and/or harvesting season could be used**.

> **Implicancia para Lote Limpio:** la campaña / fecha de cosecha debe estar en **nuestro** documento de debida diligencia (que es lo que el acopio guarda como evidencia), no en el GeoJSON. Esto refuerza el valor del entregable documental frente al mero archivo geoespacial.

### 7.4. Nivel de detalle del código HS

FAQ v5 §7.24, literal:
> It is mandatory to declare the HS codes **at least to the number of digits as listed in Annex I of EUDR**. Further to the mandatory level of digits, users can declare the HS also in more details up to 6 digits. (...) Similarly, when Annex I of EUDR contains an HS code of 6 digits, then the user cannot select HS heading of 4 or less digits.

Para soja, el Anexo I lista `1201` (Soya beans, whether or not broken) — 4 dígitos mínimo, ampliable a 6.

---

## 8. Límites técnicos del sistema de información

### 8.1. Límites confirmados

| Límite | Valor | Fuente |
|---|---|---|
| **Tamaño máximo por DDS** (incluye total de GeoJSON subidos) | **25 MB** | FAQ v5 §1.7, §7.16; GeoJSON File Description error 16; regla de validación "Geolocation data size" |
| Puntos/vértices que caben en 25 MB | **> 1.000.000** (estimación oficial) | FAQ v5 §7.16, literal: *"The 25 MB file limitation allows for more than 1 million geolocation points, or polygon vertexes in total."* |
| **`producers` (lugares de producción) por commodity** | **1.000** | XSD: `maxOccurs="1000"`; regla de validación; FAQ v5 §7.12 |
| **`producers` totales por DDS** | **10.000** | Regla de validación; FAQ v5 §7.12 |
| **`commodities` (líneas de producto) por DDS** | **200** en el XSD (`maxOccurs="200"`) — ver discrepancia abajo | XSD `?xsd=4`; FAQ v5 §7.12 |
| **`speciesInfo` (pares nombre científico/común) por commodity** | **500** | XSD: `maxOccurs="500"`; regla de validación |
| **`groupedDeclarations` (DDS referenciadas) por DDS** | **2.000** | XSD: `maxOccurs="2000"`; regla de validación |
| **DDS en estado borrador por operador** | **50** | Regla de validación (marcada "UI only"); FAQ v5 §7.12 |
| Área mínima de un `Point` | **≥ 0,0001 ha** | Regla de validación |
| Área máxima de un `Point` (no ganado) | **≤ 4 ha**, si no error | Regla de validación |
| Sin límite de superficie de polígono | *"There is no limit in the area of polygons that can be imported into the Information System"* | FAQ v5 §1.7 |
| Ventana de enmienda/retiro de DDS | **72 horas** desde el envío | Documentación oficial de `amendDds` / `withdrawDds` |
| Almacenamiento de datos personales | **10 años** desde el envío de la DDS | Considerando del Reglamento de Ejecución (UE) 2024/3084 |

**Discrepancia detectada y no resuelta:** el **XSD declara `commodities maxOccurs="200"`** y la FAQ v5 §7.12 dice *"A single DDS can contain maximum 200 lines of relevant products"*, pero la página oficial de **Reglas de Validación** dice: *"Maximum of commodities — The number of commodities per DDS cannot exceed a certain amount (**presently set to 100**)."* Interpretación razonable: el XSD fija el techo estructural (200) y una regla de negocio más estricta (100) se aplica en tiempo de ejecución. **Diseñar contra 100 para estar seguros.**

### 8.2. Formatos aceptados de carga

- **Único formato de archivo de geolocalización aceptado: GeoJSON** (FAQ v5 §7.26). PDF y TXT son error explícito. Archivos protegidos con contraseña son error explícito.
- Dos vías de carga: **entrada manual** en la UI, o **carga de archivo** GeoJSON (UI o API).
- En la API el GeoJSON viaja **Base64 dentro de `geometryGeojson`**, no como adjunto.
- Validación de números de referencia: disponible como función dedicada, **también mediante archivos CSV** (FAQ v5 §7.25). Es el único uso de CSV documentado, y no es para geolocalización.

### 8.3. Qué hacer si se supera el límite de 25 MB

Tres mecanismos oficiales, en orden:

1. **Simplificar geometría.** FAQ v5 §7.16, literal: *"when describing a rectangle shape, a geolocation can for example be described with 7 corner points instead of 168 corner points"*.
2. **Usar puntos en vez de polígonos** para áreas < 4 ha y para la cadena de ganado.
3. **Agrupar (grouping).** GeoJSON File Description, literal:
   > users can submit separate DDS, each up to 25 Mb, and then **merge them into a single final DDS by referencing the originally submitted DDS**. Once the merged DDS is created, the new reference number and verification number can be used for further procedures.

   Esto corresponde a `groupedDeclarations` (máx. 2.000) y fue formalizado por el **Reglamento de Ejecución (UE) 2026/1565**, considerando 46, literal:
   > In order to address technical limitations regarding the file size of due diligence statements and simplified declarations (...) specific rules should be laid down to enable **grouping of individual reference numbers or declaration identifiers**.

### 8.4. Estado del sistema

- El sistema de información se lanzó el **4 de diciembre de 2024** (FAQ v5 §7.9).
- FAQ v5 §7.9, literal: *"A temporary closure of the system during the first half of 2026 was introduced to deploy necessary updates required by the 2025 EUDR amendments."*
- **Verificado el 2026-09-12:** los endpoints y WSDL de **V3 responden HTTP 200** en producción y en aceptación. Esto contradice la nota de la propia documentación que dice *"The V3 endpoints and WSDLs listed above are not yet accessible"* — la nota está desactualizada.
- Autenticación futura anunciada: **mTLS**, con periodo de transición manteniendo `UsernameToken`.

---

## 9. Huecos: lo NO CONFIRMADO

1. **NO CONFIRMADO — Identificador oficial de parcela.** Busqué en Art. 2, Art. 9, Anexo II, Anexo III, el XSD completo (`?xsd=1` a `?xsd=5`), la GeoJSON File Description y las reglas de validación. **No existe.** Esto es una conclusión negativa verificada, no un hueco de investigación, pero lo dejo listado porque es contraintuitivo y conviene reconfirmarlo antes de construir sobre ello.

2. **NO CONFIRMADO — Número máximo de vértices por polígono individual.** Busqué en reglas de validación, GeoJSON File Description y FAQ §7.12/§7.16. Solo existen límites agregados (25 MB, ~1M puntos totales). No hay tope por polígono documentado.

3. **NO CONFIRMADO — Si el sistema rechaza un polígono cuya área calculada supera 4 ha declarada como punto.** La regla de validación cubre el caso inverso (`Point` con `Area` > 4 ha → error). No hay regla publicada que verifique que un lote > 4 ha efectivamente se envíe como polígono, más allá de la obligación legal. Es decir: **el sistema podría aceptar técnicamente un punto con `Area` = 4 para un lote de 50 ha, y el incumplimiento sería legal, no técnico.**

4. **NO CONFIRMADO — Existencia de un JSON Schema formal (draft-07 / 2020-12) para el GeoJSON EUDR.** Busqué en la documentación del sistema, en GitHub de la Comisión y en el portal de la API. Existe **especificación en prosa + XSD**, pero **no encontré un `.json` de JSON Schema publicado**. Si lo necesitamos, hay que derivarlo nosotros de la prosa.

5. **NO CONFIRMADO — Repositorio público en GitHub de la Comisión con el esquema.** Busqué; no encontré uno. La fuente machine-readable canónica es el WSDL/XSD servido por el propio endpoint (`?xsd=N`), que sí es públicamente accesible sin credenciales.

6. **NO CONFIRMADO — Límite de commodities por DDS: 100 o 200.** Discrepancia entre XSD (`maxOccurs="200"`) + FAQ v5 §7.12 (200 líneas) y la página de Reglas de Validación ("presently set to 100"). No hay documento que reconcilie ambos.

7. **NO CONFIRMADO — Si `Area` es obligatorio en polígonos.** La regla de validación la hace obligatoria solo para `Point`. Los ejemplos oficiales **sí** la incluyen en polígonos con valores > 4 ha. No hay regla publicada sobre qué hace el sistema con `Area` en un polígono (¿la ignora?, ¿la usa?, ¿la contrasta con el área calculada?).

8. **NO CONFIRMADO — Formato exacto (patrón) del `referenceNumber` de la DDS.** Sabemos que es `string` de máximo 14 y que el de la SD son 14 caracteres empezando con `S` (ej. `S26FRNMNBSA96Q`). **No encontré el patrón documentado para la DDS**, solo la longitud máxima.

9. **NO CONFIRMADO — Si el manual de usuario de la UI (no la API) añade restricciones de geolocalización adicionales.** El "EUDR Information System user manual" está referenciado desde la FAQ (nota al pie 5) hacia la sección "Training and user manuals" de la página de la Comisión, pero no descargué ni verifiqué su contenido en esta investigación.

10. **NO CONFIRMADO — Versión vigente de la GeoJSON File Description como documento numerado.** La versión en vivo dice "Updated 17 August 2026" sin número de versión; el último PDF numerado que localicé es **v1.5, 5 de mayo de 2025**. No pude determinar qué número de versión corresponde al documento de agosto de 2026.

11. **NO CONFIRMADO — Nada de esto cubre bosque nativo protegido argentino.** El EUDR **no** define ni exige capas de ordenamiento territorial nacional. La verificación contra la Ley 26.331 (OTBN) es una capa propia de Lote Limpio y **no** tiene reflejo en el esquema de la DDS. Lo anoto porque es fácil asumir lo contrario.

---

## 10. Resumen ejecutivo para el diseño del exportador

1. **Formato de salida: GeoJSON `FeatureCollection`, EPSG:4326, orden `[longitud, latitud]`, exactamente 6 decimales.**
2. **Un `Feature` por parcela.** Nunca un polígono que abarque varias parcelas.
3. **Polígonos cerrados** (primer vértice = último), **sin agujeros, sin auto-intersecciones, sin LineString**.
4. **Propiedades a emitir:** `ProductionPlace` (nuestro nombre de lote), `ProducerName`, `ProducerCountry` = `"AR"`, y `Area` **numérica** (sin comillas) solo cuando la geometría sea `Point`.
5. **Regla dura:** lote agrícola > 4 ha ⇒ polígono. Lote ≤ 4 ha ⇒ punto con `Area` ∈ [0,0001; 4] o polígono. Ganadería ⇒ punto por establecimiento, sin límite de área.
6. **Deduplicar vértices después de redondear a 6 decimales**, o el sistema rechaza la geometría.
7. **Mantener el archivo bajo 25 MB**; simplificar líneas rectas a 2 vértices.
8. **La campaña / fecha de cosecha va en nuestro documento de debida diligencia**, no en el GeoJSON.
9. Ofrecer también el **Type II** (múltiples productores agrupados por `ProducerName` + `ProducerCountry`) para el caso del acopio que consolida varios productores.

---

## 11. Fuentes

Todas verificadas el **2026-09-12**. Las URLs de EUR-Lex devuelven HTTP 202 ante clientes automatizados por protección anti-bot; el contenido citado se obtuvo del servicio CELLAR de la Oficina de Publicaciones, que sirve el mismo texto oficial.

### Legislación

1. Reglamento (UE) 2023/1115 — acto base
   https://eur-lex.europa.eu/eli/reg/2023/1115/oj
2. **Texto consolidado 02023R1115 — EN — 26.12.2025 — 002.001** (fuente de todas las citas de articulado)
   https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX%3A02023R1115-20251226
   Contenido obtenido vía: `http://publications.europa.eu/resource/celex/02023R1115-20251226`
3. Reglamento (UE) 2024/3234, de 19 de diciembre de 2024 (primer aplazamiento — "M1")
   https://eur-lex.europa.eu/eli/reg/2024/3234/oj
4. **Reglamento (UE) 2025/2650, de 19 de diciembre de 2025** (aplazamiento vigente + simplificación — "M2")
   https://eur-lex.europa.eu/eli/reg/2025/2650/oj
5. Reglamento de Ejecución (UE) 2024/3084 — funcionamiento del sistema de información
   https://eur-lex.europa.eu/eli/reg_impl/2024/3084/oj
6. Reglamento de Ejecución (UE) 2026/1565, de 13 de julio de 2026 — modifica 2024/3084 (agrupación, SD, contingencia)
   https://eur-lex.europa.eu/eli/reg_impl/2026/1565/oj

### Documentos de la Comisión

7. **Comunicación de la Comisión — Guidance Document for Regulation (EU) 2023/1115**, C/2025/4524, DOUE serie C, 12.8.2025
   https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=OJ:C_202504524
   Contenido obtenido vía: `http://publications.europa.eu/resource/celex/52025XC04524`
8. **"Implementation of the EU Deforestation Regulation — Frequently Asked Questions", Version 5 – April 2026** (publicado 2026-08-21). Página:
   https://environment.ec.europa.eu/publications/faq-eudr-implementation_en
   PDF directo (95 pp.):
   https://webgate.ec.europa.eu/circabc-ewpp/rest/download/4dc28987-bc5a-4b71-bd46-a13b611f3ebb
9. The Information System of the Deforestation Regulation (página de la Comisión)
   https://green-business.ec.europa.eu/deforestation-regulation-implementation/information-system-deforestation-regulation_en

### Documentación técnica del sistema de información

10. **EUDR Information System — Operator API Reference** (inicio, URLs base, credenciales, contactos)
    https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/index.html
11. **EUDR GeoJSON File Description** (versión en vivo, "Updated 17 August 2026")
    https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/geojson-description.html
12. **Due Diligence Statement — V3 API Reference** (tipos, campos, cardinalidades)
    https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/api/due-diligence-statement-v3.html
13. **Simplified Declaration — V3 API Reference** (dirección postal / catastro)
    https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/api/simplified-declaration-v3.html
14. **Validation Rules** (reglas de negocio, umbral de 4 ha para puntos, truncado a 6 decimales, límites)
    https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/validation-rules.html
15. **DDS Samples** (SOAP request/response literales)
    https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/samples/dds-samples.html
16. **Change Log** (cambios V2→V3, formato de referencia SD, mTLS futuro)
    https://eudr.webcloud.ec.europa.eu/tracesnt/help/eudr-documentation/operator/change-log.html
17. **WSDL en vivo del servicio DDS V3** — verificado HTTP 200 sin autenticación
    https://eudr.webcloud.ec.europa.eu/tracesnt/ws/EUDRDueDiligenceStatementServiceV3?wsdl
18. **XSD en vivo** (fuente de las transcripciones literales de la sección 6.2) — `?xsd=1` … `?xsd=5`
    https://eudr.webcloud.ec.europa.eu/tracesnt/ws/EUDRDueDiligenceStatementServiceV3?xsd=4
19. Entorno de aceptación (pruebas de integración)
    https://acceptance.eudr.webcloud.ec.europa.eu/tracesnt/
20. Producción del sistema de información
    https://eudr.webcloud.ec.europa.eu/tracesnt/

### Estándar base

21. IETF RFC 7946 — The GeoJSON Format
    https://datatracker.ietf.org/doc/html/rfc7946

### Contactos oficiales (de la documentación de la API)

- Registro y soporte técnico: `SANTE-TRACES@ec.europa.eu` (asunto debe empezar con "EUDR API")
- Consultas de política: `ENV-DEFORESTATION@ec.europa.eu`
