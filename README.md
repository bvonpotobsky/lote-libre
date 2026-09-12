# Lote Limpio

Trazabilidad EUDR para productores argentinos. Cargá un lote, verificalo contra
las capas oficiales de bosque nativo y descargá el documento de debida diligencia
que te pide el acopio.

El Reglamento (UE) 2023/1115 exige demostrar que la mercadería no proviene de
tierra deforestada después del **31 de diciembre de 2020**. La exigencia baja en
cadena hasta el productor, que hasta ahora no tenía con qué responder.

---

## Arrancar

Necesitás **Node 20.9+**, **pnpm 10+** y **Docker** (la base corre en un contenedor).

```bash
cp apps/web/.env.example apps/web/.env.local   # completá las credenciales
pnpm bootstrap
pnpm dev
```

`pnpm bootstrap` instala las dependencias, levanta PostgreSQL en Docker, migra y
carga los dos lotes de demostración —verificados y con las imágenes satelitales
ya en caché—. Después `pnpm dev` levanta la app en http://localhost:3000.

Si el puerto 5432 ya está ocupado en tu máquina, elegí otro y ajustá
`DATABASE_URL` en `apps/web/.env.local` para que coincida:

```bash
DB_PORT=5433 pnpm db:up
```

Entrás con **`demo@lotelimpio.ar`** / **`lotelimpio2026`**.

Sin credenciales la app no arranca: te dice exactamente qué variable falta y
dónde conseguirla, en lugar de fallar más tarde con un error de un tercero.

---

## Credenciales

### Copernicus — imágenes Sentinel-2 (gratis)

1. Creá una cuenta en <https://dataspace.copernicus.eu>.
2. Entrá al **Dashboard** → **OAuth clients** → **Create new client**.
3. Copiá el `client_id` y el `client_secret`. **El secret se muestra una sola vez.**
4. Van en `SH_CLIENT_ID` y `SH_CLIENT_SECRET`.

### Xweather — nubosidad diaria histórica

1. Creá una cuenta en <https://www.xweather.com>.
2. En tu cuenta, **Apps** → creá una aplicación.
3. Copiá el par `client id` / `client secret`.
4. Van en `XWEATHER_CLIENT_ID` y `XWEATHER_CLIENT_SECRET`.

El plan gratuito tiene un límite por minuto bastante bajo. El cliente pide
secuencialmente, espacia los pedidos y reintenta una vez ante un `429`; si aun
así no hay datos, cae al rango amplio sin bloquear nada.

### El resto

```bash
openssl rand -base64 32     # -> BETTER_AUTH_SECRET
```

`DATABASE_URL` ya viene con un valor por defecto que funciona.

---

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm bootstrap` | instala, levanta la base, migra y carga los lotes de demostración |
| `pnpm db:up` | levanta PostgreSQL en Docker y espera a que acepte consultas |
| `pnpm db:down` | apaga la base (los datos sobreviven en el volumen) |
| `pnpm db:reset` | borra el volumen y deja la base vacía y migrada |
| `pnpm demo` | migra, carga los lotes de demostración y levanta la app |
| `pnpm dev` | levanta la app (migra primero, sin cargar datos) |
| `pnpm test` | 71 tests unitarios |
| `pnpm typecheck` | TypeScript en modo estricto, sin `any` |
| `pnpm --filter web db:seed` | recarga los dos lotes de demostración |
| `pnpm --filter web build:layers` | reconstruye las capas geográficas desde las fuentes oficiales |

---

## Cómo funciona

**El veredicto no sale de las imágenes satelitales.** Sale de dos capas ya
calculadas, y esa distinción es todo el producto:

| Fuente | Qué aporta |
|---|---|
| **UMSEF** (Ministerio de Ambiente) | pérdida de bosque nativo posterior a 2020, con su ventana de detección |
| **OTBN** (Ley 26.331) | categoría legal de conservación del lote |
| **Xweather** | qué cinco días estuvieron despejados, para pedir una imagen útil |
| **Copernicus** | las dos imágenes Sentinel-2 que muestran el cambio |

Dos fotos no distinguen una cosecha de un topado: un lote agrícola pasa de NDVI
0,8 a 0,15 todos los años. Hansen y UMSEF sí, porque usan series temporales
largas y validadas. Las imágenes son evidencia visual; las capas son lo que el
documento cita.

### El semáforo

```
rojo      pérdida de bosque ≥ 0,5 % de la superficie, posterior al 31/12/2020
amarillo  pérdida marginal (< 0,5 %), o Categoría I o II del OTBN,
          o provincia sin capa de OTBN cargada
verde     sin pérdida  Y  sin restricción del OTBN confirmada
```

Verde exige **evidencia positiva de las dos capas**. La ausencia de datos nunca
es verde: un dato faltante disfrazado de resultado limpio es peor que un amarillo
honesto, porque alguien río abajo va a confiar en él.

Un lote en Categoría I sin desmonte posterior a 2020 da **amarillo**, no rojo:
no incumple EUDR, pero es una bandera legal que el acopio necesita ver.

### El hash del documento

El SHA-256 del pie **no se calcula sobre los bytes del PDF**. Un PDF embebe su
fecha de creación, así que hashear el archivo daría un número que nadie podría
recomputar jamás. Se calcula sobre el contenido declarado, serializado de forma
canónica, y ese contenido se guarda junto al hash. Cualquiera puede
re-serializarlo y verificar que el documento no fue alterado.

---

## Decisiones técnicas

**PostgreSQL, sin PostGIS.** Toda la geometría se resuelve con Turf.js contra
archivos GeoJSON, así que PostGIS no aportaría nada: la base sólo guarda filas.
Postgres está porque la app se despliega en un runtime serverless, donde el
sistema de archivos es efímero y un archivo SQLite no sobrevive de una
invocación a la otra. En desarrollo eso se cubre con un contenedor, y el mismo
`DATABASE_URL` sirve para los dos entornos.

**Las coordenadas son `double precision`, nunca `real`.** En Postgres `real` es
float4: cuatro bytes, unos seis dígitos significativos. Guardaría `-63.79244`
como `-63.7924`, corriendo los centroides decenas de metros y dejando el hash de
geometría apuntando a coordenadas que ya no lo producen. Sin error y sin aviso,
que es la peor forma de romperse.

**Leaflet a mano, no react-leaflet.** `leaflet-draw` es vanilla y
`react-leaflet-draw` está sin mantenimiento. Montarlo imperativamente elimina la
pregunta de compatibilidad con React 19 y es menos código.

**El aislamiento por usuario vive en la capa de datos.** Toda función del
repositorio recibe `userId` y toda consulta filtra por él, así ningún handler
puede olvidarse. Un lote ajeno devuelve `404`, no `403`: un `403` confirma que el
id existe y convierte el endpoint en un oráculo de enumeración.

---

## Fuentes de datos

Las capas de `apps/web/data/` se construyen con `pnpm --filter web build:layers`
desde las fuentes oficiales, y su procedencia queda registrada en
`apps/web/data/sources.json`, que es lo que el PDF cita.

| Capa | Origen | Vigencia |
|---|---|---|
| Pérdida de bosque nativo | UMSEF — `geo.ambiente.gob.ar` | 1998–2024, filtrado a ≥ 2021 |
| OTBN Córdoba | Ley provincial 9814 | 2010 |
| OTBN Chaco | Ley provincial 6409 | 2009 |
| OTBN Santiago del Estero | Ley provincial 6942 + Decreto 3133 | 2015 |
| Límites provinciales | IGN | — |

Advertencias que la app muestra y el PDF imprime:

- **Chaco** publica el ordenamiento de 2009. La rezonificación de 2024 (Ley
  4005-R) está vigente desde la Sentencia 19/2026 del STJ, pero **no existe como
  dato geográfico publicado en ningún lado**.
- **Córdoba** no tiene ninguna zona de Categoría III, y sus polígonos fueron
  digitalizados de un mapa JPG: cerca de un límite, la intersección es indicativa.
- La simplificación necesaria para que las capas sean servibles elimina ~7 % de la
  superficie de Categoría III en parches chicos y dispersos.

---

## Lo que quedó afuera, y por qué

Para responder al jurado sin improvisar.

**SENASA y RENSPA.** No hay API pública. El número es un campo de texto que viaja
al PDF tal cual se escribe, y la app lo dice en la pantalla de carga. Validarlo
requeriría un convenio, no código.

**Detección propia de deforestación.** Decisión explícita, no falta de tiempo.
Derivar un veredicto de dos imágenes confunde una cosecha con un desmonte:
el lote verde de la demostración daría rojo si se lo mide así después de cosechar.
Hansen y UMSEF resuelven eso con veinte años de serie temporal validada.

**Provincias fuera de Córdoba, Santiago del Estero y Chaco.** Un lote en otra
provincia se guarda igual y lo dice con todas las letras, en vez de mandar a
reintentar algo que no puede funcionar. Sumar una provincia es agregar dos
GeoJSON y una línea en `COVERED_PROVINCES`.

**GFW Data API en vivo.** Se evaluó y se descartó: el alta exige un circuito de
correo con Okta que puede llevar días, y no aporta nada que UMSEF no dé mejor
—UMSEF además trae la ventana de detección y está publicada por la autoridad
argentina. El camino en vivo queda documentado en `build-layers.ts`.

**OTBN en vivo por WFS.** Funciona (`bosques:otbn_nacional`, ~2,5 s por consulta)
y quedó documentado, pero la demo no puede depender de que un servidor del
Estado esté arriba. Las capas van precargadas.

**Equipos, roles, notificaciones, panel de administración, exportación a Excel.**
Fuera del alcance pedido.

**Verificación de email.** No hay proveedor de correo en el alcance, y exigirla
dejaría afuera de la app a toda cuenta nueva.

**Cobertura de tests en la interfaz.** Los 71 tests cubren la lógica pura:
veredicto, geometría, intersección de capas, selección de ventana despejada y
reproducibilidad del hash. La interfaz se validó con un recorrido real de punta a
punta en navegador, no con tests automatizados.
