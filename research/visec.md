# VISEC — Formato de salida y vías de carga

> Investigación para Lote Limpio. Fecha de consulta de todas las fuentes: **2026-09-12**.
> Regla aplicada: todo lo que no pudo verificarse contra una fuente primaria está marcado como **NO CONFIRMADO**.
> Los nombres de campo, valores de tabla y citas van en su idioma y grafía original, sin traducir ni normalizar.

---

## 1. Qué es VISEC y cuál es su alcance

**VISEC** = *Visión Sectorial del Gran Chaco Argentino*. Es una **Asociación Civil sin fines de lucro**, nacida en 2019 como iniciativa de **CIARA-CEC** (Cámara de la Industria Aceitera de la República Argentina + Centro de Exportadores de Cereales), **The Nature Conservancy**, **Tropical Forest Alliance** y el **Grupo Peterson**.

Hechos verificados:

- **No certifica.** Es una plataforma de gestión de información y trazabilidad. Los certificados los emiten Organismos de Verificación (OV) independientes acreditados ante VISEC. (FAQ VISEC Soja §2.3; ABC del productor §14)
- **Es voluntaria.** No hay sanción administrativa, fiscal ni sanitaria por no inscribirse. (FAQ Soja §2.5; FAQ Carne §7)
- **Dos módulos con protocolos y plataformas separadas**: **VISEC Soja** (Sistema MRV administrado por la **Bolsa de Comercio de Rosario**) y **VISEC Carne** (operado por VISEC Asociación Civil).
- **Alcance territorial**: todo el territorio nacional bajo producción agrícola, con foco en el Gran Chaco. (Protocolo §3)
- **Fecha de corte**: 31 de diciembre de 2020, alineada con el Reglamento (UE) 2023/1115.
- **Reconocimiento estatal**: inscripta en el *Directorio de Esquemas de Diferenciación Agroindustriales* (Res. SAGyP 50/2024) por **Disposición DI-2025-1-APN-SSMAEII#MEC** del 22/01/2025.
- **Mención de la Comisión Europea**: el informe **COM(2026) 191 final** dice textualmente: *"Innovative digital platforms, such as Argentina's VISEC platform enable traceability of soy exports."*
- **Dominio real**: `visec.com.ar` (HTTP 200). `visec.ar` y `visecargentina.com` **no resuelven DNS**. `ciaracec.com.ar` y `www.ciaracec.com.ar` responden 200.

Unidad de análisis (crítico para nuestro modelo de datos):

> "Se define **Unidad Productiva** como la parcela de terreno (dentro de una propiedad) que dispondrá de una cosecha determinada como resultado de la producción de un productor definido." (Protocolo §6.1)

> "La Unidad Productiva estará definida por el nro. RENSPA, por lo que los distintos RENSPA que se registren para un mismo establecimiento o propiedad, implican distintas Unidades Productivas no relacionadas entre sí. **No existe el concepto de Polígono como tal separado del Productor**, ya que estará registrado como RENSPA." (Protocolo, Glosario)

> "la unidad productiva puede estar compuesta por 1 o más lotes agrícolas siempre cuando estos estén bajo producción de un mismo productor." (FAQ BCR §17)

**Implicancia para Lote Limpio**: VISEC no acepta "lotes" sueltos. La clave primaria del lado VISEC es **RENSPA**, y un RENSPA = una UP = **un polígono** (ver §5). Nuestro modelo debe poder agrupar N lotes internos bajo un RENSPA y exportar un único polígono por RENSPA.

---

## 2. Estado de la documentación pública

**ABIERTA, y más de lo esperado.** No hace falta login ni NDA para obtener el esquema de datos. Todo lo siguiente descarga sin autenticación (verificado, HTTP 200, `application/pdf` / `application/vnd.ms-excel`):

| Documento | Formato | URL |
|---|---|---|
| Protocolo VISEC SLD (Nov 2025) | PDF | `https://www.visec.com.ar/wp-content/uploads/2025/12/Protocolo-VISEC-NUEVA-VERSION-NOVIEMBRE-2025.pdf` |
| Anexos del Protocolo (Nov 2025) | PDF | `https://www.visec.com.ar/wp-content/uploads/2025/12/ANEXOS-_-Protocolo-VISEC-Noviembre25-.pdf` |
| **Template UP ORIGINAL Sistema VISEC MRV** | XLSX | `https://www.visec.com.ar/wp-content/uploads/2025/11/Template-UP-ORIGINAL-Sistema-VISEC-MRV.xlsx` |
| **Template Registración Nueva Campaña UP** | XLSX | `https://www.visec.com.ar/wp-content/uploads/2025/11/Template-Registracion-Nueva-Campana-Unidades-Productivas.xlsx` |
| **Template Vinculación UP a Empresa** | XLSX | `https://www.visec.com.ar/wp-content/uploads/2025/11/Template-Vinculacion-Unidades-Productivas-a-Empresa.xlsx` |
| **INSTRUCTIVO Delimitación de Polígonos v1.0** | PDF | `https://www.visec.com.ar/wp-content/uploads/2026/05/VISEC-INSTRUCTIVO-Delimitacion-de-Poligonos-v1.0.pdf` |
| Solicitud de adhesión Visec MRV | PDF | `https://www.visec.com.ar/wp-content/uploads/2026/09/Solicitud-de-adhesion-Visec-MRV.pdf` |
| Preguntas Frecuentes VISEC Soja | PDF | `https://www.visec.com.ar/wp-content/uploads/2026/05/Preguntas-Frecuentes-VISEC-2025-1.pdf` |
| Preguntas Frecuentes VISEC Carne 2026 | PDF | `https://www.visec.com.ar/en/wp-content/uploads/2026/06/Preguntas_Frecuentes_VISEC_CARNE_2026-1.pdf` |
| Protocolo VISEC Carne | PDF | `https://www.visec.com.ar/wp-content/uploads/2026/05/PROTOCOLO-VISEC-CARNE-.pdf` |
| ABC del productor VISEC (Ago 2026) | PDF | `https://www.visec.com.ar/wp-content/uploads/2026/08/ABC-del-productor-VISEC-Ago-2026.pdf` |
| FAQ operativo BCR (v.051124) | PDF | `https://www.bcr.com.ar/sites/default/files/2024-08/visec_-_preguntas_frecuentes.pdf` |
| Términos y Condiciones MRV | PDF | `https://www.bcr.com.ar/sites/default/files/2024-06/terminos_y_condiciones_-_visec_mrv.pdf` |

Lo que **no** es público: el manual de usuario de la plataforma MRV (el enlace "Guía para miembros y usuarios" de `sistema-soja` apunta a `https://my.corebook.io/visec`, que es un **Manual de Marca**, no un manual operativo), y cualquier documentación de API.

---

## 3. Campos exigidos por lote / Unidad Productiva

### 3.1 Template oficial de alta (fuente autoritativa)

Transcripción **literal** de la fila 1, hoja `Unidades Productivas`, de `Template-UP-ORIGINAL-Sistema-VISEC-MRV.xlsx`. Son **16 columnas, A–P**, en este orden exacto:

| # | Nombre de campo literal | Tipo | Obligatorio | Fuente |
|---|---|---|---|---|
| A | `Número RENSPA` | string con máscara `00.000.0.00000/00` | Sí (clave) | Template XLSX; máscara vista en INSTRUCTIVO Polígonos p.9 |
| B | `Descripción Unidad Productiva` | texto libre | NO CONFIRMADO | Template XLSX |
| C | `Polígono` | string: lista de pares `(lat, lon)` en grados decimales (ver §5) | Sí | Template XLSX + INSTRUCTIVO Polígonos |
| D | `Punto Referencia` | string: un par `(lat, lon)` en grados decimales | Sí | Template XLSX + INSTRUCTIVO Polígonos |
| E | `Código Localidad` | código numérico de localidad **de ARCA/AFIP** | NO CONFIRMADO | Template XLSX; origen ARCA según ABC del productor §2 y FAQ BCR §7 |
| F | `Superficie` | numérico (hectáreas) | NO CONFIRMADO | Template XLSX; unidad inferida, no declarada literalmente |
| G | `Código Producto` | entero (catálogo; `23` = `Soja`) | Sí | Template XLSX, hoja `Productos` |
| H | `Código Campaña` | entero (catálogo 1–6) | Sí | Template XLSX, hoja `Campañas` |
| I | `Has Productivas` | numérico (hectáreas) | Sí | Template XLSX; es el campo que se actualiza por campaña |
| J | `PCUS1` | identificador de Plan de Cambio de Uso de Suelo | Condicional (solo Categoría III / verde) | Template XLSX; condición en FAQ Soja §4.2.3 |
| K | `PCUS2` | idem | Condicional | Template XLSX |
| L | `PCUS3` | idem | Condicional | Template XLSX |
| M | `CUIT Productor` | CUIT | Sí (clave de deduplicación) | Template XLSX; FAQ BCR §18 |
| N | `Razón Social Productor` | texto | NO CONFIRMADO | Template XLSX |
| O | `Código Tipo Sociedad Productor` | entero (catálogo 1–19) | NO CONFIRMADO | Template XLSX, hoja `Tipos Sociedad` |
| P | `Mail Contacto Productor` | email | Sí (dispara la notificación y el alta del productor) | Template XLSX; FAQ BCR §9 |

> **Discrepancia documentada**: la FAQ VISEC Soja §4.1.10 lista los mismos campos pero con un único `Plan de Cambio de Uso de Suelo` en lugar de `PCUS1/PCUS2/PCUS3`. El template XLSX (nov-2025) es posterior a la FAQ (v1.0 enero 2025), así que **el template manda**.

### 3.2 Catálogos embebidos en el template (transcripción literal)

Hoja `Productos`:

| `ID_Producto` | `Descripcion_Producto` |
|---|---|
| 23 | Soja |

Hoja `Campañas`:

| `ID_Campaña` | `Descripcion_Campaña` |
|---|---|
| 1 | 21/22 |
| 2 | 22/23 |
| 3 | 23/24 |
| 4 | 24/25 |
| 5 | 25/26 |
| 6 | 26/27 |

> En `Template-Registracion-Nueva-Campana-Unidades-Productivas.xlsx` las mismas campañas figuran con guion (`21-22`, `22-23`, …) en lugar de barra. Inconsistencia real entre los dos templates oficiales.

Hoja `Tipos Sociedad`:

| `ID_TipoSociedad` | `Descripcion_TipoSociedad` |
|---|---|
| 1 | Sociedad Anónima |
| 2 | Sociedad de Responsabilidad Limitada |
| 3 | Sociedad Civil |
| 4 | Cooperativa |
| 5 | Persona Física/Unipersonal |
| 6 | Sociedad de Hecho |
| 7 | Capital e Industria |
| 8 | Colectiva |
| 9 | Comandita Acciones |
| 10 | Sociedad en Comandita Simple |
| 11 | Agrupacion de Colab. |
| 12 | U.T.E |
| 13 | Fideicomiso |
| 14 | Fundacion |
| 15 | Sucesion Indivisa |
| 16 | Mutual |
| 17 | Sociedad Extranjera Sucursal |
| 18 | Sociedad Informal |
| 19 | Sociedad Anónima Unipersonal |

Hoja `Localidades`: **está vacía**. En `Template-UP-ORIGINAL` sólo contiene la celda `B1 = "Tabla depurada"`; en `Template-Registracion-Nueva-Campana` contiene sólo el encabezado `ID_Localidad | Descripcion_Localidad` con una fila de relleno (`1 | aaaaaa`). **El catálogo real de localidades no se publica con el template.** Ver Huecos.

### 3.3 Los otros dos templates

`Template-Registracion-Nueva-Campana-Unidades-Productivas.xlsx`, hoja `Unidades Productivas` — **5 columnas**:

| `Número RENSPA` | `ID UP VISEC` | `Código Producto` | `Campaña` | `Has Productivas` |
|---|---|---|---|---|

`Template-Vinculacion-Unidades-Productivas-a-Empresa.xlsx`, hoja `Unidades Productivas` — **1 columna**:

| `Número RENSPA` |
|---|

Esto confirma el ciclo de vida en tres operaciones distintas:
1. **Vinculación** — consultar/enlazar UPs ya cargadas por otro operador (solo RENSPA).
2. **Alta** — cargar la UP completa por primera vez (16 campos).
3. **Nueva campaña** — actualizar sólo `Has Productivas` + `Campaña` (+ `Código Producto`) contra el `ID UP VISEC` ya existente.

El Anexo 8 (Declaración Jurada) lo confirma desde el lado legal:

> "Para permitir la actualización de las unidades productivas ya declaradas en la plataforma para campañas subsiguientes, mediante la modificación solo de los datos relacionados a **Número RENSPA (o ID UP VISEC), Código Producto, Campaña, Has Productivas**."

---

## 4. Campos exigidos por operador / productor

### 4.1 Operador comercial — formulario "Solicitud de Adhesión al Sistema MRV - VISEC"

Transcripción literal de los rótulos del PDF:

**Encabezado**: representación de (razón social), `Nro. de C.U.I.T`, `domicilio fiscal`, `teléfono`.

**Bloque `OPERADOR - HABILITADO SISTEMA MRV - VISEC`**:

| Campo literal | Tipo / valores |
|---|---|
| `Razón Social` | texto |
| `CUIT` | CUIT |
| `Tipo de Sociedad` | ej. `Sociedad Anónima` |
| `Actividad AFIP` | opciones impresas: `Operador con Planta`, `Operador sin Planta`, `Canjeador`, `Certificadora`, `Corredor` |
| `¿Posee también actividad productor?` | `SI` / `NO` |
| `Dirección Fiscal`: `Dirección`, `Código Postal`, `Provincia`, `Localidad` | texto |
| `Dirección Postal`: `Dirección`, `Código Postal`, `Provincia`, `Localidad` | texto |
| `Correo electrónico de referencia` | email |
| `Teléfono de contacto` | teléfono |
| `¿Es miembro de INCAGRO?` | `SI` / `NO` |
| `Adjunto archivo digital Anexo de declaración de plantas – Visec` | `SI` / `NO` |

**Bloque repetible `PLANTA / SUCURSAL HABILITADA (n) SISTEMA MRV – VISEC`**:

| Campo literal | Tipo / nota |
|---|---|
| `Sucursal propia` / `Sucursal de terceros` | selección |
| `Planta / Sucursal` | texto |
| `Tipo Sucursal` | ej. `Acopio` |
| `Nro Ruca` | Registro Único de Operadores de la Cadena Agroindustrial |
| `Nro LOT AFIP` | — |
| `Domicilio`, `Código Postal`, `Provincia`, `Localidad` | texto |

Nota literal del formulario:
> "Si el tipo de sucursal es puerto, debe completarse al menos un Nro Ruca asociado a cada Nro LOT AFIP"

**Usuarios** (Anexo 9 §1.3):
> "Deben declararse también los USUARIOS que operarán dentro del sistema (con **nombre, apellido, CUIL y mail**)"

**Identificación del sitio** (Anexo 9 §1.2):
> "el sitio se identifica y define según el **Registro Único de Operadores de la Cadena Agroindustrial (RUCA)**"

### 4.2 Productor (módulo Soja)

El productor **no se da de alta a sí mismo**. Sus datos entran dentro del template de UP (columnas M–P: `CUIT Productor`, `Razón Social Productor`, `Código Tipo Sociedad Productor`, `Mail Contacto Productor`). Luego:

> "Los productores recibirán una notificación por mail con instrucciones para generar sus credenciales de acceso al sistema. Deberán corroborar y autorizar la información declarada mediante la aceptación de los términos y condiciones de uso del Sistema MRV [...] Luego de aceptar los Términos y Condiciones, se le despliega una segunda ventana, que corresponde a la 'Declaración Jurada' de VISEC" (FAQ Soja §4.1.9)

Pie de la Declaración Jurada (Anexo 8), campos literales:
> `El Sr/Sra. ___________, CUIL _____________ perteneciente a la Razón Social_______________, CUIT______________________ ha aceptado la presente el día ___________ a la hora _____.`

### 4.3 Reglas de unicidad y colisión (muy relevante para nuestro exportador)

- **Deduplicación por `CUIT` + `RENSPA`, no por geometría**:
  > "La duplicidad de Unidades Productivas dentro del sistema estará dada por el **CUIT y RENSPA** del productor y no por las coordenadas del polígono en sí mismo. De esta forma, si distintas compañías intentan dar de alta una misma Unidad Productiva, el sistema detectará e informará que dicha Unidad Productiva ya se encuentra cargada dentro del sistema, **a pesar de que el polígono difiera**." (FAQ BCR §18)
- **Gana el primero que carga**:
  > "Los datos que quedan registrados en una unidad productiva son los que se ingresaron en primera instancia por el primer operador que carga una unidad productiva." (FAQ BCR §4)
- **Un polígono por RENSPA en esta etapa**:
  > "En esta etapa del sistema se solicitará que para cada Unidad Productiva dada de alta en el sistema se cargue **un polígono vinculado con un número de RENSPA**." (FAQ BCR §6)
- Una UP puede vincularse a varios operadores; el productor no queda cautivo de quien la dio de alta (FAQ Soja §4.1.11; FAQ BCR §1).

---

## 5. Formato del polígono — el dato más importante del documento

Fuente primaria: **`VISEC-INSTRUCTIVO-Delimitacion-de-Poligonos-v1.0.pdf`**, secciones 5 a 9. Transcripción literal:

> **5 — Cambio de unidad de medida**
> "El Sistema VISEC, requerirá la carga de coordenadas en la unidad **GD (Grados Decimales)**"

> **7 — Concatenar los puntos**
> "Cada punto: **latitud y longitud** –ambos números negativos y sin el signo grado '°'- entre paréntesis y separados internamente con coma ',' por ejemplo, `(-33.49588, -64.00623)`
> Entre puntos: separar cada punto por una coma ',' por ejemplo, `(-33.49588, -64.00623), (-33.49846, -64.00620),`
> El polígono completo quedará conformado por **al menos 4 puntos, donde el último punto tendrá que ser igual al primer punto informado**. Para el caso de un polígono de 4 puntos, se informarán 5 puntos totales."

Fila de ejemplo, transcripta literal de la p.9 del instructivo:

| `Número RENSPA` | `Descripción Unidad Productiva` | `Polígono` | `Punto Referencia` |
|---|---|---|---|
| `00.000.0.00000/00` | `NOMBRE DE LA UNIDAD PRODUCTIVA` | `(-33.49588, -64.00623), (-33.49846, -64.00620), (-33.49846, -63.99737), (-33.49580, -63.99731), (-33.49588, -64.00623)` | `(-24.443438, -62.818854)` |

### Reglas derivadas para nuestro serializador

1. **Orden `(latitud, longitud)`** — es el **inverso** de GeoJSON, que usa `[lon, lat]`. Este es el error más probable de una integración ingenua y, en Argentina (lat ≈ -22..-55, lon ≈ -53..-73), no siempre falla ruidosamente. Hay que invertir explícitamente y testear.
2. **Grados decimales, signo negativo, sin símbolo `°`**.
3. **Anillo cerrado**: último vértice idéntico al primero.
4. **Mínimo 4 vértices distintos** (5 emitidos).
5. **Separador**: `", "` entre pares y `", "` dentro del par; paréntesis por punto.
6. **`Punto Referencia` es un campo aparte**, un solo par `(lat, lon)`; el instructivo lo obtiene de las propiedades del polígono en Google Earth Pro (pestaña "Ver"), es decir el **centro de vista**, no necesariamente el centroide geométrico.
7. Sin anillos interiores, sin multipolígonos: la sintaxis no los admite.

**NO CONFIRMADO**: sistema de referencia / datum declarado (se infiere WGS84 por el uso de Google Earth Pro, pero ningún documento lo enuncia); cantidad máxima de vértices; cantidad de decimales exigida; sentido de giro (horario/antihorario); tolerancia de auto-intersección. El ABC del productor sí advierte el síntoma:

> "El bloqueo más común es la carga del polígono. **Errores de geometría o ángulos abiertos generan rechazo automático del análisis satelital.**"

---

## 6. Vías de carga: archivo, web y API

### 6.1 Carga por archivo — CONFIRMADA

- **Formato**: **Excel (.xlsx)**, usando uno de los tres templates oficiales. Es carga masiva (una fila por UP).
- **Flujo**: se completa el template y se carga en la plataforma MRV.
  > "B- **Carga del archivo Excel en el Sistema VISEC**" (INSTRUCTIVO Polígonos §9)
- **NO se acepta** shapefile, KML/KMZ ni GeoJSON como entrada. No hay una sola mención de esos formatos como vía de ingreso en ninguno de los documentos revisados; el único formato geoespacial mencionado (GeoJSON) aparece siempre como **salida**.

### 6.2 Plataforma web — CONFIRMADA

| Módulo | URL | Stack observado |
|---|---|---|
| VISEC Soja (MRV) | `https://mrvvisec.com.ar/` (staging: `https://stg.mrvvisec.com.ar`) | SPA con **MSAL.js 3.27.0** contra **Azure AD B2C** |
| VISEC Carne | `https://carne.visec.com.ar/Identity/Account/Login` | ASP.NET Core Identity + **Blazor Server**; registro público en `/Public/Registro` |

`https://soja.visec.com.ar/` es sólo un redirect HTML (`<META HTTP-EQUIV="refresh">`) hacia `https://stg.mrvvisec.com.ar` — sirve de atajo pero apunta a **staging**, no a producción. No usarlo.

Parámetros OAuth2 del botón "acceder al sistema" de `sistema-soja` (transcriptos literal del HTML):

```
https://visecb2c.b2clogin.com/visecb2c.onmicrosoft.com/b2c_1a_signin_tou_visec_prd/oauth2/v2.0/authorize
  client_id=9d48a4b9-9d89-4aa8-a1a0-9c52d70dda97
  scope=openid https://visecb2c.onmicrosoft.com/visec-webapp-api-backend/api_invoke profile offline_access
  redirect_uri=https://mrvvisec.com.ar/
  response_type=code
  code_challenge_method=S256
  ui_locales=es
```

**Nota operativa**: `mrvvisec.com.ar` no pudo abrirse desde esta máquina porque **la red corporativa local (Cloudflare Gateway de NaranjaX) lo bloquea** — el certificado devuelto es `Gateway CA - Cloudflare Managed G1` y el redirect final es `blocked.teams.cloudflare.com`. **No es un problema de VISEC.** Hay que probarlo desde otra red.

### 6.3 API — NO HAY API PÚBLICA DOCUMENTADA

Esto es una conclusión negativa firme, no una omisión. Evidencia:

- Ni el Protocolo, ni los Anexos, ni las FAQ, ni los Términos y Condiciones del MRV mencionan un endpoint, credencial o documentación de API para operadores.
- La página de BCR del servicio Visec MRV no menciona API ni integración de sistemas.
- `carne.visec.com.ar/swagger/index.html` y `/swagger/v1/swagger.json` devuelven **404**.

Lo que **sí** existe, y es importante no confundir:

1. **Un backend API privado de la propia SPA**: el scope `https://visecb2c.onmicrosoft.com/visec-webapp-api-backend/api_invoke` demuestra que hay una API REST detrás de `mrvvisec.com.ar` protegida por Azure AD B2C. No está publicada ni documentada, y su uso por terceros no está ofrecido.
2. **APIs de VISEC hacia sus proveedores satelitales** (entrada de indicadores, no de datos de lote):
   > "Tanto la respuesta a los indicadores como las evidencias serán enviadas a VISEC **a través de una integración vía API entre ambos sistemas**" (Anexo 1 §5; equivalente en Protocolo Carne)
3. **APIs de integración con plataformas agtech, en evaluación desde 2024**:
   > "Las empresas con las que se realizó un NDAs (non-disclosure agreements) son **Integra Labs, Ucrop.it, VEGA y TSA**. Dicha firma se realizó para salvaguardar en ambos sentidos la información de los sistemas **mientras se evalúan y desarrollan las API's de integración**. Esta firma no es un convenio y/o contrato comercial entre partes por lo que no definen los proveedores a utilizar." (FAQ BCR §15, v.051124)

**Este último punto es la vía de acceso concreta para Lote Limpio**: existe un precedente formal (NDA + evaluación de API) para que una plataforma de terceros se integre. El canal es `visec-mrv@bcr.com.ar`.

### 6.4 Salidas del sistema (lo que VISEC produce)

Protocolo §9.4, literal — el Sistema MRV emite cuatro artefactos:

> - "Informe del Auditor, Importador y Autoridad Competente"
> - "Informe del Exportador"
> - "**Geoinformación en formato GeoJSON**"
> - "Certificado de Producto Libre de Deforestación (CLD)"

Sobre el GeoJSON, literal:
> "**Geoinformación en formato GeoJSON**: Debe ser cargada en el Sistema de Información de la UE, recopilando todas las unidades productivas (**ID, país y coordenadas del polígono**)"

Y sobre la anonimización en el informe del exportador:
> "En el suministro indirecto, el sistema encripta la información, y el informe reemplazará el nombre del productor y el RENSPA por el **ID VISEC**"

El Anexo 5 (`VISEC COMPLIANCE CERTIFICATE FOR EUDR REQUIREMENTS`) incluye un `Annex 1 – Participating volumes` cuya tabla tiene exactamente estas columnas:

| `N°` | `ID VISEC` | `Country` | `Coordinates` |
|---|---|---|---|

---

## 7. Diferencias entre módulo Soja y módulo Carne

| Dimensión | **VISEC Soja** | **VISEC Carne** |
|---|---|---|
| Administra | Bolsa de Comercio de Rosario | VISEC Asociación Civil |
| Plataforma | `mrvvisec.com.ar` (Azure AD B2C) | `carne.visec.com.ar` (ASP.NET Identity + Blazor) |
| **Quién carga la UP** | El **operador comercial** (acopio, corredor, cooperativa, exportador, molienda, Bolsas). El productor **no** se registra solo. | **El propio productor** gestiona su alta y registra sus datos. |
| Alta de operador | Formulario PDF → email a `visec-mrv@bcr.com.ar` → firma digital → credenciales | Autogestión online en 5 pasos |
| Carga masiva | Sí, templates XLSX | NO CONFIRMADO (no se encontró template público) |
| ¿Certifica? | Sí, vía OV: **Certificado de Conformidad de Instalaciones** (3 años) + **CLD por embarque** | **No.** "no extiende certificados a productores ni establecimientos". Los campos no se certifican; se verifican sitios de almacenamiento y embarque. |
| Auditoría de tercera parte | Obligatoria (habilitante + seguimiento anual + por embarque) | Sólo sobre el exportador/frigorífico |
| Integración con registros oficiales | Sin integración en línea con SENASA/AFIP al momento de la FAQ BCR | **Sí**: tokens **SIGSA** (movimientos de hacienda / DT-e), **SIGICA** y **SIGCER**; más ARCA, REPSAL, INAI |
| Datos adicionales | — | Movimientos de hacienda (DT-e) vía token SIGSA; declaración sobre uso de soja en la dieta animal |
| Costo para el productor | Gratuito. Lo pagan los exportadores. | Gratuito. Análisis satelital gratuito si se inscribe **antes del 30/06/2026**; después, ciclo 2027 sin costo o costo individual. |
| Capas de bosque usadas | JRC, GLAD/Hansen, **MapBiomas Chaco 4.0**, Global Forest Watch, OTBN | Global Forest Watch, Hansen, **MapBiomas Chaco 5.0** |
| Indicadores | **2 condiciones**: A) Legalidad (Ley 26.331 + SiFAP) y B) Libre de deforestación post-31/12/2020 | Sólo el indicador de libre de deforestación post-31/12/2020 (legalidad se resuelve por cruce con bases públicas) |
| Umbral de detección | "Cualquier superficie de bosques deforestada es considerada deforestación" | "6 o más pixeles deforestados conectados espacialmente (de manera de que la superficie afectada sea mayor a media hectárea)" |
| Ventana de análisis | Análisis inicial al alta + anual al inicio de cada campaña | Anual, período 1 de julio → 30 de junio; procesamiento en bloque julio–agosto |
| Silvopastoriles | — | Explícitamente **no** son bosque si son anteriores al 31/12/2020 (Considerando 37 EUDR) |

Punto de cruce entre módulos (relevante si un cliente hace ambas cosas):
> "si la hacienda destinada al mercado europeo consume balanceados con soja o ingiere soja producida en el propio establecimiento, esa soja debe cumplir con los requisitos del Reglamento [...] la soja de producción propia **debe estar validada en VISEC Soja**." (FAQ Carne §16)

---

## 8. Relación con RENSPA, SISA/ARCA y TRACES/EUDR

### RENSPA (SENASA)
- Es **el identificador primario** de la UP en VISEC. Codificación `00.000.0.00000/00` (provincia/partido, establecimiento, productor).
- Un establecimiento catastral puede contener varios RENSPA (uno por productor); difieren en los **últimos 2 dígitos**.
- Los propietarios de campos arrendados **no tienen RENSPA** — lo tiene quien explota (Protocolo §6.1). Importante para nuestro onboarding.
- **SENASA Res. 1332/2024** habilita al productor inscripto en RENSPA a compartir su información productiva (incluidos **los polígonos de los lotes declarados bajo producción con su respectivo número de RENSPA**) con las personas jurídicas inscriptas en el Directorio de Esquemas de Diferenciación. Se activa con la opción "Compartir datos" en los servicios de SENASA y se revierte con "Dejar de compartir".

### SISA / ARCA (ex AFIP)
- **ARCA RG 5.594/2024** (24/10/2024) establece el procedimiento para que el productor comparta información productiva del SISA con entidades del Directorio. Citada así en la Disposición DI-2025-1-APN-SSMAEII#MEC.
- **Discrepancia**: la FAQ VISEC Soja §4.1.12 atribuye esto a la *"Resolución General N° 5533/2024 de AFIP"*. La Disposición oficial cita **5.594/2024**. **No pude confirmar cuál es correcta**; lo más probable es un error de tipeo en la FAQ, pero queda registrado.
- Lo que dice la FAQ, literal:
  > "se habilitará la opción para que el productor pueda compartir de forma voluntaria algunos datos del módulo de 'Información Productiva' del SISA de modo tal de evitar la duplicidad de la carga de datos. **Ningún tipo de información vinculada al secreto fiscal será recibida por VISEC.**"
- Estado al momento de la FAQ operativa de BCR (v.051124): **sin integración en línea**.
  > "en esta primera instancia fue descartada la posibilidad de tener una integración directa con SENASA y/o AFIP y, por lo tanto, no tenemos una posibilidad de validación en línea con los datos que se suban a nivel de código de RENSPA."
  > "En esta primera instancia no hay integraciones con SENASA o AFIP, por lo que toda la información que se cargue dentro del sistema será la que brinde el productor a través de los operadores comerciales de la cadena."
- Lo que sí valida VISEC: coherencia entre el código de departamento/provincia embebido en el RENSPA (SENASA) y el `Código Localidad` (ARCA).
- `Código Producto` y `Código Localidad` provienen de **ARCA** (ABC del productor §2: "Código de Producto (ARCA) y campaña", "Localidad (ARCA)").

### TRACES / Sistema de Información de la UE
- **No hay integración automática.** VISEC **genera un archivo GeoJSON** que se descarga y que el **operador europeo (importador)** sube al sistema de la UE. Literal (Protocolo Carne §4):
  > "descargar la información en formato GeoJSON de los polígonos de cada establecimiento involucrado en el proceso de exportación **para elevar al sistema Traces de la UE**."
- El responsable legal de la DDS ante la UE es el **importador europeo**, no el productor argentino (arts. 4 y 8 del Reglamento).
- Regla del 200% de mezcla en silos: VISEC agrega al informe del auditor los polígonos excedentes de toda la mercadería que convivió en el sitio. Esa información **sólo la recibe el auditor**; el importador o la autoridad competente la obtienen **previa solicitud a `visec-mrv@bcr.com.ar` y firma de NDA**.
- Equivalencias: existe un **Acuerdo de Reconocimiento VISEC–2BSvs para EUDR** (julio 2025). Para habilitación de plantas, VISEC admite equivalencia con **ISCC, RFS II (EPA) y 2BSvs** — pero **no** para la capacitación de auditores.

---

## 9. Cómo se obtiene acceso: registro, contactos, verificadores, plazos

### 9.1 Contactos institucionales (verificados en `visec.com.ar/contacto/` y ABC del productor)

| Canal | Destino |
|---|---|
| `contacto@visec.com.ar` | Consultas generales / institucional / bajas |
| `visec-mrv@bcr.com.ar` | **Mesa de soporte VISEC Soja — el canal operativo real** |
| `carne@visec.com.ar` | VISEC Carne (incl. eliminación de datos, art. 16 Ley 25.326) |
| `comunicacion@visec.com.ar` | Cursos, talleres y capacitación |
| Teléfono BCR | `(+54) (0341) 0800-999-3476` — Opción 0 |
| WhatsApp BCR | `https://api.whatsapp.com/send?phone=5493412175778` |
| Domicilio BCR | Edificio Armonía — Corrientes 730, Rosario |
| YouTube / LinkedIn | `@VISECArgentina` / *Vision Sectorial del Gran Chaco Argentino VISEC* |

Formulario de contacto web — campos: `Nombre completo` (req.), `Organización` (req.), `Correo electrónico` (req.), `Motivos de consulta` (desplegable: Consulta general / Sistema soja / Sistema carne / Cursos y talleres / Reclamos), `¿Cómo podemos ayudarte?`.

### 9.2 Alta como operador comercial en VISEC Soja (4 pasos, fuente `adherite-a-visec` + FAQ Soja §4.1)

1. Descargar y completar el **Formulario de Alta** (`Solicitud-de-adhesion-Visec-MRV.pdf`) con datos de la empresa, plantas/sucursales y usuarios responsables.
2. Enviarlo **adjunto por email a `visec-mrv@bcr.com.ar`**. "alguien del equipo se comunicará para avanzar con la **firma digital**".
3. Recibir mail de confirmación → generar credenciales → aceptar Términos y Condiciones del Sistema MRV.
4. Cargar unidades productivas con los templates XLSX.

**Capacitación obligatoria** (Protocolo §7.2; Anexo 9 §2.1): al menos **1 persona por planta/sucursal** debe aprobar el **"Curso de Operadores VISEC"**, disponible en el **Centro de Educación a Distancia de la FAUBA** o en la plataforma **INCAGRO** (Federación de Acopiadores + CONINAGRO). Inscripción FAUBA vía `https://forms.gle/Ci8SirqP6Jg2cJcN8`. Hay que presentar el certificado de finalización.

**Figura relevante para Lote Limpio** — "Operadores Facilitadores de carga de Unidades Productivas" (Protocolo §7.1):
> "VISEC podrá disponer como **Operadores Facilitadores de carga de Unidades productivas (UP)**, a miembros relevantes de la cadena de la soja como ser operadores de servicios de corretajes de cereales. Estos miembros podrán operar **exclusivamente en la carga de Unidades productivas**."
> "estos deberán completar un curso online de carga en el sistema MRV de VISEC y aceptar los términos y condiciones para operar, ser habilitados y otorgarles la **clave de acceso exclusiva a dicho módulo de carga de UP**."

Es el rol más cercano a lo que haría una herramienta como la nuestra operando en nombre de productores. **Vale preguntar explícitamente por esta figura al escribir a `visec-mrv@bcr.com.ar`.**

### 9.3 Alta del productor

- **Soja**: pasivo. El operador comercial lo precarga → le llega mail → genera credenciales → acepta TyC + Declaración Jurada (Anexo 8).
- **Carne**: activo, online, 5 pasos en `https://carne.visec.com.ar/Identity/Account/Login`:
  1. Registrar empresa con perfil "Productor"
  2. Cargar CUIT y razón social (el sistema consulta automáticamente los RENSPA asociados)
  3. Seleccionar los RENSPA con los que va a operar
  4. Validar el correo con código de seguridad
  5. Firmar la Declaración Jurada y **cargar los polígonos**
  > "El procedimiento no supera los 5 minutos si se tienen a mano los datos básicos. Adicionalmente, **SENASA capacitó al personal de sus oficinas en todo el país** para brindar asistencia en la carga correcta del polígono asociado al RENSPA"

### 9.4 Organismos de Verificación (OV)

Requisitos (Protocolo §10): acreditación **ISO/IEC 17065** vigente, solicitud formal al Secretariado de VISEC, independencia y ausencia de conflicto de interés, SGC con registro de auditores, auditorías conforme **ISO 19011**. Los auditores deben pertenecer a un OV con ≥2 años de trayectoria y aprobar el **"Curso de Auditores VISEC"** (no se admite equivalencia con ISCC / EPA-RFS II / 2BSvs). Recalificación cada 3 años.

Proceso de acreditación publicado en `sistema-soja`, literal:
1. "Envío de documentación pertinente para el registro y la habilitación del organismo"
2. "Realización del 'Curso de Auditores VISEC'"
3. "Alta de auditores en sistema y entrega de Certificado de Compliance para esquema VISEC"

**El listado público de OV habilitados NO está publicado** al 2026-09-12, pese a que el Protocolo §10.2 dice que lo estará ("VISEC mantendrá una lista actualizada de los Organismos de Verificación reconocidos, la cual estará a disposición del público en la web oficial"). Busqué en `/centro-de-recursos-visec/`, `/sistema-soja/`, `/viseccarne/`, la home, y vía la API de búsqueda de WordPress del sitio (`/wp-json/wp/v2/search?search=organismo de verificacion` y `?search=verificacion`): ninguna página lista OVs. **Único OV identificado por evidencia indirecta**: **Control Union Argentina**, que publica VISEC como programa de certificación propio en `argentina.controlunion.com`.

### 9.5 Plazos que importan

| Fecha | Hito | Fuente |
|---|---|---|
| **31/12/2020** | Fecha de corte de deforestación | EUDR / Protocolo |
| **30/06/2026** | Cierre del bloque de UP para el análisis satelital gratuito de **VISEC Carne** | FAQ Carne §14; ABC §7 |
| Jul–ago 2026 | Procesamiento satelital en bloque (Carne) | ABC del productor §7 |
| Sep 2026 | Corrección de inconsistencias y ajuste de polígonos (Carne) | ABC del productor §7 |
| Oct–nov 2026 | Faena con destino UE | ABC del productor §7 |
| **30/12/2026** | Entrada en vigor plena del EUDR (grandes y medianas empresas) | FAQ Carne §1 |
| 2027 | Siguiente ciclo de análisis en bloque sin costo (Carne) | ABC §7 |

Plazos de habilitación/auditoría: Certificado de Conformidad de Instalaciones válido **3 años**, con auditoría de seguimiento **anual** (ventana de 60 días). No conformidades mayores: **30 días corridos** para resolver, prorrogables 30 más con consentimiento de VISEC. En embarques **no se admiten** no conformidades menores ni mayores: toda no conformidad es crítica y anula el embarque.

---

## 10. Huecos — lista explícita de lo NO CONFIRMADO

1. **Obligatoriedad campo por campo.** Los templates XLSX no marcan obligatorios ni tienen `dataValidation` ni comentarios de celda (lo verifiqué parseando el XML del paquete OOXML). Ningún documento publica una tabla de obligatoriedad. Las marcas "Sí" de la tabla §3.1 son inferencias de los flujos descriptos, no del template. **Qué busqué**: `dataValidation`, comentarios, hojas ocultas en los 3 XLSX; Protocolo, Anexos, FAQ Soja, FAQ BCR, instructivo de polígonos.
2. **Catálogo de `Código Localidad`.** La hoja `Localidades` de ambos templates está vacía (`"Tabla depurada"` / `1 | aaaaaa`). Se sabe que son códigos de ARCA validados contra departamento/provincia del RENSPA, pero **no está publicado el mapeo**. Habrá que pedirlo a `visec-mrv@bcr.com.ar` o derivarlo del padrón de localidades de ARCA.
3. **Sistema de referencia / datum del polígono.** Se infiere WGS84 (Google Earth Pro), pero ningún documento lo declara. Tampoco hay especificación de decimales, cantidad máxima de vértices, sentido de giro ni tolerancia de auto-intersección.
4. **Unidad de `Superficie` y diferencia con `Has Productivas`.** Se infiere hectáreas. La relación exacta (`Superficie` = superficie total del polígono vs. `Has Productivas` = superficie sembrada de la campaña) es plausible pero **no está definida literalmente** en ninguna fuente.
5. **Formato de `ID UP VISEC`.** Aparece como columna del template de nueva campaña y como identificador anonimizado en los informes, pero no hay especificación de su forma (longitud, prefijo, alfanumérico).
6. **Formato de los campos `PCUS1/2/3`.** No se define si es número de expediente, número de registro provincial, o un adjunto. El Protocolo dice "número de Registro habilitante del Permiso de Cambio de Uso de Suelo".
7. **API pública**: no existe documentación. Confirmado por ausencia en todos los documentos + 404 en `/swagger/*` de `carne.visec.com.ar`. El backend privado (`visec-webapp-api-backend`) existe pero no está ofrecido a terceros. **No pude verificar** si las "API's de integración" mencionadas en la FAQ BCR de nov-2024 llegaron a liberarse.
8. **Carga masiva en VISEC Carne**: no encontré template XLSX ni instructivo de carga masiva. El registro es Blazor Server (sin formulario HTML estático inspeccionable), así que no pude extraer su esquema de campos sin crear una cuenta — cosa que no hice deliberadamente.
9. **Listado público de Organismos de Verificación habilitados**: no publicado (ver §9.4). Control Union Argentina es el único identificado, y por su propia web, no por una lista de VISEC.
10. **Arancel del Sistema MRV Soja.** La FAQ dice que lo pagan los exportadores ("Los exportadores de soja y productos derivados deben solventar los gastos asociados al mantenimiento y uso de la plataforma") pero **no hay tarifario publicado**.
11. **Discrepancia normativa ARCA**: FAQ Soja cita `RG 5533/2024`; la Disposición oficial cita `RG 5.594/2024`. No resuelta.
12. **Estado actual de la integración SENASA/ARCA.** La evidencia de "sin integración en línea" es de la FAQ BCR **v.051124** (noviembre 2024). Con Res. SENASA 1332/2024 y RG ARCA 5594/2024 ya vigentes, es probable que haya cambiado, pero **no encontré documento posterior que lo confirme**.
13. **`mrvvisec.com.ar` no inspeccionado.** Bloqueado por la política de red local (Cloudflare Gateway de NaranjaX), no por VISEC. No pude verificar la UI de carga, los mensajes de validación, ni si la plataforma acepta otros formatos además de XLSX.
14. **Comportamiento ante polígonos que se solapan entre RENSPA distintos**: la deduplicación es por CUIT+RENSPA y explícitamente *no* por geometría, pero no hay documentación sobre qué pasa si dos polígonos de RENSPA distintos se superponen.

---

## 11. Implicancias directas para Lote Limpio

1. **Nuestra exportación primaria debe ser el XLSX `Template-UP-ORIGINAL-Sistema-VISEC-MRV`, no GeoJSON.** GeoJSON es la salida de VISEC hacia la UE, no la entrada.
2. **Serializador de polígono**: orden `(lat, lon)`, grados decimales, anillo cerrado, separador `", "`. Invertir respecto de GeoJSON. Test de regresión obligatorio en este punto.
3. **El modelo de datos necesita RENSPA como clave externa de primera clase**, con validación de máscara `00.000.0.00000/00`, y agrupación N-lotes → 1 RENSPA → 1 polígono.
4. **Hay que capturar `CUIT Productor` y `Mail Contacto Productor`**: son los que disparan la deduplicación y la notificación de alta del productor.
5. **Validar geometría antes de exportar** (anillo cerrado, sin auto-intersección, ≥4 vértices distintos): el rechazo por "ángulos abiertos" es el bloqueo más frecuente documentado.
6. **Trámite a iniciar ya**: escribir a `visec-mrv@bcr.com.ar` preguntando por (a) la figura de **Operador Facilitador de carga de UP**, (b) el catálogo de `Código Localidad`, (c) el estado de las **API's de integración** mencionadas en la FAQ de nov-2024 y el precedente de NDA con Integra Labs / Ucrop.it / VEGA / TSA.

---

## Fuentes

Todas verificadas con HTTP 200 y content-type correcto el **2026-09-12**.

**VISEC — sitio oficial y documentos**
1. https://www.visec.com.ar/ — home (200, text/html)
2. https://www.visec.com.ar/sistema-soja/ — módulo Soja, templates y pasos de alta (200)
3. https://www.visec.com.ar/viseccarne/ — módulo Carne (200)
4. https://www.visec.com.ar/centro-de-recursos-visec/ — centro de descargas (200)
5. https://www.visec.com.ar/contacto/ — canales de contacto (200)
6. https://www.visec.com.ar/adherite-a-visec/ — pasos de adhesión por categoría (200)
7. https://www.visec.com.ar/tutorial-para-delimitar-poligonos-en-google-earth-pro/ (200)
8. https://www.visec.com.ar/wp-content/uploads/2025/12/Protocolo-VISEC-NUEVA-VERSION-NOVIEMBRE-2025.pdf — Protocolo VISEC SLD, nov-2025 (200, PDF)
9. https://www.visec.com.ar/wp-content/uploads/2025/12/ANEXOS-_-Protocolo-VISEC-Noviembre25-.pdf — Anexos 1 a 9 (200, PDF)
10. https://www.visec.com.ar/wp-content/uploads/2025/11/Template-UP-ORIGINAL-Sistema-VISEC-MRV.xlsx (200, XLSX) — **fuente del esquema de 16 campos**
11. https://www.visec.com.ar/wp-content/uploads/2025/11/Template-Registracion-Nueva-Campana-Unidades-Productivas.xlsx (200, XLSX)
12. https://www.visec.com.ar/wp-content/uploads/2025/11/Template-Vinculacion-Unidades-Productivas-a-Empresa.xlsx (200, XLSX)
13. https://www.visec.com.ar/wp-content/uploads/2026/05/VISEC-INSTRUCTIVO-Delimitacion-de-Poligonos-v1.0.pdf (200, PDF) — **fuente del formato de polígono**
14. https://www.visec.com.ar/wp-content/uploads/2026/09/Solicitud-de-adhesion-Visec-MRV.pdf (200, PDF) — formulario de alta de operador
15. https://www.visec.com.ar/wp-content/uploads/2026/05/Preguntas-Frecuentes-VISEC-2025-1.pdf — FAQ VISEC Soja v1.0 enero 2025 (200, PDF)
16. https://www.visec.com.ar/en/wp-content/uploads/2026/06/Preguntas_Frecuentes_VISEC_CARNE_2026-1.pdf — FAQ VISEC Carne 2026 (200, PDF)
17. https://www.visec.com.ar/wp-content/uploads/2026/05/PROTOCOLO-VISEC-CARNE-.pdf (200, PDF)
18. https://www.visec.com.ar/wp-content/uploads/2026/08/ABC-del-productor-VISEC-Ago-2026.pdf (200, PDF)
19. https://www.visec.com.ar/wp-content/uploads/2026/05/disposicion22enero2025registrooficialvisec.pdf — DI-2025-1-APN-SSMAEII#MEC (200, PDF)

**Plataformas**
20. https://carne.visec.com.ar/Identity/Account/Login — login VISEC Carne (200)
21. https://carne.visec.com.ar/Public/Registro — registro público VISEC Carne, Blazor Server (200)
22. `https://mrvvisec.com.ar/` — plataforma MRV Soja. **No verificable desde esta red**: bloqueada por Cloudflare Gateway corporativo local (redirect a `blocked.teams.cloudflare.com`, cert `Gateway CA - Cloudflare Managed G1`).
23. `https://carne.visec.com.ar/swagger/index.html` y `/swagger/v1/swagger.json` — **HTTP 404** (evidencia de ausencia de API documentada)

**Bolsa de Comercio de Rosario**
24. https://www.bcr.com.ar/es/servicios/servicios-digitales/visec-mrv (200)
25. https://www.bcr.com.ar/sites/default/files/2024-08/visec_-_preguntas_frecuentes.pdf — FAQ operativo v.051124 (200, PDF) — **fuente sobre APIs y reglas de deduplicación**
26. https://www.bcr.com.ar/sites/default/files/2024-06/terminos_y_condiciones_-_visec_mrv.pdf (200, PDF)
27. https://www.bcr.com.ar/sites/default/files/2024-06/solicitud_de_servicios_-_visec_mrv.pdf (200, PDF)

**Normativa y organismos**
28. https://www.argentina.gob.ar/normativa/nacional/resoluci%C3%B3n-1332-2024-406008 — SENASA Res. 1332/2024 (200)
29. https://sifap.gob.ar/ — Sistema Federal de Áreas Protegidas (200)

**Comisión Europea y terceros**
30. https://environment.ec.europa.eu/document/download/a3c5c3a0-232e-43c4-b0b8-1eecb1df45c7_en?filename=Report+from+the+Commission+to+the+Council+and+Parliament+on+the+EUDR.pdf — COM(2026) 191 final, menciona VISEC (200, PDF)
31. https://www.2bsvs.org/wp-content/uploads/2025/07/VISEC-2BS-Acuerdo-de-Reconocimiento-EUDR-ES.pdf — Acuerdo de reconocimiento VISEC–2BSvs (200, PDF)
32. https://fefac.eu/wp-content/uploads/2025/06/VISECIDIGORASFEFACmay2025.pdf — presentación de Gustavo Idigoras (CIARA-CEC) ante FEFAC, mayo 2025 (200, PDF)
33. https://argentina.controlunion.com/en/certification-program/visec-traceability-platform-for-deforestation-free-soy-and-beef/ — Control Union Argentina como OV (200)
34. https://www.ciaracec.com.ar/ — CIARA-CEC (200)

**Dominios descartados** (verificados el 2026-09-12): `visec.ar` y `visecargentina.com` → no resuelven DNS. `soja.visec.com.ar` → 200 pero es sólo un meta-refresh hacia **staging** (`stg.mrvvisec.com.ar`), no usar.
