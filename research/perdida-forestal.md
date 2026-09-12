# Acceso a datos de pérdida de cobertura forestal

**Proyecto:** Lote Limpio — verificación de pérdida de cobertura arbórea posterior al 2020-12-31 dentro de polígonos de lotes, en el marco del Reglamento (UE) 2023/1115 (EUDR).

**Fecha de investigación:** 2026-09-12. Todas las URL citadas fueron verificadas con `curl` o `WebFetch` en esa fecha; el estado HTTP observado se indica junto a cada una.

**Alcance:** acceso a capas de pérdida forestal **ya calculadas por terceros**. No se evalúa detección propia sobre imágenes crudas.

---

## 1. Resumen de opciones

| Fuente | ¿Necesita credencial? | Latencia de alta | Licencia | Año final cubierto |
|---|---|---|---|---|
| **Hansen/UMD GFC — granules GeoTIFF vía HTTP range-read** (`storage.googleapis.com/earthenginepartners-hansen`) | **No** | Ninguna (acceso inmediato) | CC BY 4.0 (uso comercial explícitamente permitido) | **2025** (`GFC-2025-v1.13`) |
| **GFW Data API** (`data-api.globalforestwatch.org`) | **Sí** — API key, previa cuenta MyGFW vía Okta | Indeterminada: depende de un correo de Okta para fijar contraseña (ver §2) | CC BY 4.0 sobre el dato subyacente; términos del servicio: ver §7 | **2025** (`umd_tree_cover_loss` `v1.13`) |
| **GFW `/geostore` (sin key)** | No para crear el geostore; **sí** para consultarlo | Inmediata | Ídem | n/a (sólo registra geometría) |
| **GFW `/download/csv` sobre `gadm__tcl__*`** (agregados por provincia/departamento) | **No** | Inmediata | Ídem | **2025** (pinear `v20260424`, **no** `latest`) |
| **JRC Global Forest Cover 2020 (GFC2020) V3** — descarga directa FTP/HTTP | **No** | Ninguna | CC BY 4.0 (Decisión 2011/833/UE) | **2020** (mapa de estado, no serie anual) |
| **Zeno API / Global Nature Watch** (`api.globalnaturewatch.org`) | **Sí** — Bearer de usuario + cuota de prompts | No determinada | No publicada | 2025 (dataset_id 4) |
| **UMSEF / Ministerio de Ambiente (WFS)** | **No** | Ninguna (acceso inmediato) | **Ambigua**: el servicio declara `"Creative Conmons. Esta licencia es una licencia libre"`, sin variante ni versión (ver §7.4) | **2024** |

**Recomendación operativa derivada de los hallazgos:**

1. **Cálculo por lote → granules de Hansen por range-read.** Es el único camino que no depende de aprobación humana, cubre hasta 2025, tiene licencia comercial explícita y da reproducibilidad total (archivos estáticos, inmutables, con `Last-Modified` citable). Es lo que hay que defender en un expediente de diligencia debida.
2. **Contraste agregado por provincia → `gadm__tcl__adm1_change` vía `/download/csv`, que funciona sin API key** (§5.5). Útil para validar que nuestros números por lote son coherentes con el agregado oficial.
3. **Máscara de bosque → JRC GFC2020 V3.** No reemplaza a Hansen (es un mapa de estado 2020, no una serie anual de pérdida) pero es la **línea de base forestal oficial de la UE**, alineada con la definición de bosque del propio Reglamento.
4. **La GFW Data API con geometría propia es un "nice to have", no la base.** Aporta comodidad (SQL con geometría inline) a cambio de: una dependencia de alta con plazo no determinable, un tope de responsabilidad de USD 100, derecho de suspensión sin aviso, y un requisito de atribución que obliga a mostrar *"powered by Resource Watch"* en nuestro producto (§7.2).

---

## 2. GFW Data API: alta paso a paso, credencial y límites

### 2.1 Identidad del servicio

Hay que distinguir tres cosas que suelen confundirse:

- **GFW Data API** — `https://data-api.globalforestwatch.org` — HTTP 200. `openapi.json` declara literalmente `"title": "GFW DATA API"`, `"version": "0.3.0"`, 51 rutas. **Es la API correcta para estadísticas zonales sobre geometría propia.**
- **Resource Watch API** — `https://api.resourcewatch.org/v1/dataset` — HTTP 200, `application/json`. Es un servicio distinto (catálogo de Resource Watch). No expone los endpoints `/analysis/zonal` ni `/dataset/{dataset}/{version}/query`. **No es la vía para este caso de uso.**
- **Zeno API** — `https://api.globalnaturewatch.org/openapi.json` — HTTP 200. Declara `"title": "Zeno API"`, `"version": "2026.9.10"`, `"description": "API for Zeno LangGraph-based agent workflow"`. Es el backend conversacional del nuevo producto Global Nature Watch (ver §2.5), **no** un reemplazo de la Data API.

### 2.2 Rebranding: Global Forest Watch → Global Nature Watch

Verificado el 2026-09-12: `https://www.globalforestwatch.org/...` responde **301 Moved Permanently** hacia `https://globalnaturewatch.org/...`.

Consecuencias verificadas:

- El host de la API **no cambió**: `data-api.globalforestwatch.org` sigue sirviendo 200.
- `data-api.globalnaturewatch.org` **no resuelve DNS** (`curl: (6) Could not resolve host`). No existe un host equivalente bajo el dominio nuevo.
- La metadata del propio dataset ya usa la marca nueva. Cita literal del campo `citation` de `umd_tree_cover_loss`:

  > `Hansen et al., 2013. "High-Resolution Global Maps of 21st-Century Forest Cover Change.". Accessed through Global Nature Watch on 21/11/2024[date]. [www.globalnaturewatch.org](www.globalnaturewatch.org)`

### 2.3 Alta, paso a paso

Transcripción literal de la guía oficial *"Create and use an API key"* (`https://globalnaturewatch.org/help/developers/guides/create-and-use-an-api-key/`, HTTP 200; metadatos del artículo: `date = 2021-12-30T07:33:15`, `modified = 2023-01-26T18:25:50`).

La guía enumera cuatro pasos: `Create a MyGFW account`, `Obtain an authorization token`, `Create an API key`, `Use an API key in a request`.

**Paso 1 — cuenta MyGFW.** Dos opciones. Advertencia literal de la guía:

> "However, we currently only support accounts registered with an email and password. If you created your MyGFW account using a social media login – such as Google, Facebook or Twitter – you will have to create a new account using an email and password."

Opción por API (`POST /auth/sign-up`), ejemplo literal de la guía:

```
curl --location --request POST 'https://data-api.globalforestwatch.org/auth/sign-up' \
--header 'Content-Type: application/json' \
--data-raw '{
    "name": "GFW Guide",
    "email": "gfw.guides@yahoo.com"
}'
```

Esquema del cuerpo según `openapi.json` (`SignUpRequestIn`): `name` (string, requerido, *"Full user name"*) y `email` (string format email, requerido, *"User's email address"*); `additionalProperties: false`.

**Aquí está el cuello de botella humano.** Cita literal:

> "After successfully completing either of the options above, you will receive an email from Okta asking you to set a password. Okta is a service provider that GFW uses to store user data. After you set a password, your MyGFW account will be ready."

**Paso 2 — token de autorización.** `POST /auth/token`, `Content-Type: application/x-www-form-urlencoded`. Ejemplo literal:

```
curl --location --request POST 'https://data-api.globalforestwatch.org/auth/token' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--data-urlencode 'username=<YOUR_USERNAME>' \
--data-urlencode 'password=<YOUR_PASSWORD>'
```

Esquema `Body_get_token_auth_token_post`: requeridos `username` y `password`; opcionales `grant_type` (patrón `^password$`), `scope`, `client_id`, `client_secret`. La descripción del endpoint en `openapi.json` es literalmente: `"Get access token from RW API."` — es decir, la autenticación se delega en el backend de Resource Watch.

Respuesta literal según la guía:

```
{
    "data": [
        "access_token": "ey2923…",
        "token_type": "bearer
    ],
    "status": "success"
}
```

(El ejemplo de la guía está mal formado — mezcla `[` con pares clave-valor y deja una comilla sin cerrar. Se transcribe tal cual figura publicado.)

> "Your auth token will expire after some time." — la guía **no** publica la duración exacta. Ver §8.

**Paso 3 — crear la API key.** `POST /auth/apikey` con `Authorization: Bearer …`. Ejemplo literal:

```
curl --location --request POST 'https://data-api.globalforestwatch.org/auth/apikey' \
--header 'Authorization: Bearer ey2923…\
--header 'Content-Type: application/json' \
--data-raw '{
    "alias": "api-key-for-new-app",
    "email": "gfw.guides@yahoo.com",
    "organization": "GFW",
    "domains": []
}'
```

Esquema `APIKeyRequestIn`: requeridos `alias`, `organization`, `email`; opcionales `domains` (array, default `[]`) y `never_expires` (boolean, default `false`, descripción literal: *"Set API Key to never expire, only `admin` users can set this to `true`"*).

Descripción literal del endpoint en `openapi.json`:

> `Request a new API key.`
> `Default keys are valid for one year`

Respuesta literal de ejemplo publicada en la guía:

```
{
    "data": [
        {
            "created_on": "2021-08-06T03:01:04.306976",
            "updated_on": "2021-08-06T03:01:04.306983",
            "alias": "api-key-for-new-app ",
            "user_id": "60f051b...",
            "api_key": "45a23496...",
            "organization": "GFW",
            "email": "gfw.guides@yahoo.com",
            "domains": [],
            "expires_on": "2022-08-04T13:01:58.301960"
        }
    ],
    "status": "success"
}
```

**Paso 4 — usar la key.** Header `x-api-key`:

```
curl --location --request GET 'https://data-api.globalforestwatch.org/datasets' \
--header 'x-api-key: YOUR_API_KEY>
```

> "Remember that if you registered your API key with a list of associated domains, the value in the `Origin` header must match one of those domains."

### 2.4 Credencial emitida, vigencia y límites

- **Tipo de credencial:** API key opaca (string), enviada en header propietario `x-api-key`. Por debajo hay además un Bearer token OAuth 2.0 de usuario, pero ése sólo sirve para administrar keys, no para consultar datos.
- **Vigencia:** literal de la guía → *"Your API key will expire after 1 year. If you require a longer expiration period or the service quota associated with your key does not serve your needs, please contact us at gfw@wri.org."* Coincide con `openapi.json`: *"Default keys are valid for one year"*.
- **Escalamiento de cuota:** por correo a `gfw@wri.org`. Sin SLA publicado.
- **Restricción por dominio.** Literal del campo `domains` en `APIKeyRequestIn`:

  > `List of domains which can be used this API key. If no domain is listed, the key will be set by default to the lowest rate limiting tier.`

  Y de la guía: *"API keys registered without one or more domain have greater usage restrictions than those with a registered domain."*

  **Implicancia directa para Lote Limpio:** un backend server-to-server no envía `Origin`. Registrar la key sin dominios la deja en el *tier* más bajo; registrar dominios obliga a enviar un `Origin` coincidente desde el servidor. Esto hay que decidirlo al pedir la key.
- **Límites numéricos (req/min, req/día, cuota mensual): NO CONFIRMADO — y la búsqueda fue exhaustiva.** No existe **ninguna cifra publicada**. Se verificó: `openapi.json` (0 coincidencias de `rate.?limit|throttl|quota|429`; **ningún** path de los 51 declara respuesta `429`); cabeceras HTTP de respuestas 200 reales (sin `X-RateLimit-*` ni `Retry-After`); `globalnaturewatch.org/help/developers/` (0 coincidencias); el artículo completo *Create and use an API key* (0 cifras); y el `README.md` del repositorio `wri/gfw-data-api` en GitHub (0 coincidencias). Confirmado sólo **cualitativamente** que existe diferencia de cuota según haya o no dominio registrado. Única vía para averiguarlo: escribir a `gfw@wri.org`.

### 2.5 ¿La Data API sigue soportada?

Evidencia recogida: el host responde 200, `umd_tree_cover_loss` `v1.13` fue ingerida el **2026-03-18** y actualizada el **2026-08-04**, y datasets de alertas tienen versiones con fecha `v20260912` (el mismo día de esta investigación). El servicio está **activo y en mantenimiento**.

En paralelo existe la **Zeno API** (`api.globalnaturewatch.org`), que es un producto distinto y **no sirve** para consultas automatizadas por lote:

- `POST /api/analyze` exige `security: [{"HTTPBearer": []}]` (token de usuario, no API key de servicio).
- Existe `GET /api/quota` con esquema `QuotaModel` cuyos campos son `promptsUsed` (*"Number of prompts used today"*) y `promptQuota` (*"Prompt quota for the user"*). Es una cuota de **prompts de agente conversacional**, no de consultas de datos.
- El flujo para geometría propia sería: `POST /api/custom_areas` con `{name, geometries: [Polygon]}` → obtener UUID → `POST /api/analyze` con `aois: [{source: "custom", src_id: "<uuid>", subtype: "custom-area"}]`, `dataset_id`, `start_date`, `end_date` → *pollear* `GET /api/jobs/{job_id}`.
- Catálogo público (`GET /api/datasets/catalog`, sin auth, HTTP 200). IDs verificados:

  | dataset_id | dataset_name |
  |---|---|
  | 1 | Global land cover |
  | 2 | Global natural/semi-natural grassland extent |
  | 3 | SBTN Natural Lands Map |
  | **4** | **Tree cover loss** |
  | 5 | Tree cover gain |
  | 6 | Forest greenhouse gas net flux |
  | 7 | Tree cover |
  | 8 | Tree cover loss by dominant driver |

**Veredicto:** para un servicio de due diligence que corre N polígonos sin intervención humana, la Zeno API es inadecuada (cuota de prompts, jobs asíncronos, auth de usuario). No la consideramos una alternativa.

---

## 3. GFW Data API: consulta pasando geometría propia

Hay **dos** endpoints útiles. Ambos exigen API key.

### 3.1 Opción A — SQL con geometría inline (recomendada)

**Endpoint:** `POST https://data-api.globalforestwatch.org/dataset/{dataset}/{version}/query/json`

El path acepta `dataset` con patrón `^[a-z][a-z0-9_-]{2,}$` y `version` con patrón `^v\d{1,8}(\.\d{1,3}){0,2}?$|^latest$`.

Descripción literal del endpoint (GET homólogo, que documenta la semántica espacial):

> `Execute a READ-ONLY SQL query on the given dataset version (if implemented) and return response in JSON format.`
>
> `Adding a geostore ID or directly-specified geometry to the query will apply a spatial filter to the query, only returning results for features intersecting with the geostore geometry. For vector datasets, this filter will not clip feature geometries to the geostore boundaries. Hence any spatial transformation such as area calculations will be applied on the entire feature geometry, including areas outside the geostore boundaries.`
>
> `A geostore ID or geometry must be specified for a query to a raster-only dataset.`
>
> `GET to /dataset/{dataset}/{version}/fields will show fields that can be used in the query. For raster-only datasets, fields for other raster datasets that use the same grid are listed and can be referenced. There are also several reserved fields with special meaning that can be used, including "area__ha", "latitude", and "longitude".`

> **Nota importante:** `umd_tree_cover_loss` es un dataset **raster**, por lo tanto la geometría **sí** recorta (el filtro por píxel es exacto). La advertencia sobre no recortar aplica a datasets vectoriales.

**Esquema del cuerpo** (`QueryRequestIn`): `sql` (string, **requerido**), `geometry` (`Geometry`, opcional), `additionalProperties: false`. El esquema `Geometry` es `{type: string, coordinates: array}` — es decir, un objeto geometry GeoJSON **crudo**, sin envoltorio `Feature` ni `FeatureCollection`.

**Payload literal** (verificado contra el esquema; polígono de prueba en Santiago del Estero):

```json
{
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[-63.5,-29.5],[-63.4,-29.5],[-63.4,-29.4],[-63.5,-29.4],[-63.5,-29.5]]]
  },
  "sql": "SELECT umd_tree_cover_loss__year, SUM(area__ha) FROM data WHERE umd_tree_cover_loss__year > 2020 GROUP BY umd_tree_cover_loss__year ORDER BY umd_tree_cover_loss__year"
}
```

Invocación:

```bash
curl -X POST \
  "https://data-api.globalforestwatch.org/dataset/umd_tree_cover_loss/v1.13/query/json" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $GFW_API_KEY" \
  -d @payload.json
```

**Respuesta verificada SIN API key** (HTTP **403**), literal:

```json
{"status":"failed","message":"Request is missing valid API key. Please see documentation at https://data-api.globalforestwatch.org/#tag/Authentication on how to create one."}
```

**Forma de la respuesta exitosa: NO CONFIRMADA** — no se pudo ejecutar sin credencial. Ver §8. Lo que sí está confirmado es el *envelope* general que usa toda la API (`{"data": …, "status": "success"}`) y los nombres de campo consultables (abajo).

**Campos consultables.** `GET /dataset/umd_tree_cover_loss/v1.13/fields` devuelve **223** entradas, cada una con la forma `{"pixel_meaning": …, "unit": …, "description": …, "statistics": …, "values_table": …, "data_type": …, "compression": …, "no_data_value": …}`. Nombres literales relevantes:

| Campo | Uso |
|---|---|
| `umd_tree_cover_loss__year` | **año de la pérdida** — el campo central para EUDR |
| `area__ha` | reservado; superficie en hectáreas |
| `latitude`, `longitude` | reservados |
| `umd_tree_cover_loss_from_fires__year` | pérdida atribuida a incendios (permite excluir causa natural) |
| `wri_google_tree_cover_loss_drivers__category` | *driver* dominante (ver §6) |
| `tsc_tree_cover_loss_drivers__driver` | *driver* dominante (producto anterior) |
| `sbtn_natural_forests_map__class` | bosque natural SBTN |
| `gfw_primary_forests__primary_forest` | bosque primario |
| `umd_tree_cover_density_2000__threshold` (familia `intensity__tcdNN_2000`) | umbral de densidad de dosel al 2000 |

Campos de densidad de dosel confirmados en la misma lista: `umd_tree_cover_density_2000__percent`, `umd_tree_cover_density_2000__threshold`, `umd_tree_cover_density_2010__threshold`.

**Semántica de valores confirmada.** El `values_table` de cada campo indica cómo se consultan:

- `umd_tree_cover_loss__year`: 25 filas, `{"value": 1, "meaning": 2001}` … `{"value": 25, "meaning": 2025}`. La API expone el **año calendario** (`meaning`), no el código.
- `umd_tree_cover_density_2000__threshold`: `{"value": 1, "meaning": 10}`, `{2, 15}`, `{3, 20}`, `{4, 25}`, `{5, 30}`, `{6, 50}`, `{7, 75}`. Es decir, **siete** umbrales de densidad de dosel, no seis.

> **Atención: el umbral de densidad de dosel cambia el resultado.** Los `assets` de `v1.13` (33 en total) publican tile sets separados por umbral. Nombres literales confirmados: `year`, `year__tcd0_2000`, `year__tcd10_2000`, `year__tcd15_2000`, `year__tcd20_2000`, `year__tcd25_2000`, `year__tcd30_2000`, `year__tcd50_2000`, `year__tcd75_2000`, más la familia `intensity__tcdNN_2000` equivalente. Elegir el umbral **es una decisión metodológica que hay que declarar explícitamente en el informe**, porque cambia la superficie reportada. Consulta con umbral explícito:
>
> ```sql
> SELECT umd_tree_cover_loss__year, SUM(area__ha)
> FROM data
> WHERE umd_tree_cover_loss__year >= 2021
>   AND umd_tree_cover_density_2000__threshold >= 30
> GROUP BY umd_tree_cover_loss__year
> ORDER BY umd_tree_cover_loss__year
> ```
>
> **NO CONFIRMADO:** si el motor de consulta espera el `meaning` (`30`) o el `value` (`5`) para `umd_tree_cover_density_2000__threshold`. Para `umd_tree_cover_loss__year` la convención documentada de GFW es el `meaning` (año calendario), pero no se pudo ejecutar una consulta real por falta de credencial. Verificar en la primera consulta exitosa.

### 3.2 Opción B — Zonal statistics

**Endpoint:** `POST https://data-api.globalforestwatch.org/analysis/zonal`

Esquema `ZonalAnalysisRequestIn`: requeridos `geometry` y `sum` (array de `RasterLayer`); opcionales `group_by` (default `[]`), `filters` (default `[]`), `start_date`, `end_date`. `additionalProperties: false`.

Payload literal:

```json
{
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[-63.5,-29.5],[-63.4,-29.5],[-63.4,-29.4],[-63.5,-29.4],[-63.5,-29.5]]]
  },
  "sum": ["area__ha"],
  "group_by": ["umd_tree_cover_loss__year"],
  "start_date": "2021",
  "end_date": "2025"
}
```

**Respuesta verificada SIN API key** (HTTP **403**), literal:

```json
{"status":"failed","message":"No valid API Key found."}
```

Variante por geostore: `GET /analysis/zonal/{geostore_id}` — descripción literal: `Calculate zonal statistics on any registered raster layers in a geostore.` Parámetros: `sum` (requerido), `group_by`, `filters`, `geostore_origin` (default `gfw`), `start_date` y `end_date`, ambos con patrón `^\d{4}(\-(0?[1-9]|1[012])\-(0?[1-9]|[12][0-9]|3[01]))?$` y descripción literal `Must be either year or YYYY-MM-DD date format.` Verificado sin key: HTTP **403**, mismo cuerpo `{"status":"failed","message":"No valid API Key found."}`.

### 3.3 Hallazgo: `/geostore` funciona SIN API key (con una advertencia seria)

`POST https://data-api.globalforestwatch.org/geostore` con la geometría en el cuerpo devolvió **HTTP 201** y una respuesta real, sin ninguna credencial. Respuesta literal obtenida el 2026-09-12:

```json
{"data":{"created_on":"2026-09-12T05:15:22.375326","updated_on":"2026-09-12T05:15:22.375332","gfw_geostore_id":"86aa0a2b-e685-4906-5227-415a8d1cc89a","gfw_geojson":{"type":"Polygon","coordinates":[[[-63.5,-29.5],[-63.4,-29.5],[-63.4,-29.4],[-63.5,-29.4],[-63.5,-29.5]]]},"gfw_area__ha":10753.33087579117,"gfw_bbox":[-63.5,-29.5,-63.4,-29.4]},"status":"success"}
```

Esto da gratis un cálculo de superficie del lote (`gfw_area__ha`) y un `bbox`.

**Pero la cadena de redirección es insegura.** Traza verificada:

```
HTTP/2 307
location: http://gfw-data-api-elb-975255122.us-east-1.elb.amazonaws.com/geostore/
HTTP/1.1 201 Created
```

El endpoint público redirige con **307** a un hostname crudo de AWS ELB **sobre HTTP en texto plano**. Seguir ese redirect transmite el polígono del productor sin cifrar. Para un producto de due diligence que maneja la ubicación de parcelas de terceros, **esto es inaceptable sin mitigación**. Agregar la barra final (`/geostore/`) sobre HTTPS también devuelve 307. No se verificó si el comportamiento cambia con una API key presente (ver §8).

**Recomendación:** no usar `/geostore` con `curl -L` / clientes que sigan redirects automáticamente, salvo que se confirme una ruta HTTPS pura.

---

## 4. Dataset y versión vigente — lo que hay que citar para reproducibilidad

Esta es la sección que debe copiarse al informe de due diligence.

### 4.1 En GFW Data API

- **Identificador del dataset:** `umd_tree_cover_loss`
- **Versión vigente a 2026-09-12:** **`v1.13`** — confirmado: `GET /dataset/umd_tree_cover_loss/v1.13` devuelve `"is_latest": true`, `"status": "saved"`.
- **Versiones publicadas:** `v1.8`, `v1.9`, `v1.9.1`, `v1.10`, `v1.11`, `v1.12`, `v1.13`.
- **Trazabilidad de ingesta** (campo `created_on` de cada versión):

  | Versión GFW | `created_on` | `updated_on` | `is_latest` |
  |---|---|---|---|
  | `v1.11` | `2024-03-01T04:22:56.728053` | `2026-04-29T04:01:08.081053` | `false` |
  | `v1.12` | `2025-05-14T21:39:36.276374` | `2026-04-29T04:01:08.074872` | `false` |
  | **`v1.13`** | **`2026-03-18T21:53:40.267714`** | `2026-08-04T22:34:30.794118` | **`true`** |

- **Metadata del dataset:** `"spatial_resolution": 30`, `"resolution_description": "30 m"`, `"update_frequency": "Annual"`, `"geographic_coverage": "Global land area (excluding Antarctica and other Arctic islands)."`, `"license": "[CC BY 4.0](http://creativecommons.org/licenses/by/4.0/)"`, `"key_restrictions": "CC BY 4.0"`.
- **Confirmación del año final, literal del campo `overview`:**

  > `This data set has been updated five times since its creation, and now includes loss up to 2025 (Version 1.13).`

- **Alias `latest`:** `GET /dataset/umd_tree_cover_loss/latest` devuelve **HTTP 307** (redirección). No usarlo en un informe reproducible: **hay que fijar `v1.13` explícitamente**, porque `latest` cambiará.
- **Advertencia:** la metadata a nivel de **versión** viene **vacía** (`metadata: {}`). No hay `content_date_range` publicado en `v1.13`. El rango temporal hay que tomarlo del producto original (abajo).

### 4.2 Producto original Hansen/UMD (Global Forest Change)

- **Versión vigente:** **`GFC-2025-v1.13`**
- **Título oficial de la página de descarga:** `Global Forest Change 2000-2025 Data Download`
- **Rango temporal, literal:** `Results from time-series analysis of Landsat images in characterizing global forest extent and change from 2000 through 2025.`
- **Asset en Google Earth Engine:** `UMD/hansen/global_forest_change_2025_v1_13`. *Dataset Availability* declarada: `2000-01-01T00:00:00Z–2025-12-31T00:00:00Z`.
- **Fecha de publicación:** los granules `lossyear` de `GFC-2025-v1.13` tienen `last-modified: Mon, 16 Mar 2026 18:16:59 GMT` (verificado por `curl -I`). GFW ingirió la versión el `2026-03-18`. **Fecha de publicación exacta anunciada por UMD: NO CONFIRMADA** (ver §8); la evidencia reproducible más fuerte es el `Last-Modified` de los objetos, **2026-03-16**.
- **Codificación de `lossyear`.** Hay una **discrepancia entre fuentes que conviene documentar**:
  - Página de descarga de UMD, literal: `Forest loss during the period 2000-2025, defined as a stand-replacement disturbance, or a change from a forest to non-forest state. Encoded as either 0 (no loss) or else a value in the range 1-20, representing loss detected primarily in the year 2001-2025, respectively.`
  - Catálogo de Google Earth Engine para `v1.13`: rango de valores **0-25**, donde 1-25 representan 2001-2025.
  - **Evidencia decisiva:** el `values_table` del campo `umd_tree_cover_loss__year` en `GET /dataset/umd_tree_cover_loss/v1.13/fields` tiene **exactamente 25 filas**, de `{"value": 1, "meaning": 2001}` a `{"value": 25, "meaning": 2025}`, con `default_meaning: null`.
  - **El rango correcto es 0-25.** El "1-20" de la página de UMD es un residuo no actualizado de versiones anteriores (25 años ⇒ 25 valores). Nuestro código debe mapear `valor n → año 2000 + n`, y el umbral EUDR (`> 2020-12-31`) corresponde a **`lossyear >= 21`** en el raster crudo, o a `umd_tree_cover_loss__year >= 2021` en SQL sobre la API (la API expone el `meaning`, no el `value`).
- **Cambios metodológicos de v1.13, literal:**

  > `This update of gross forest cover loss includes new 2025 loss-year and multispectral imagery layers. Relative to the version 1.0 product our method has been modified in numerous ways, and the new update should be seen as part of a transition to a future version 2.0 that is more consistent over the entire 2000-onward period.`

- **Advertencia metodológica crítica para el informe, literal de UMD:**

  > `However, definitive area estimation should not be made using pixels counts from the forest loss layers.`

  Y del campo `cautions` de GFW:

  > `In the original publication, the authors evaluated the overall prevalence of false positives (commission errors) in this data at 13%, and the prevalence of false negatives (omission errors) at 12%… the authors are 75% confident that the loss occurred within the stated year, and 97% confident that it occurred within a year before or after.`

  **Esto obliga a redactar el verdicto como indicio, no como determinación.** Un lote con pérdida detectada en 2021 tiene ~75 % de probabilidad de que la pérdida sea efectivamente de 2021 — relevante cuando el corte legal es 2020-12-31.

### 4.3 Cita sugerida para el informe

> Fuente de datos: Hansen, M. C., P. V. Potapov, R. Moore, M. Hancher, S. A. Turubanova, A. Tyukavina, D. Thau, S. V. Stehman, S. J. Goetz, T. R. Loveland, A. Kommareddy, A. Egorov, L. Chini, C. O. Justice, and J. R. G. Townshend. 2013. "High-Resolution Global Maps of 21st-Century Forest Cover Change." *Science* 342 (15 November): 850–53. Versión utilizada: **Global Forest Change `GFC-2025-v1.13`**, capa `lossyear` (cobertura 2001–2025), granules obtenidos de `https://storage.googleapis.com/earthenginepartners-hansen/GFC-2025-v1.13/`, objetos con `Last-Modified` 2026-03-16. Consultado el [fecha]. Crédito requerido: **Source: Hansen/UMD/Google/USGS/NASA**.

---

## 5. Descarga de la capa recortada: URLs y esquema de nombres

### 5.1 Hansen Global Forest Change — granules 10°×10°

**Página de descarga:** `https://storage.googleapis.com/earthenginepartners-hansen/GFC-2025-v1.13/download.html` — HTTP 200, `text/html`, 71 892 bytes.

**Esquema de nombres, literal de la propia página** (ejemplo publicado por UMD):

> `Granule with top-left corner at 40N, 80W:`
> `https://storage.googleapis.com/earthenginepartners-hansen/GFC-2025-v1.13/Hansen_GFC-2025-v1.13_lossyear_40N_080W.tif`

Patrón general:

```
https://storage.googleapis.com/earthenginepartners-hansen/GFC-2025-v1.13/Hansen_GFC-2025-v1.13_{LAYER}_{LAT}_{LON}.tif
```

- `{LAYER}` ∈ `treecover2000` | `gain` | `lossyear` | `datamask` | `first` | `last` (los seis confirmados en la página; la nota literal aclara: *"beginning with version 1.4 we are no longer releasing loss as a separate layer from lossyear. Loss as previously releaed corresponds to nonzero values of loss year."*)
- `{LAT}` = latitud de la **esquina superior izquierda**, dos dígitos + `N`/`S` (ej. `20S`, `30S`)
- `{LON}` = longitud de la **esquina superior izquierda**, tres dígitos + `E`/`W` (ej. `070W`, `060W`)
- Grilla de 10°×10°, `Only lossyear and last are updated annualy.`
- Cobertura: `We have provided a complete set of granules spanning the range 180W-180E and 80N-60S`
- Resolución: `1 arc-second per pixel, or approximately 30 meters per pixel at the equator`, `unsigned 8-bit values`

**Listado completo de granules por capa:** `https://storage.googleapis.com/earthenginepartners-hansen/GFC-2025-v1.13/lossyear.txt` — HTTP 200, `text/plain`, 32 759 bytes, `last-modified: Mon, 11 May 2026 14:14:55 GMT`, **279 líneas** (una URL por línea).

### 5.2 Tiles que cubren Córdoba, Santiago del Estero y Chaco

Bounding boxes verificados (Nominatim/OSM, entidades administrativas, 2026-09-12):

| Provincia | lat min | lat max | lon min | lon max |
|---|---|---|---|---|
| Córdoba | −35.0154 | −29.5004 | −65.7713 | −61.7716 |
| Santiago del Estero | −30.4805 | −25.6490 | −65.1884 | −61.7118 |
| Chaco | −28.0687 | −24.0793 | −63.4225 | −58.3745 |

Regla de asignación (esquina superior izquierda, múltiplos de 10°): un punto `(lat, lon)` cae en el tile cuya latitud superior es `ceil(lat/10)*10` y cuya longitud izquierda es `floor(lon/10)*10`.

**Tiles requeridos — los tres provincias juntas necesitan 3 granules:**

| Tile | Extensión | Provincias cubiertas | `lossyear` verificado |
|---|---|---|---|
| `20S_070W` | lat −20…−30, lon −70…−60 | Córdoba (norte), Sgo. del Estero (casi toda), Chaco (oeste) | HTTP 200 · `image/tiff` · **69 976 406 B** · `Last-Modified: Mon, 16 Mar 2026 18:16:59 GMT` |
| `30S_070W` | lat −30…−40, lon −70…−60 | Córdoba (sur), Sgo. del Estero (franja < −30°) | HTTP 200 · `image/tiff` · **18 813 051 B** · `Last-Modified: Mon, 16 Mar 2026 18:18:14 GMT` |
| `20S_060W` | lat −20…−30, lon −60…−50 | Chaco (este, lon > −60°) | HTTP 200 · `image/tiff` · **90 841 954 B** · `Last-Modified: Mon, 16 Mar 2026 18:16:56 GMT` |

Tile adyacente, no necesario para estas tres provincias pero verificado por si el alcance se extiende al este del país por debajo de 30°S (Santa Fe sur, Entre Ríos):

| `30S_060W` | lat −30…−40, lon −60…−50 | — | HTTP 200 · `image/tiff` · **29 666 966 B** · `Last-Modified: Mon, 16 Mar 2026 18:18:12 GMT` |

URLs literales:

```
https://storage.googleapis.com/earthenginepartners-hansen/GFC-2025-v1.13/Hansen_GFC-2025-v1.13_lossyear_20S_070W.tif
https://storage.googleapis.com/earthenginepartners-hansen/GFC-2025-v1.13/Hansen_GFC-2025-v1.13_lossyear_30S_070W.tif
https://storage.googleapis.com/earthenginepartners-hansen/GFC-2025-v1.13/Hansen_GFC-2025-v1.13_lossyear_20S_060W.tif
https://storage.googleapis.com/earthenginepartners-hansen/GFC-2025-v1.13/Hansen_GFC-2025-v1.13_lossyear_30S_060W.tif
```

**Total a descargar para las tres provincias objetivo: ~180 MB** (3 granules `lossyear`).

Si además se quiere la máscara de densidad de dosel al año 2000 —necesaria para aplicar un umbral de cobertura—, los `treecover2000` correspondientes (verificados, HTTP 200) son bastante más pesados:

| Tile `treecover2000` | Tamaño | Last-Modified |
|---|---|---|
| `20S_070W` | 364 636 942 B | `Thu, 19 Mar 2026 20:22:57 GMT` |
| `30S_070W` | 61 025 181 B | `Thu, 19 Mar 2026 20:31:56 GMT` |
| `20S_060W` | 649 392 028 B | `Thu, 19 Mar 2026 20:22:42 GMT` |

**~1,07 GB adicionales.** Con range-reads no hace falta bajarlos enteros.

### 5.3 Range-reads verificados (no hace falta descargar el tile entero)

Confirmado sobre `Hansen_GFC-2025-v1.13_lossyear_20S_070W.tif`:

```
HTTP/2 206
content-type: image/tiff
accept-ranges: bytes
content-range: bytes 0-1023/69976406
content-length: 1024
```

Primeros 8 bytes: `4949 2a00 0800 0000` → `II*\0` = **TIFF clásico little-endian** (no BigTIFF), con IFD en el offset 8. El bucket soporta `Range` y devuelve 206 correctamente, lo que valida el enfoque de range-reads ya probado (~1,0 s por polígono) sin descargar los ~70 MB.

### 5.4 Lo que NO está disponible

El *data lake* interno de GFW, referenciado en los `assets` de `v1.13` como `s3://gfw-data-lake/umd_tree_cover_loss/v1.13/raster/epsg-4326/10/40000/year/geotiff/{tile_id}.tif`, **no es de lectura pública**:

- `https://gfw-data-lake.s3.amazonaws.com/umd_tree_cover_loss/v1.13/raster/epsg-4326/10/40000/year/geotiff/20S_070W.tif` → **HTTP 403 Forbidden**
- `https://gfw-data-lake.s3.us-east-1.amazonaws.com/umd_tree_cover_loss/v1.13/raster/epsg-4326/cog/year__tcd30_2000.tif` → **HTTP 403 Forbidden**

Los COG por umbral de densidad (`year__tcd30_2000.tif`, etc.) sólo son accesibles vía la API con credencial. El camino público es el bucket de Hansen en GCS.

### 5.5 Agregados por unidad administrativa — **funcionan SIN API key**

Hallazgo importante: **no todos los endpoints de la Data API exigen credencial.** Verificado empíricamente:

| Endpoint | Sin API key |
|---|---|
| `/datasets`, `/dataset/{d}`, `/dataset/{d}/{v}`, `/dataset/{d}/{v}/fields` | **200** ✅ |
| `/dataset/{d}/{v}/download/csv` (SQL sobre tablas) | **200** ✅ |
| `/dataset/{d}/{v}/download_by_aoi/csv` | 422 / 500 — llega al backend, **no bloquea por auth** ✅ |
| `/geostore` (POST) | **201** ✅ (pero ver la advertencia de §3.3) |
| `/dataset/{d}/{v}/query/json` | **403** ❌ |
| `/analysis/zonal` | **403** ❌ |
| `/dataset/{d}/{v}/download/geotiff` | **403** ❌ |
| `/dataset/{d}/{v}/download/shp` | **403** ❌ |

Es decir: **el análisis por geometría propia exige key, pero los agregados por unidad administrativa no.**

Datasets agregados contra GADM confirmados en el catálogo (`tcl` = tree cover loss):

- `gadm__tcl__iso_summary` / `gadm__tcl__iso_change` (país)
- `gadm__tcl__adm1_summary` / `gadm__tcl__adm1_change` (provincia)
- `gadm__tcl__adm2_summary` / `gadm__tcl__adm2_change` (departamento)

**Consulta verificada para Argentina, HTTP 200 sin credencial:**

```
GET https://data-api.globalforestwatch.org/dataset/gadm__tcl__adm1_change/v20260424/download/csv
    ?sql=SELECT iso, adm1, umd_tree_cover_loss__year, SUM(umd_tree_cover_loss__ha)
         FROM data
         WHERE iso='ARG' AND umd_tree_cover_density_2000__threshold=30
         GROUP BY iso, adm1, umd_tree_cover_loss__year
```

Respuesta: `text/csv; charset=utf-8`, `content-disposition: attachment; filename=export.csv`, 20 628 bytes, 553 líneas. Primeras líneas reales:

```csv
"iso","adm1","umd_tree_cover_loss__year","sum"
"ARG",1,2001,3918.052856389427246940
```

A nivel departamento (`gadm__tcl__adm2_change`): HTTP 200, `text/csv`, **372 636 bytes, 9 813 líneas**.

Campos exactos de `gadm__tcl__adm1_change` (`/fields` → HTTP 200): `iso`, `adm1`, `umd_tree_cover_loss__year`, `umd_tree_cover_density_2000__threshold`, `wri_google_tree_cover_loss_drivers__category`, `gfw_planted_forests__type`, `is__umd_regional_primary_forest_2001`, `is__gfw_peatlands`, `is__ifl_intact_forest_landscapes_2000`, `sbtn_natural_forests__class`, `umd_global_land_cover__ipcc_class`, `wri_tropical_tree_cover__decile`, `umd_tree_cover_gain__period`.

> **Corrección de nombre de campo.** No existe `umd_tree_cover_canopy_extent__threshold`: usarlo devuelve HTTP **400** con el mensaje literal `{"status":"failed","message":"Bad request. column \"umd_tree_cover_canopy_extent__threshold\" does not exist"}`. El nombre correcto es **`umd_tree_cover_density_2000__threshold`**.

#### 🚨 El alias `latest` está desactualizado en estos datasets

`GET /dataset/gadm__tcl__adm1_change/latest` devuelve `version: v20250515`, `is_latest: true`, `created_on: 2025-05-15` — y **ese CSV sólo llega hasta 2024**. Existen versiones más nuevas con `is_latest: false` que **sí incluyen 2025**:

| Versión | `is_latest` | `created_on` | Año máximo en los datos |
|---|---|---|---|
| `v20250515` (= `latest`) | **`true`** | 2025-05-15 | **2024** |
| `v20260331` | `false` | 2026-03-31 | **2025** |
| `v20260407` | `false` | 2026-04-07 | **2025** |
| `v20260424` | `false` | 2026-04-24 | **2025** |

Valores idénticos en las tres versiones nuevas (ARG, umbral 30 %): **2023 = 215 940,86 ha; 2024 = 203 056,77 ha; 2025 = 197 870,04 ha**.

**Para EUDR nunca usar `latest`: pinear `v20260424` o se pierde silenciosamente el año 2025.** Esto vale también para `umd_tree_cover_loss`, donde `latest` devuelve un 307.

### 5.6 Descarga por AOI (`download_by_aoi`) — no sirve para un país entero

`GET /dataset/{dataset}/{version}/download_by_aoi/csv`. Descripción literal: `Execute a READ-ONLY SQL query on the given dataset version (if implemented) for a given AOI, and return as a CSV file.` `security: None`.

Parámetros (de `openapi.json`): `dataset` y `version` (path, requeridos), `sql` (query, **requerido**), `filename` (default `export.csv`), `delimiter` (enum `Delimiters`: `[",", "\t", "|", ";"]`, default `,`), y **`aoi`** (query, **requerido**, `style: deepObject`, `explode: true`).

`aoi` es un `oneOf` de cuatro esquemas. Ejemplos literales incluidos en el spec:

```json
"Admin Area Of Interest":    {"type": "admin", "country": "BRA", "region": "12", "subregion": "2"}
"Geostore Area Of Interest": {"type": "geostore", "geostore_id": "637d378f-93a9-4364-bfa8-95b6afd28c3a"}
"Global":                    {"type": "global"}
"WDPA Area Of Interest":     {"type": "protected_area", "wdpa_id": "123"}
```

`AdminAreaOfInterest` requiere `country` (ISO), y admite `region`, `subregion`, `provider` (default `"gadm"`), `version` (default `"4.1"`), `simplify`.

Pruebas verificadas **sin API key**:

```
GET .../download_by_aoi/csv
→ HTTP 422 · {"status":"failed","message":"Invalid Area of Interest parameters"}

GET .../download_by_aoi/csv?country=ARG
→ HTTP 422 · {"status":"failed","message":"Invalid Area of Interest parameters"}   (country plano no sirve; aoi es objeto anidado)

GET .../download_by_aoi/csv?sql=SELECT * FROM data LIMIT 1&aoi[type]=admin&aoi[country]=ARG
→ HTTP 500 · {"status":"error","message":"Raster analysis geoprocessor returned invalid response code 413"}
```

**Argentina entera excede el límite del geoprocesador ráster (413 Payload Too Large).** Este endpoint no es utilizable para un país completo; habría que bajar a `region`/`subregion`.

### 5.7 Portal `data.globalforestwatch.org` — **la capa de pérdida NO es descargable**

`https://data.globalforestwatch.org` → HTTP **200**. Es un **ArcGIS Hub** con `orgId = g8WusZB13b9OegfU`. No tiene equivalente bajo el dominio nuevo (`data.globalnaturewatch.org` → **NXDOMAIN**).

Item del dataset, verificado vía `https://hub.arcgis.com/api/v3/datasets?q=tree+cover+loss&filter[orgId]=g8WusZB13b9OegfU` (HTTP 200):

- **`id`**: `5d56c60262e54d408eb6926578072edb`
- **`name`**: `Tree cover loss 2001-2025`
- **`slug`**: `gfw::tree-cover-loss-2001-2025`
- **`type`**: `ImageServer`
- **`url`**: `https://tiledimageservices2.arcgis.com/g8WusZB13b9OegfU/arcgis/rest/services/GFW_TCL_2000_2025/ImageServer`
- **`license`**: `CC-BY-4.0` · **`size`**: `14413980912` (≈14,4 GB) · **`downloadable`**: `true` · **`itemModified`**: ≈ 2026-05-26

**Pero la bandera `downloadable: true` es falsa en la práctica.** Los tres caminos de descarga fallan:

```
GET https://hub.arcgis.com/api/download/v1/items/5d56c60262e54d408eb6926578072edb/geojson?layers=0
→ HTTP 400 · {"message":"Downloads are not supported for this item.","error":"Bad Request","statusCode":400}

GET https://hub.arcgis.com/api/v3/datasets/5d56c60262e54d408eb6926578072edb/downloads/data?format=geojson
→ HTTP 400 · {"errors":"datasets of type \"Image Service\" are not supported","meta":{}}

GET https://data.globalforestwatch.org/datasets/gfw::tree-cover-loss-2001-2025.geojson
→ HTTP 500 · {"errors":[{"title":"Server Error","status":500,"message":"Class constructor BadDataError cannot be invoked without 'new'"}]}
```

Motivo confirmado: el servicio subyacente es un ImageServer **de sólo teselas y protegido** — `.../ImageServer?f=json` devuelve `"capabilities":"Image,TilesOnly"`, `"access":"SECURE"`, `"allowCopy":false`.

**Conclusión: el portal `data.globalforestwatch.org` no es una vía de descarga válida para la capa de pérdida.** Sólo sirve para Feature Layers vectoriales (formatos soportados: `csv`, `shapefile`, `geojson`, `kml`), que no es nuestro caso.

---

## 6. "Tree cover loss" vs "deforestation", y la capa oficial de la UE para EUDR

### 6.1 La distinción, en palabras de la propia GFW

Del campo `cautions` de `umd_tree_cover_loss` (metadata de la API), literal:

> `In this data set, "tree cover" is defined as all vegetation greater than 5 meters in height, and may take the form of natural forests or plantations across a range of canopy densities. "Loss" indicates the removal or mortality of tree cover and can be due to a variety of factors, including mechanical harvesting, fire, disease, or storm damage. **As such, "loss" does not equate to deforestation.**`

Del campo `overview`, literal:

> `Tree cover loss is defined as "stand replacement disturbance" which is considered to be clearing of at least half of tree cover within a 30-meter pixel. The exact threshold is variable both through space and time, and is biome-dependent. Tree cover loss may be the result of human activities, including forestry practices such as timber harvesting or deforestation (the conversion of natural forest to other land uses), as well as natural causes such as disease or storm damage.`

Del blog oficial *"Global Forest Watch's 2024 Tree Cover Loss Data Explained"*:

> `tree cover loss data from UMD captures disturbances to woody vegetation at least five meters tall for the calendar years between 2001 and 2024.`
>
> `Deforestation differs in that it typically refers to a human-caused, long-term change from forest to another land use.`

Otra advertencia literal del campo `cautions`, relevante para no cometer un error de cálculo:

> `Accordingly, "net" loss cannot be calculated by subtracting figures for tree cover gain from tree cover loss, and current (post-2000) tree cover cannot be determined by subtracting figures for annual tree cover loss from year 2000 tree cover.`

**Consecuencia para Lote Limpio:** Hansen `lossyear` responde *"¿hubo pérdida de cobertura arbórea y en qué año?"*, **no** *"¿hubo deforestación en el sentido del art. 2 del Reglamento (UE) 2023/1115?"*. El verdicto del producto debe redactarse en esos términos. Para acercarse a "deforestación" hacen falta dos capas adicionales, ambas disponibles en la misma API:

- **`wri_google_tree_cover_loss_drivers`**, versión **`v1.13`** (alineada con la versión de pérdida). Metadata literal: `"title": "WRI Google Drivers of Tree Cover Loss (1km)"`, `"subtitle": "2001-2025, 1 km, global, WRI/Google DeepMind"`, `"license": "CC by 4.0"`. Función literal: `Shows the dominant driver of tree cover loss within each 1 km grid cell and the intensity of loss over the time period`. Clases literales: `Permanent agriculture: Long-term, permanent tree cover loss for small- to large-scale agriculture.` / `Hard commodities: Loss due to the establishment or expansion of mining or energy infrastructure.` / `Shifting cultivation: …` / `Logging: …`. Campo consultable: `wri_google_tree_cover_loss_drivers__category`. **Limitación seria: resolución de 1 km** — inservible para atribuir causa a un lote individual de decenas de hectáreas; sirve como contexto regional.
- **`sbtn_natural_forests_map`**, versiones `v202310`, `v202410`, `v202504` (la más reciente es `v202504`). Campo: `sbtn_natural_forests_map__class`. Permite restringir la pérdida a **bosque natural**, excluyendo plantaciones.
- **`umd_tree_cover_loss_from_fires`**, versión `v1.13`. Campo: `umd_tree_cover_loss_from_fires__year`. Permite descontar pérdida por incendio (causa potencialmente natural).

### 6.2 ¿Tiene GFW una capa específica "EUDR"?

**No existe una capa GFW llamada "EUDR risk".** Se revisó el catálogo completo (`GET /datasets`, **382 datasets**) buscando `eudr`, `deforest`, `forest_cover_2020`, `gfc2020`, `natural_lands`, `sbtn`, `tmf`. Resultados relevantes: `gfw_west_africa_cocoa_deforestation_risk` (`v202312`, fuera de nuestra región), `wri_agriculture_linked_deforestation` (`v202010`), y — lo importante — **`jrc_global_forest_cover`**.

### 6.3 Sí existe la capa oficial del JRC, y es más defendible jurídicamente

**`jrc_global_forest_cover`** es el *Global Map of Forest Cover* (GFC2020) del Joint Research Centre, creado específicamente para EUDR. Está espejado dentro de GFW con versiones `v2020`, `v2020.2`, `v2020.3`.

Metadata literal desde la GFW Data API:

> `"title": "JRC Global Map of Forest Cover"`
> `"source": "Joint Research Center, EU Forest Observatory"`
> `"function": "Provides a map of global forest cover in 2020 to support the European Union's Deforestation Regulation (EUDR)."`
> `"resolution_description": "10 × 10m"`
> `"citation": "Bourgoin, C., et al., 2024. "Mapping Global Forest Cover of the Year 2020 to Support the EU Regulation on Deforestation-free Supply Chains"."`

Y el `overview`, literal — **leer con atención la parte de valor legal**:

> `The Global Map of Forest Cover (GMFC) is a 10-m dataset developed by the Joint Research Centre (JRC) specifically to support EUDR due diligence assessments. Multiple land cover and land use datasets with global and tropics-wide cover were brought together to create a map of forest that aligns with the definition adopted in the regulation. **The map has no legal value and users are encouraged to cross-reference their assessments with results obtained by analyzing other similar forest datasets such as the SBTN Natural Forest Map.**`
>
> `A preliminary accuracy assessment found the map has an overall accuracy of 76% with higher omission errors (ie. error caused by missing information) than commission errors (ie. error caused by incorrect information). This assessment showed that dense forests and forest edges in structured landscapes are well mapped, while complex and mixed landscapes are more prone to mapping errors.`

En el catálogo de Google Earth Engine (asset `JRC/GFC2020/V3`) la formulación oficial es:

> `a non-mandatory, non-exclusive and not legally binding source of information`

**Conclusión honesta: ninguna capa, ni siquiera la del JRC, tiene valor legal vinculante.** Lo que aporta el JRC GFC2020 no es inmunidad jurídica sino **alineación con la definición de "bosque" del propio Reglamento**, que es una ventaja argumental real frente a la definición de "tree cover ≥ 5 m" de Hansen (que incluye plantaciones).

#### Versión vigente del JRC GFC2020 y cómo se descarga

- **Versión vigente: V3.** Nombre oficial: `Global map of forest cover 2020 - version 3`, fechada **28 de noviembre de 2025**.
- **Resolución:** 10 m. **Año de referencia:** 2020. En GEE: asset `JRC/GFC2020/V3`, *Dataset Availability* `2020-12-31T00:00:00Z–2020-12-31T00:00:01Z`, banda `Map`, **valor de clase 1 = Forest**.
- **Cita oficial:** `Bourgoin, Clement; Verhegghen, Astrid; Ameztoy, Iban; Carboni, Silvia; Achard, Frederic; Colditz, Rene (2025): Global map of forest cover 2020 - version 3. European Commission, Joint Research Centre (JRC) [Dataset] PID: http://data.europa.eu/89h/8c561543-31df-4e1b-9994-e529afecaf54`
- **Informe técnico:** *Maps of Global Forest Cover 2020 Version 3 and Global Forest Type 2020 Version 1 Supporting the EU Deforestation Regulation* — `https://publications.jrc.ec.europa.eu/repository/handle/JRC146622` (HTTP 200).
- **Versión V1 (obsoleta):** `Global map of forest cover 2020 - version 1 [deprecated]`, DOI `10.2905/JRC.CMMF70G`, publicada el 7 de diciembre de 2023. **No usar.**

**Raíz de descarga** (verificada, listado de directorio HTTP 200):

```
https://jeodpp.jrc.ec.europa.eu/ftp/jrc-opendata/FOREST/GFC2020/LATEST/
```

Contenido confirmado del directorio: `copyright.txt`, `single-cog/`, `single/`, `tiles/` (última modificación del listado: `2026-03-13 15:07`).

- **Mosaico global:** `.../LATEST/single/JRC_GFC2020_V3.tif` (junto a `JRC_GFC2020_V3.tif.ovr` y `JRC_GFC2020_V3.qml`). También hay una variante `single-cog/` (Cloud-Optimized GeoTIFF), preferible para range-reads.
- **Tiles 10°×10°:** `.../LATEST/tiles/JRC_GFC2020_V3_{LAT}_{LON}.tif` — **355 tiles** en el listado. Esquema de nombres distinto al de Hansen: latitud sin cero a la izquierda (`N0`, `S10`, `S20`, `S30`) y longitud sin cero a la izquierda (`E0`, `W60`, `W70`).

**Tiles JRC para el área objetivo (verificados con `curl -I`):**

| Tile | Estado | Tamaño | Last-Modified |
|---|---|---|---|
| `JRC_GFC2020_V3_S20_W70.tif` | HTTP 200 · `image/tiff` | 316 751 241 B | `Thu, 20 Nov 2025 14:48:08 GMT` |
| `JRC_GFC2020_V3_S30_W70.tif` | HTTP 200 · `image/tiff` | 195 808 106 B | `Thu, 20 Nov 2025 14:48:10 GMT` |
| `JRC_GFC2020_V3_S20_W60.tif` | HTTP 200 · `image/tiff` | 487 837 243 B | `Thu, 20 Nov 2025 14:48:33 GMT` |
| `JRC_GFC2020_V3_S30_W60.tif` | HTTP 200 · `image/tiff` | 233 146 352 B | `Thu, 20 Nov 2025 14:48:36 GMT` |

URL literal de ejemplo:

```
https://jeodpp.jrc.ec.europa.eu/ftp/jrc-opendata/FOREST/GFC2020/LATEST/tiles/JRC_GFC2020_V3_S20_W70.tif
```

> Nota de tamaño: a 10 m de resolución los tiles JRC pesan **4–7× más** que los de Hansen (317 MB vs 70 MB para la misma extensión `S20/W70`). Si se adopta esta capa, usar la variante `single-cog/` con range-reads, no descargar tiles completos.

**Otros accesos verificados:**

- **WMS:** `https://ies-ows.jrc.ec.europa.eu/iforce/gfc2020/wms.py?service=WMS&request=GetCapabilities` — HTTP 200, `text/xml`, 6 803 bytes.
- **Visor / EU Forest Observatory:** `https://forest-observatory.ec.europa.eu/` — HTTP 200.
- **Página de acceso a datos:** `https://forobs.jrc.ec.europa.eu/GFC` — HTTP 200.
- **Registro del dataset:** `https://data.jrc.ec.europa.eu/dataset/8c561543-31df-4e1b-9994-e529afecaf54` — accesible vía navegador; **`curl` recibe una página de bloqueo anti-bot de 244 bytes** (`"Request Rejected"`). Verificado con WebFetch.
- **Google Earth Engine:** `https://developers.google.com/earth-engine/datasets/catalog/JRC_GFC2020_V3` — HTTP 200.

#### Complemento: Global Forest Type 2020

El mismo informe JRC146622 cubre además *Global Forest Type 2020 Version 1* (asset GEE `JRC/GFC2020_subtypes/V1`), que distingue tipos de bosque —útil para separar bosque natural de plantación bajo la definición del Reglamento. **No se investigó su vía de descarga en detalle** (fuera del alcance de esta ronda).

### 6.4 Marco temporal EUDR (contexto)

Fechas de aplicación, literales de la Comisión Europea (`environment.ec.europa.eu`):

- Operadores grandes y medianos: **30 December 2026**
- Micro y pequeños operadores: **30 June 2027**
- Micro y pequeños ya cubiertos por EUTR: **30 December 2026**

La fecha de corte `31 December 2020` que usa Lote Limpio es correcta como criterio operativo, pero **el texto literal del art. 2 del Reglamento no pudo transcribirse** (ver §8).

---

## 7. Licencias y uso comercial

### 7.1 Hansen / UMD — Global Forest Change

Texto literal de la sección *License and Attribution* de la página de descarga oficial:

> `This work is licensed under a Creative Commons Attribution 4.0 International License. You are free to copy and redistribute the material in any medium or format, and to transform and build upon the material for any purpose, **even commercially**. You must give appropriate credit, provide a link to the license, and indicate if changes were made.`
>
> `Use the following credit when these data are displayed:`
> `Source: Hansen/UMD/Google/USGS/NASA`
>
> `Use the following credit when these data are cited:`
> `Hansen, M. C., P. V. Potapov, R. Moore, M. Hancher, S. A. Turubanova, A. Tyukavina, D. Thau, S. V. Stehman, S. J. Goetz, T. R. Loveland, A. Kommareddy, A. Egorov, L. Chini, C. O. Justice, and J. R. G. Townshend. 2013. High-Resolution Global Maps of 21st-Century Forest Cover Change. Science 342 (15 November): 850-53. Data available on-line from: https://glad.earthengine.app/view/global-forest-change.`

**Veredicto: uso comercial explícitamente permitido.** Obligaciones: crédito `Source: Hansen/UMD/Google/USGS/NASA`, enlace a la licencia, e indicar si se hicieron cambios. Un producto SaaS que cobra por informes de due diligence está cubierto, siempre que atribuya.

El catálogo de Google Earth Engine confirma `CC-BY-4.0` para `UMD/hansen/global_forest_change_2025_v1_13`.

Pedido (no obligación) de la propia página: `We anticipate releasing updated versions of this dataset. To keep up to date with the latest updates, and to help us better understand how these data are used, please register as a user.`

### 7.2 GFW / Global Nature Watch

La metadata de la API declara para `umd_tree_cover_loss`: `"license": "[CC BY 4.0](http://creativecommons.org/licenses/by/4.0/)"` y `"key_restrictions": "CC BY 4.0"`. Para `wri_google_tree_cover_loss_drivers`: `"license": "CC by 4.0"`.

Cita requerida por GFW para el producto de drivers, literal:

> `Use the following credit when these data are displayed: "Tree cover loss by dominant driver". WRI/Google DeepMind. Accessed from Global Nature Watch on [Date]. www.globalnaturewatch.org`

**Términos de servicio.** Documento único y canónico: `https://globalnaturewatch.org/terms/` (HTTP **200**, 91 265 bytes). `https://www.globalforestwatch.org/terms/` hace **301** hacia allí. No existen `/legal`, `/terms-of-service`, `/attribution` ni `/privacy` en el dominio (todos **404**). Encabezado: *"Global Nature Watch Terms of Service — World Resources Institute, 10 G Street NE, Suite 800, Washington, DC 20002"*.

**(a) Licencia de los datos**, literal:

> `Open data is important to Us and we make considerable effort to make many of the datasets available without restriction through the Services. Nonetheless, **each dataset carries its own license and restrictions. You should review the dataset's metadata to understand these restrictions.**`
>
> `You must comply with the licenses of Our datasets. All content displayed on or accessible through the Services is protected by United States copyright laws or their equivalents in other countries.`

Los ToS **no licencian nada por sí mismos**: delegan en la licencia de cada dataset. Para `umd_tree_cover_loss` esa licencia es **CC BY 4.0** en las tres fuentes verificadas (metadata del Data API, `key_restrictions`, y el item del portal ArcGIS Hub). Texto literal del campo `licenseInfo` del item del portal:

> `This Tree Cover Loss dataset is provided by the University of Maryland (GLAD Lab) in partnership with Global Nature Watch (GNW) / World Resources Institute (WRI). It is published under the Creative Commons Attribution 4.0 International License (CC BY 4.0). Any reuse, redistribution, or citation of this dataset must comply with the terms of this license: https://creativecommons.org/licenses/by/4.0/`

Su campo `structuredLicense`: `{"name": "Attribution 4.0 International", "type": "CC-BY-4.0", "abbr": "CC BY", "url": "https://creativecommons.org/licenses/by/4.0"}`.

**(b) Uso comercial: NO hay prohibición.** Se buscó `commercial` en el texto completo de los ToS: la única aparición es en la cláusula de arbitraje (*"Commercial Arbitration Rules of the American Arbitration Association"*), sin relación con licenciamiento. La única restricción de uso general es:

> `Please don't misuse Our Services. You agree to use the Services and their contents only for lawful purposes… You may not use the Services in any manner that could damage or overburden the Services or interfere with any other party's use of the Services.`

Existe una condición específica **sólo para GNW Pro** (producto separado, `pro.globalforestwatch.org`), no para la plataforma pública ni la Data API:

> `When You request to open an account in the Global Nature Watch Pro application (pro.globalforestwatch.org), the following conditions must be met: (1) You are applying on behalf of an organization or entity that works with and is actively involved in commodity supply chains and/or their financing…`

Y en el Help Center: *"If your needs are non-commercial or exploratory, we recommend using our public Global Forest Watch platform, designed for general use."* — es una recomendación de producto, **no** una restricción de licencia.

**(c) Atribución requerida.** Los ToS imponen un requisito **adicional** cuando se consume la API dentro de un producto:

> `If You use Our APIs in Your own products, please credit Us. You agree to attribute our APIs in line with our Attribution Requirements, available at [https://resourcewatch.org/api-attribution-requirements].`

Ese documento (HTTP **200**) dice literalmente:

> `Websites that use the Resource Watch API must include the "powered by Resource Watch" logo linking to http://resourcewatch.org on pages that make use of the Resource Watch API.`
>
> `Graphics, charts, and maps created using the Resource Watch API must include the text and link "powered by Resource Watch" if the Resource Watch logo does not appear elsewhere on the page.`

> **Problema práctico:** ese documento pertenece a **Resource Watch**, no a GFW/GNW, y lleva un banner de archivado literal: *"Thank you for visting Resource Watch. This site is no longer being updated and will be archived in the coming months."* (el error tipográfico "visting" está en el original) Los ToS de GNW apuntan, como requisito de atribución de sus APIs, a un documento de un sitio hermano en vías de archivo. No existe un documento de atribución propio de GNW (`/attribution` → 404). **Consecuencia para Lote Limpio:** si consumimos la Data API dentro del producto, el ToS nos obliga a mostrar *"powered by Resource Watch"*, lo cual es confuso de cara al usuario. Es otro argumento a favor de leer los granules de Hansen directamente, donde sólo rige CC BY 4.0 y la atribución es `Source: Hansen/UMD/Google/USGS/NASA`.

**(d) Limitación de responsabilidad**, literal:

> `YOU AGREE THAT YOUR USE OF THE SERVICES AND ITS CONTENT IS AT YOUR SOLE RISK. THE SERVICES AND CONTENT ARE PROVIDED ON AN "AS IS" BASIS AND WITHOUT WARRANTIES OR REPRESENTATIONS OF ANY KIND… ACTUAL CONDITIONS MAY DIFFER FROM MAPS AND INFORMATION PROVIDED BY THE SERVICES. WE DO NOT WARRANT THAT THE CONTENT OR SERVICES WILL BE ERROR FREE, ACCURATE OR WITHOUT INTERRUPTION.`
>
> `IN NO EVENT WILL WE HAVE ANY LIABILITY TO YOU FOR ALL CLAIMS OR DAMAGES FOR ANY REASON IN EXCESS OF ONE HUNDRED DOLLARS ($100 USD).`
>
> `We may change the features and functions of the Services, including APIs, over time. It is Your responsibility to ensure that Your use of the Services is compatible with the current version.`
>
> `We may cancel or suspend Your access to the Services at any time and for any reason, without notice.`

Ley aplicable: *"The laws of the State of Delaware, U.S.A."*, con arbitraje en Washington DC.

> **Tope de responsabilidad de USD 100 y derecho a suspender el acceso sin aviso.** Para un producto que emite informes de due diligence con consecuencias regulatorias para el cliente, apoyarse en un servicio con estas condiciones es un riesgo de negocio que conviene documentar. Refuerza la decisión de tener el camino de Hansen (archivos estáticos) como ruta primaria.

**No existe en los ToS ninguna cláusula del tipo "no legal value" / "not valid for regulatory purposes".** Se buscó en el texto completo. Si el informe de due diligence necesita esa afirmación, **no se puede citar de GFW**: lo más cercano es el disclaimer "AS IS" más el `cautions` del dataset (*"loss does not equate to deforestation"*). Contraste: el JRC **sí** publica esa afirmación (§6.3).

**Uso comercial: ¿API vs descarga?** Confirmado que **no hay régimen diferenciado de licencia**. Lo único que difiere es la **atribución extra** al consumir las APIs (punto c). `openapi.json` **no declara** campos `termsOfService` ni `license` en `info`. El único producto con régimen comercial propio es GFW/GNW Pro, con su propia API y acceso restringido a entidades de cadenas de suministro.

**¿Sigue soportada la Data API tras el rebranding? Sí, sin deprecación anunciada.** Evidencia:

- El ReDoc de `data-api.globalforestwatch.org` no contiene ningún banner de deprecación (0 coincidencias de `deprecat|sunset|globalnaturewatch` en el HTML).
- `https://globalnaturewatch.org/help/developers/` (HTTP 200) tiene `modified: 2026-09-10T16:21:45` — editada **dos días antes** de esta investigación — y su único enlace externo es exactamente `https://data-api.globalforestwatch.org/`. Renombraron el producto de "GFW Data API" a "**GNW Data API**" en la prosa, **pero el dominio no cambió**. Texto literal de esa página:

  > `The GNW Data API offers five core services:` `Data Catalog`, `Geostore`, `Query: Analyze a selected dataset and produce zonal statistics for any input geometry`, `Download`, `Tile Cache`.

- El anuncio del rebranding (`globalnaturewatch.org/blog/data-and-tools/gfw-now-global-nature-watch/`, efectivo **1 de julio de 2026**) dice *"nothing is changing for users except the name"* y *"Saved links and bookmarks will still work"*. **No menciona la API** en absoluto.

**El riesgo real no es la deprecación sino la ausencia de garantía:** el propio ToS declara que pueden cambiar las APIs y suspender el acceso sin aviso, y no hay SLA ni política de versionado publicada.

**Esquemas de autenticación** declarados en `components.securitySchemes` de `openapi.json`: `OAuth2PasswordBearer` (password flow, `tokenUrl: /token`), `APIKeyOriginQuery` (`in: query`, `name: x-api-key`) y `APIKeyOriginHeader` (`in: header`, `name: x-api-key`). Es decir, la key **también** se acepta por query string — evitarlo, queda en logs.

### 7.3 JRC / Comisión Europea

Texto literal completo de `https://jeodpp.jrc.ec.europa.eu/ftp/jrc-opendata/FOREST/GFC2020/LATEST/copyright.txt` (HTTP 200):

```
 Copyright notice
------------------

(c) European Union, 1995-2026

The Commission's reuse policy is implemented by the Commission Decision of 12 December 2011
on the reuse of Commission documents [1]. Any copyright and/or sui generis right on the dataset
is licensed under the Creative Commons Attribution 4.0 International (CC BY 4.0) licence [2].
Reuse is allowed provided appropriate credit is given and any changes are indicated.

[1] https://eur-lex.europa.eu/eli/dec/2011/833/oj
[2] https://creativecommons.org/licenses/by/4.0
```

El catálogo de Earth Engine para `JRC/GFC2020/V3` formula los términos así:

> `The data may be used by anyone, anywhere, anytime without permission, license or royalty payment. Attribution using the recommended citation is requested.`

**Veredicto: uso comercial permitido, con atribución.** Es la licencia más permisiva de las tres.

Nota de verificación: `https://eur-lex.europa.eu/eli/dec/2011/833/oj` y `https://eur-lex.europa.eu/eli/reg/2023/1115/oj` devuelven **HTTP 202 con cuerpo vacío** ante `curl` (desafío anti-bot de EUR-Lex). Son identificadores ELI canónicos y resuelven en navegador; no se pudo verificar su contenido por herramienta automatizada. `https://creativecommons.org/licenses/by/4.0/` → HTTP 200 verificado.

### 7.4 UMSEF / Ministerio de Ambiente (Argentina)

**Esta es la fuente con el estatus jurídico más débil de las tres.** Conviene leer la sección completa antes de usarla en un producto pago.

**Endpoint verificado:** `https://geo.ambiente.gob.ar/geoserver/wfs?service=WFS&version=2.0.0&request=GetCapabilities` → HTTP **200**, `application/xml`, 402 951 bytes. El servidor expone **421 FeatureTypes** y responde WFS 1.0.0 / 1.1.0 / 2.0.0 y WMS 1.3.0.

**Declaración de licencia en el propio servicio**, transcripción literal del bloque `<ows:ServiceIdentification>` del WFS 2.0.0:

```xml
<ows:ServiceIdentification>
  <ows:Title>Subsecretaría de Ambiente / IDE Ambiental</ows:Title>
  <ows:Abstract>Servicio de información vectorial con atributos asociados, generados por las áreas  técnicas de Ambiente de la Nación y administrado por el IDE Ambiental, conforme de acuerdo a los estándares OGC y ajustándose a las normas y estándares vigentes.</ows:Abstract>
  <ows:ServiceType>WFS</ows:ServiceType>
  <ows:ServiceTypeVersion>2.0.0</ows:ServiceTypeVersion>
  <ows:Fees>NONE</ows:Fees>
  <ows:AccessConstraints>Creative Conmons. Esta licencia es una licencia libre</ows:AccessConstraints>
</ows:ServiceIdentification>
```

Tres problemas, en orden de gravedad:

1. **La licencia declarada no es identificable.** `Creative Conmons. Esta licencia es una licencia libre` — sin variante, sin versión, y con el error tipográfico "Conmons" tal como está publicado. No permite distinguir **CC BY** (permite comercial) de **CC BY-NC** (lo **prohíbe**). La frase "licencia libre" sugiere que no es NC, pero eso es una inferencia nuestra, no una declaración del organismo.
2. **El mismo servidor se contradice.** El WMS 1.3.0 del mismo GeoServer declara `<Fees>NONE</Fees>` y `<AccessConstraints>NONE</AccessConstraints>`. Idéntico contenido servido bajo dos declaraciones distintas; parecen campos de configuración de GeoServer, no un acto administrativo de licenciamiento.
3. **Las capas de monitoreo no tienen metadato.** Verificado por parseo del WMS: **ninguna** capa UMSEF tiene `<MetadataURL>` ni `<DataURL>` (otras capas del servidor sí, p. ej. humedales). No hay ficha ISO 19115 que declare licencia por capa.

**Semántica OGC, para que no se malinterprete:** `<ows:Fees>NONE</ows:Fees>` significa que no hay arancel de acceso al servicio; **no es una licencia ni una cesión de derechos**. `<AccessConstraints>NONE</AccessConstraints>` significa "no se declaran restricciones en este documento de capacidades" — **la ausencia de restricción declarada en un servicio OGC NO equivale a una licencia expresa de uso, ni a una renuncia de derechos, ni a una autorización de explotación comercial**. La obra sigue amparada por la Ley 11.723 salvo licenciamiento expreso.

**¿Qué dice el marco legal argentino?**

- **Términos y Condiciones del Estado nacional** (`https://www.argentina.gob.ar/terminos-y-condiciones`, HTTP 200), literal: *"El Administrador licencia todos sus contenidos bajo la licencia Creative Commons Atribución 4.0 Internacional, cuyo texto legal puede encontrarse en creativecommons.org/licenses/by/4.0/deed.es, excepto cuando se declare lo contrario."* **Pero** su sección "Alcance" enumera taxativamente los "Servicios Digitales" cubiertos (Portal del Estado Nacional, Turnos, apps móviles varias) y **`geo.ambiente.gob.ar` no figura en esa lista**.
- **datos.gob.ar** (API CKAN, HTTP 200): los tres datasets de bosque nativo de la Subsecretaría de Ambiente (`estado-del-bosque-nativo`, `degradacion-del-bosque-nativo`, `conservacion-y-manejo-de-bosques-nativos`) declaran `license_id: Creative Commons Attribution 4.0`, con `license_url: None`. **Pero** sus recursos apuntan a CSV estadísticos de `ciam.ambiente.gob.ar`, **no** a las capas vectoriales del WFS. Mismo organismo de origen, activo de datos distinto.
- **Ley 27.275** (Acceso a la Información Pública, `https://www.argentina.gob.ar/normativa/nacional/ley-27275-265949/texto`, HTTP 200): garantiza acceso, formatos abiertos y reutilización (art. 1 principio de Apertura, art. 5, art. 32), pero **no fija licencia ni menciona uso comercial**. No es un instrumento de licenciamiento de propiedad intelectual.
- **Decreto 117/2016** (`https://www.argentina.gob.ar/normativa/nacional/decreto-117-2016-257755`, HTTP 200): el texto publicado **no menciona licencias, Creative Commons ni uso comercial**; sólo obliga a elaborar Planes de Apertura de Datos.
- **CC BY 4.0** (`https://creativecommons.org/licenses/by/4.0/deed.es`, HTTP 200), literal: *"Compartir — copiar y redistribuir el material en cualquier medio o formato para cualquier propósito, incluso comercialmente."*

**Veredicto: NO hay autorización expresa de uso comercial emitida por el Ministerio/Subsecretaría de Ambiente para las capas del WFS.** La analogía más cercana verificada es CC BY 4.0 (que sí lo permitiría), pero ninguno de los dos instrumentos que la declaran cubre nominalmente `geo.ambiente.gob.ar`.

**Recomendación operativa** (no es asesoramiento legal): tratar los datos como CC BY 4.0 con atribución obligatoria a *"Unidad de Manejo del Sistema de Evaluación Forestal (UMSEF) — Dirección Nacional de Bosques / Subsecretaría de Ambiente de la Nación — IDE Ambiental"* con enlace a `https://geo.ambiente.gob.ar`, **y pedir confirmación escrita a `ideambiental@ambiente.gob.ar`** (contacto oficial declarado en el propio GetCapabilities) antes de un despliegue comercial. Esa confirmación escrita es lo único que cierra el riesgo.

**Capas relevantes — `Name` y `Title` literales:**

| `Name` exacto | `Title` exacto | Features |
|---|---|---|
| `bosques:monitoreo_pch_1998_2024` | Monitoreo de la superficie de bosque nativo de la región forestal Parque Chaqueño de la República Argentina 1998 2024 | 62 472 |
| `bosques:monitoreo_esp_perdida_1998_2024` | Monitoreo de la superficie de bosque nativo de la Región Espinal de la República Argentina 1998 2024 | 10 628 |
| `bosques:monitoreo_spa_1998_2024` | Monitoreo de la superficie de bosque nativo de la región forestal Selva Paranaense de la República Argentina 1998 2024 | 9 301 |
| `bosques:monitoreo_yungas_1998_2024` | Monitoreo de la superficie de bosque nativo de la región forestal Yungas de la República Argentina 1998 2024 | 3 226 |
| `bosques:monitoreo_monte_2015_2024_v1` | Monitoreo de la superficie de bosque nativo de la región forestal Monte de la República Argentina 2015 2024 | 2 325 |
| `bosques:monitoreo_perdida_bap_2001_2024` | Monitoreo de la pérdida de superficie de bosque nativo de la región forestal Bosque Andino Patagónico de la República Argentina 2001 2024 | — |
| `bosques:otbn_nacional` | Ordenamiento Territorial de Bosques Nativos (OTBN) a nivel nacional | — |
| `bosques:sat-d_2026` | Sistema de Alerta Temprana de Deforestación (SAT-D) 2026 | — |
| `bosques:sat-d_2025` | Sistema de Alerta Temprana de Deforestación (SAT-D) 2025 | — |

Existen además **24 capas OTBN provinciales** con el patrón `bosques:{XX}_{año}_OTBN` (p. ej. `bosques:ST_2009_OTBN` = "OTBN - Provincia de Salta", `bosques:SF_2022_OTBN` = "OTBN - Provincia de Santa Fe").

**Para Córdoba, Santiago del Estero y Chaco la capa relevante es `bosques:monitoreo_pch_1998_2024`** (región Parque Chaqueño, 62 472 features), complementada por `bosques:monitoreo_esp_perdida_1998_2024` (Espinal) en el sur de Córdoba.

**Esquema** (`DescribeFeatureType` sobre `bosques:monitoreo_pch_1998_2024`, HTTP 200): `geom` (MultiSurface), `periodo` (string), `observac`, `infobs`, `jurisdic`, `region`, `distrito`, `escena`, `dts`, `dte`, `ara` (double).

**Año final cubierto: 2024.** Confirmado consultando `GetFeature` con `sortBy=periodo D` sobre cada capa:

| Capa | `periodo` máx. | `dte` (fin de ventana de imagen) |
|---|---|---|
| `bosques:monitoreo_pch_1998_2024` | **2024** | 2024-12-27 |
| `bosques:monitoreo_esp_perdida_1998_2024` | **2024** | 2024-12-05 |
| `bosques:monitoreo_monte_2015_2024_v1` | **2024** | 2024-12-26 |
| `bosques:monitoreo_spa_1998_2024` | **2024** | 2025-01-09 |
| `bosques:monitoreo_yungas_1998_2024` | **2024** | 2024-12-17 |
| `bosques:monitoreo_perdida_bap_2001_2024` | **2024** | 2024-12-31 |

Es decir, **UMSEF va un año por detrás de Hansen** (2024 vs 2025). `bosques:sat-d_2026` existe pero es el Sistema de Alerta Temprana de Deforestación, un producto distinto del monitoreo anual consolidado.

---

## 8. Huecos: lo NO CONFIRMADO

Lista explícita. Nada de esto debe darse por cierto en el informe ni en el código.

1. **Forma exacta de la respuesta exitosa de `/query/json` y de `/analysis/zonal`.** No se pudo ejecutar ninguna consulta con datos: ambos endpoints devuelven 403 sin API key, y no disponemos de una. Se transcribieron los esquemas de **request** (que sí están en `openapi.json`) y los cuerpos de **error** literales, pero el esquema de respuesta en `openapi.json` es `{"type": "string"}` para `/query/json` y un `$ref` genérico a `Response` para `/analysis/zonal` — ninguno describe los campos reales. **Buscado en:** `openapi.json` completo, guía oficial de API key, ReDoc (`data-api.globalforestwatch.org`, renderizado por JS y no extraíble por WebFetch).
2. **Límites de tasa numéricos de la GFW Data API.** No hay ningún número publicado: ni req/min, ni req/hora, ni cuota diaria o mensual, ni valores por *tier*. Sólo existen las formulaciones cualitativas *"the lowest rate limiting tier"* y *"greater usage restrictions"*. **Buscado en:** `openapi.json` (0 coincidencias de `rate.?limit|throttl|quota|429`; ningún path declara respuesta 429), cabeceras HTTP de respuestas 200 reales (sin `X-RateLimit-*` ni `Retry-After`), `globalnaturewatch.org/help/developers/`, el artículo completo *Create and use an API key*, y el `README.md` de `wri/gfw-data-api` en GitHub. Única vía: `gfw@wri.org`.
3. **Cuánto tarda realmente el alta de GFW.** La guía describe el flujo (sign-up → correo de Okta → fijar contraseña → token → API key) pero **no publica ningún plazo**. No hay evidencia de una etapa de *aprobación manual*: el paso bloqueante documentado es únicamente la recepción del correo de Okta, que en principio es automático. **No se pudo medir empíricamente** porque implicaría crear una cuenta con un correo real. La afirmación de sesiones previas ("plazo incierto") queda **sin cuantificar**: no confirmamos ni que sea inmediato ni que haya revisión humana.
4. ~~Restricciones de uso comercial específicas de la Data API.~~ **RESUELTO** (§7.2): no existe régimen comercial diferenciado entre API y descarga. Lo único que difiere es un requisito **adicional** de atribución al consumir las APIs.
5. **Fecha de publicación anunciada de `GFC-2025-v1.13` por UMD.** No se encontró un comunicado con fecha. La mejor evidencia reproducible es el `Last-Modified: Mon, 16 Mar 2026` de los objetos en GCS y el `created_on: 2026-03-18` de la ingesta en GFW. **Buscado en:** página de descarga de UMD (no lleva fecha de publicación), catálogo de GEE (no declara fecha de ingesta), búsqueda web.
6. **Comportamiento de `/geostore` con API key presente.** Se verificó que **sin** credencial redirige con 307 a un ELB sobre HTTP en texto plano. No se comprobó si con `x-api-key` la respuesta llega por HTTPS sin redirección.
7. **Texto literal del art. 2 (definiciones de "deforestation" y "deforestation-free") y del art. 3 del Reglamento (UE) 2023/1115.** EUR-Lex bloquea el acceso automatizado (HTTP 202 con cuerpo vacío ante `curl`; WebFetch sólo recupera la interfaz de navegación del Diario Oficial). Las fechas de aplicación sí se confirmaron desde `environment.ec.europa.eu`, pero **la fecha de corte 2020-12-31 no se pudo citar desde el texto legal**.
8. **Vía de descarga de `Global Forest Type 2020 Version 1`** (complemento del JRC para distinguir tipos de bosque). Se confirmó su existencia (informe JRC146622, asset GEE `JRC/GFC2020_subtypes/V1`) pero no se investigaron sus URLs de descarga.
9. **Fecha de publicación exacta del JRC GFC2020 V3.** Se recogió "28 de noviembre de 2025" desde el documento técnico, mientras que los tiles en el FTP tienen `Last-Modified: 20 Nov 2025` y el listado del directorio `LATEST` dice `2026-03-13`. Las tres fechas son consistentes pero **no idénticas**; para el informe conviene citar la del documento oficial y el `Last-Modified` del objeto efectivamente descargado.
10. ~~Si la GFW Data API será deprecada tras el rebranding.~~ **RESUELTO PARCIALMENTE** (§7.2): no hay ninguna deprecación anunciada y la documentación fue editada el 2026-09-10 apuntando al mismo dominio. **Lo que sigue NO CONFIRMADO es el compromiso de soporte:** no existe SLA, ni política de versionado, ni plazo de preaviso. El ToS se reserva expresamente el derecho a cambiar las APIs y a suspender el acceso sin aviso.
10b. **Existencia de una cláusula "no legal value" / "not valid for regulatory purposes" en los ToS de GFW.** Se buscó en el texto completo: **no existe**. Si el informe la necesita, no se puede citar de GFW. (El JRC sí la publica — ver §6.3.)
10c. **Política de retención e inmutabilidad de versiones antiguas del Data API.** `umd_tree_cover_loss/v1.13` declara `is_mutable: false`, pero no hay política publicada sobre cuánto tiempo permanecen accesibles las versiones previas. **Relevante para la reproducibilidad de un informe EUDR a varios años vista.**
10d. **Por qué `gadm__tcl__adm1_change` marca `v20250515` como `is_latest: true` habiendo versiones de 2026 con datos de 2025.** El hecho es reproducible, pero no hay documentación que explique si es intencional o un alias sin actualizar. Tratarlo como bug latente y pinear versión explícita.
10e. **Vigencia del documento de atribución al que remiten los ToS.** `resourcewatch.org/api-attribution-requirements` responde 200 pero el sitio declara estar en vías de archivo. No se confirmó si WRI publicará un reemplazo bajo el dominio GNW (`/attribution` → 404 hoy).
11. **Variante y versión exacta de la licencia Creative Commons declarada por el WFS de Ambiente.** ¿BY? ¿BY-SA? ¿BY-NC? ¿3.0? ¿4.0? **Buscado en:** GetCapabilities WFS 1.0.0/1.1.0/2.0.0, bloque `<Service>` del WMS 1.3.0, `<MetadataURL>`/`<DataURL>` por capa (inexistentes para todas las capas de monitoreo), y el HTML de `https://geo.ambiente.gob.ar/` (sin ninguna coincidencia de `licencia|creative commons|términos|condiciones de uso|derechos`).
12. **Que los Términos y Condiciones de argentina.gob.ar (CC BY 4.0) apliquen a `geo.ambiente.gob.ar`.** Su sección "Alcance" enumera taxativamente los servicios cubiertos y no lo incluye.
13. **Que el `license_id: Creative Commons Attribution 4.0` de datos.gob.ar cubra las capas WFS.** Los recursos de esos datasets apuntan a CSV de `ciam.ambiente.gob.ar`, no al WFS; `license_url` viene `None`.
14. **Fórmula de atribución/citación exigida por UMSEF.** `https://www.argentina.gob.ar/ambiente/bosques/umsef` (HTTP 200) no menciona licencia, condiciones de uso, derechos ni citación.
15. **Página propia de términos de uso del IDE Ambiental.** Probado: `https://geo.ambiente.gob.ar/geonetwork` → **503**, `/catalogo` → **404**, `/visor` → **404**.
16. **Texto íntegro del Decreto 117/2016 desde InfoLEG.** `https://servicios.infoleg.gob.ar/infolegInternet/anexos/265000-269999/265949/norma.htm` → **HTTP 403** ante `curl`. El texto accesible en argentina.gob.ar no menciona licencias; no se puede descartar que el anexo completo sí lo haga.
17. **Existencia de campaña 2025 del monitoreo anual UMSEF.** El `periodo` máximo en todas las capas de monitoreo es 2024.
18. **Por qué el WFS y el WMS del mismo GeoServer declaran restricciones distintas.** No hay documentación pública. Es consistente con configuración por servicio en GeoServer, pero es inferencia.

---

## 9. Fuentes

Todas consultadas el **2026-09-12**. Entre paréntesis, el estado HTTP observado.

**Hansen / UMD**

- `https://storage.googleapis.com/earthenginepartners-hansen/GFC-2025-v1.13/download.html` (200, `text/html`, 71 892 B)
- `https://storage.googleapis.com/earthenginepartners-hansen/GFC-2025-v1.13/lossyear.txt` (200, `text/plain`, 32 759 B, 279 líneas)
- `https://storage.googleapis.com/earthenginepartners-hansen/GFC-2025-v1.13/Hansen_GFC-2025-v1.13_lossyear_20S_070W.tif` (200, `image/tiff`, 69 976 406 B)
- `https://storage.googleapis.com/earthenginepartners-hansen/GFC-2025-v1.13/Hansen_GFC-2025-v1.13_lossyear_30S_070W.tif` (200, `image/tiff`, 18 813 051 B)
- `https://storage.googleapis.com/earthenginepartners-hansen/GFC-2025-v1.13/Hansen_GFC-2025-v1.13_lossyear_20S_060W.tif` (200, `image/tiff`, 90 841 954 B)
- `https://storage.googleapis.com/earthenginepartners-hansen/GFC-2025-v1.13/Hansen_GFC-2025-v1.13_lossyear_30S_060W.tif` (200, `image/tiff`, 29 666 966 B)
- `https://storage.googleapis.com/earthenginepartners-hansen/GFC-2024-v1.12/download.html` (200) — versión anterior, para contraste
- `https://glad.earthengine.app/view/global-forest-change` (200)
- `https://developers.google.com/earth-engine/datasets/catalog/UMD_hansen_global_forest_change_2025_v1_13` (200)

**GFW Data API**

- `https://data-api.globalforestwatch.org/` (200)
- `https://data-api.globalforestwatch.org/openapi.json` (200, `application/json`, 184 914 B) — fuente autoritativa de esquemas
- `https://data-api.globalforestwatch.org/datasets` (200, 610 624 B, 382 datasets)
- `https://data-api.globalforestwatch.org/dataset/umd_tree_cover_loss` (200)
- `https://data-api.globalforestwatch.org/dataset/umd_tree_cover_loss/v1.13` (200)
- `https://data-api.globalforestwatch.org/dataset/umd_tree_cover_loss/v1.13/fields` (200, 223 campos)
- `https://data-api.globalforestwatch.org/dataset/umd_tree_cover_loss/v1.13/query/json` (403 sin key)
- `https://data-api.globalforestwatch.org/analysis/zonal` (403 sin key)
- `https://data-api.globalforestwatch.org/geostore` (307 → 201 en ELB HTTP)
- `https://data-api.globalforestwatch.org/dataset/jrc_global_forest_cover` (200)
- `https://data-api.globalforestwatch.org/dataset/wri_google_tree_cover_loss_drivers` (200)
- `https://globalnaturewatch.org/help/developers/guides/create-and-use-an-api-key/` (200; el artículo declara `modified = 2023-01-26`)
- `https://www.globalforestwatch.org/help/developers/guides/create-and-use-an-api-key/` (**301** → `globalnaturewatch.org`)
- `https://api.globalnaturewatch.org/openapi.json` (200, "Zeno API" v2026.9.10)
- `https://api.globalnaturewatch.org/api/datasets/catalog` (200, sin auth)
- `https://data-api.globalnaturewatch.org/` (**DNS no resuelve**)
- `https://data.globalnaturewatch.org/` (**DNS no resuelve**)
- `https://api.resourcewatch.org/v1/dataset?search=tree%20cover%20loss` (200) — servicio distinto
- `https://gfw-data-lake.s3.amazonaws.com/...` (**403**)
- `https://globalnaturewatch.org/terms/` (200, 91 265 B) — Terms of Service canónicos
- `https://www.globalforestwatch.org/terms/` (**301** → `globalnaturewatch.org/terms/`)
- `https://globalnaturewatch.org/legal/`, `/terms-of-service/`, `/attribution/`, `/privacy/` (**404** los cuatro)
- `https://resourcewatch.org/api-attribution-requirements` (200; el sitio declara estar en vías de archivo)
- `https://globalnaturewatch.org/help/developers/` (200; `modified: 2026-09-10T16:21:45`)
- `https://www.globalnaturewatch.org/blog/data-and-tools/gfw-now-global-nature-watch/` — anuncio de rebranding, efectivo 2026-07-01
- `https://data-api.globalforestwatch.org/dataset/gadm__tcl__adm1_change/v20260424/download/csv?sql=…` (**200**, `text/csv`, 20 628 B, **sin API key**)
- `https://data-api.globalforestwatch.org/dataset/gadm__tcl__adm2_change/...download/csv` (200, `text/csv`, 372 636 B)
- `https://data-api.globalforestwatch.org/dataset/umd_tree_cover_loss/v1.13/download_by_aoi/csv` (422 sin `aoi`; **500** con `aoi[country]=ARG`, error 413 del geoprocesador)

**Portal de datos (ArcGIS Hub)**

- `https://data.globalforestwatch.org` (200, `orgId=g8WusZB13b9OegfU`)
- `https://data.globalforestwatch.org/datasets/gfw::tree-cover-loss-2001-2025/about` (200)
- `https://data.globalforestwatch.org/datasets/gfw::tree-cover-loss-2001-2025.geojson` (**500**)
- `https://hub.arcgis.com/api/v3/datasets?q=tree+cover+loss&filter[orgId]=g8WusZB13b9OegfU` (200, 45 584 B)
- `https://hub.arcgis.com/api/download/v1/items/5d56c60262e54d408eb6926578072edb/geojson?layers=0` (**400**, *"Downloads are not supported for this item."*)
- `https://tiledimageservices2.arcgis.com/g8WusZB13b9OegfU/arcgis/rest/services/GFW_TCL_2000_2025/ImageServer?f=json` (200, `"access":"SECURE"`, `"allowCopy":false`)

**JRC / Comisión Europea**

- `https://jeodpp.jrc.ec.europa.eu/ftp/jrc-opendata/FOREST/GFC2020/LATEST/` (200, listado de directorio)
- `https://jeodpp.jrc.ec.europa.eu/ftp/jrc-opendata/FOREST/GFC2020/LATEST/copyright.txt` (200)
- `https://jeodpp.jrc.ec.europa.eu/ftp/jrc-opendata/FOREST/GFC2020/LATEST/tiles/JRC_GFC2020_V3_S20_W70.tif` (200, `image/tiff`, 316 751 241 B)
- `https://jeodpp.jrc.ec.europa.eu/ftp/jrc-opendata/FOREST/GFC2020/LATEST/single/JRC_GFC2020_V3.tif` (listado confirmado)
- `https://forobs.jrc.ec.europa.eu/GFC` (200)
- `https://forest-observatory.ec.europa.eu/` (200)
- `https://ies-ows.jrc.ec.europa.eu/iforce/gfc2020/wms.py?service=WMS&request=GetCapabilities` (200, `text/xml`)
- `https://data.jrc.ec.europa.eu/dataset/8c561543-31df-4e1b-9994-e529afecaf54` (V3; bloquea `curl`, accesible por navegador)
- `https://data.jrc.ec.europa.eu/dataset/10d1b337-b7d1-4938-a048-686c8185b290` (V1 deprecada, DOI `10.2905/JRC.CMMF70G`)
- `https://publications.jrc.ec.europa.eu/repository/handle/JRC146622` (200)
- `https://developers.google.com/earth-engine/datasets/catalog/JRC_GFC2020_V3` (200)
- `https://environment.ec.europa.eu/topics/forests/deforestation/regulation-deforestation-free-products_en` (200)
- `https://eur-lex.europa.eu/eli/reg/2023/1115/oj` (**202**, cuerpo vacío ante `curl`)
- `https://creativecommons.org/licenses/by/4.0/` (200)

**UMSEF / Ministerio de Ambiente (Argentina)**

- `https://geo.ambiente.gob.ar/geoserver/wfs?service=WFS&version=2.0.0&request=GetCapabilities` (200, `application/xml`, 402 951 B, 421 FeatureTypes)
- `https://geo.ambiente.gob.ar/geoserver/wfs?service=WFS&version=1.1.0&request=GetCapabilities` (200)
- `https://geo.ambiente.gob.ar/geoserver/wfs?service=WFS&version=1.0.0&request=GetCapabilities` (200)
- `https://geo.ambiente.gob.ar/geoserver/wms?service=WMS&version=1.3.0&request=GetCapabilities` (200, `text/xml`, 1 032 147 B)
- `https://geo.ambiente.gob.ar/geoserver/wfs?service=WFS&version=2.0.0&request=DescribeFeatureType&typeNames=bosques:monitoreo_pch_1998_2024` (200)
- `https://geo.ambiente.gob.ar/` (200)
- `https://www.argentina.gob.ar/ambiente/bosques/umsef` (200)
- `https://www.argentina.gob.ar/terminos-y-condiciones` (200)
- `https://www.argentina.gob.ar/normativa/nacional/ley-27275-265949/texto` (200)
- `https://www.argentina.gob.ar/normativa/nacional/decreto-117-2016-257755` (200)
- `https://datos.gob.ar/api/3/action/package_search?q=bosque+nativo&rows=20` (200)
- `https://datos.gob.ar/dataset/estado-del-bosque-nativo` (200)
- `https://creativecommons.org/licenses/by/4.0/deed.es` (200)
- `https://servicios.infoleg.gob.ar/infolegInternet/anexos/265000-269999/265949/norma.htm` (**403** ante `curl`)
- Contacto oficial declarado en el GetCapabilities: `ideambiental@ambiente.gob.ar` — tel. (011) 3990-0400 int. 1039 — San Martín 451, CABA (1004)

**Otras**

- `https://nominatim.openstreetmap.org/search` (200) — bounding boxes provinciales
- `https://globalnaturewatch.org/blog/data-and-tools/2024-tree-cover-loss-data-explained/` (200)
