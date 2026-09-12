---
name: Lote Limpio
description: Trazabilidad EUDR para productores argentinos — papel y tinta, legible al sol.
colors:
  paper: "#fafaf8"
  card: "#ffffff"
  field: "#eff1ec"
  line: "#d5d9d2"
  ink: "#000000"
  ink-soft: "#4a524c"
  verde: "#17663a"
  verde-mapa: "#49de78"
  amarillo: "#e0a106"
  rojo: "#b3161c"
  alerta: "#8a5a00"
  otbn-i: "#f10000"
  otbn-ii: "#eff60b"
  otbn-iii: "#33a02c"
typography:
  display:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: "1.1"
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: "2rem"
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: "1.75rem"
    letterSpacing: "-0.025em"
  subhead:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: "1.375"
    letterSpacing: "normal"
  readout:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: "1.75rem"
    letterSpacing: "normal"
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: "1.625"
    letterSpacing: "normal"
  caption:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.25rem"
    letterSpacing: "normal"
  label:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: "1"
    letterSpacing: "normal"
  indicator:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: "1.25"
    letterSpacing: "normal"
rounded:
  base: "0.25rem"
  sm: "0.225rem"
  md: "0.3rem"
  lg: "0.375rem"
spacing:
  2xs: "0.125rem"
  xs: "0.25rem"
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.25rem"
  2xl: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 1rem"
    height: "3.25rem"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 1rem"
    height: "3.25rem"
  button-link:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    padding: "0"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0.25rem 0.625rem"
    height: "3.25rem"
  panel:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "1rem"
  list-row:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    height: "4.5rem"
  indicator-verde:
    backgroundColor: "{colors.verde}"
    textColor: "{colors.card}"
    typography: "{typography.indicator}"
    padding: "0.75rem 0.5rem"
    width: "6rem"
  indicator-amarillo:
    backgroundColor: "{colors.amarillo}"
    textColor: "{colors.ink}"
    typography: "{typography.indicator}"
    padding: "0.75rem 0.5rem"
    width: "6rem"
  indicator-rojo:
    backgroundColor: "{colors.rojo}"
    textColor: "{colors.card}"
    typography: "{typography.indicator}"
    padding: "0.75rem 0.5rem"
    width: "6rem"
  indicator-pendiente:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink-soft}"
    typography: "{typography.indicator}"
    padding: "0.75rem 0.5rem"
    width: "6rem"
  verdict-hero-amarillo:
    backgroundColor: "{colors.amarillo}"
    textColor: "{colors.ink}"
    typography: "{typography.headline}"
    rounded: "{rounded.lg}"
    padding: "1rem 1.25rem"
  map-label:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink-soft}"
    typography: "{typography.indicator}"
    rounded: "{rounded.base}"
    padding: "0.25rem 0.5rem"
---

# Design System: Lote Limpio

## Overview

**Creative North Star: "El Instrumento de Campo"**

Esto no es un tablero de control. Es un instrumento que se usa afuera, con una
mano, bajo el sol del mediodía, y a veces con guantes puestos. Toda decisión
visual del sistema es consecuencia de esa escena y no de una preferencia
estética: el papel en vez de la tarjeta, la tinta negra pura en vez del gris
elegante, los objetivos táctiles de 3,25 rem en vez de los 44 px de manual. Si
algo no sobrevive al mediodía, no entra.

La superficie es papel (#fafaf8), un blanco roto cálido que baja el brillo
especular sin perder luminancia. Encima se apoyan paneles blancos puros
(#ffffff) separados por un filete de 1 px (#d5d9d2), nunca por una sombra. La
tinta es **negro puro** —una elección deliberada, no un default heredado—:
maximiza el contraste de luminancia, que es lo único que salva la legibilidad
cuando la pantalla compite con el cielo. El acento no existe como concepto: el
único color de marca es el veredicto, y el veredicto es información, no
decoración.

El sistema es deliberadamente austero en su vocabulario y generoso en su
dimensión. Una sola familia tipográfica. Dos pesos de trabajo. Un radio. Tres
sombras en toda la aplicación, cada una con una justificación física. Cero
animación fuera del vuelo de cámara del mapa. Lo que queda después de sacar todo
eso es tamaño, contraste y palabras — que es exactamente lo que una herramienta
de campo necesita.

**Key Characteristics:**

- Papel y tinta, no superficie y acento.
- Negro puro (#000000) como texto principal, por contraste, no por estilo.
- Altura mínima de 3,25 rem en todo lo que se toca.
- Sin sombras en el flujo ordinario: la profundidad es un filete de 1 px.
- Sin animación: el movimiento es ruido en un vehículo. La landing pública es
  la única excepción, y está acotada en la sección «Landing».
- El color del veredicto nunca viaja solo; siempre lleva sus palabras.
- Una sola familia (Archivo), dos pesos (600/700), un radio base (0,375 rem).
- Sólo claro. El sistema no tiene modo oscuro y no debe tenerlo sin rediseñarse.

## Colors

Una paleta de dos capas: un neutro cálido casi acromático que sostiene toda la
interfaz, y un conjunto de colores que **sólo** aparece cuando hay un hecho que
comunicar.

### Primary

- **Tinta Negra** (`ink`): el texto, los bordes de los botones secundarios, el
  fondo de los botones primarios y el anillo de foco. Es el único "color de
  marca" que la interfaz usa a voluntad. Negro puro elegido a propósito: el
  contraste de luminancia es lo que mantiene la pantalla legible bajo sol
  directo, y cualquier gris oscuro "más refinado" es una pérdida neta en esa
  escena.
- **Tinta Suave** (`ink-soft`): un verde-gris profundo para todo el texto
  secundario — metadatos de fila, etiquetas de dato, texto de ayuda, notas al
  pie, leyendas del comparador. Es la única jerarquía de texto que existe: o es
  tinta, o es tinta suave.

### Secondary

Los tres colores del veredicto. No son una paleta de acento: son el resultado de
una verificación, y su presencia en pantalla siempre significa un hecho.

- **Verde Bosque** (`verde`): "Sin observaciones". Fondo de la fila indicadora,
  del panel de veredicto y del marcador del mapa. Siempre con texto blanco, que
  sobre él da 7,4:1. **No pinta el polígono**: ver Verde de Mapa.
- **Verde de Mapa** (`verde-mapa`): el mismo veredicto, pintado sobre fotografía.
  Existe porque el Verde Bosque tiene luminancia relativa 0,100 y la imagen
  satelital del Chaco va de 0,017 (monte cerrado) a 0,457 (suelo trabajado): el
  token vive adentro del rango del fondo y encima comparte su tono, así que un
  lote limpio daba 1,23:1 contra un cultivo. `#49de78` —`oklch(0.80 0.19 150)`—
  sale por arriba de ese rango: 9,0:1 sobre monte, 6,0:1 sobre bosque, 3,3:1
  sobre cultivo. Es de mapa y sólo de mapa: con texto blanco encima da 1,75:1.
- **Ámbar Señal** (`amarillo`): "Con observaciones". El único de los tres que
  lleva texto tinta en vez de blanco, porque es demasiado claro para sostener
  blanco.
- **Rojo Incumplimiento** (`rojo`): "No cumple". También el filete izquierdo de
  todo bloque de error.
- **Ámbar de Tinta** (`alerta`): la contraparte legible del ámbar. Existe por una
  sola razón —el ámbar señal es ilegible como texto sobre blanco— y se usa en un
  único lugar de toda la aplicación: el `caveat` de cada fuente citada.

### Tertiary

- **OTBN I / II / III** (`otbn-i`, `otbn-ii`, `otbn-iii`): los colores SLD
  publicados por el Ministerio de Ambiente. Aparecen sólo en la muestra de 16 px
  junto a la categoría de conservación. No pertenecen a este sistema y no se
  ajustan a él.

### Neutral

- **Papel** (`paper`): el suelo de toda la aplicación y el `themeColor` del
  navegador. Blanco roto cálido, no blanco puro: baja el brillo especular.
- **Blanco Panel** (`card`): todo lo que se apoya sobre el papel —paneles
  laterales, contenedor de la lista, columna del formulario de acceso, tarjeta
  del estado vacío—.
- **Campo** (`field`): no es una tercera superficie. Es el estado *sin dato*:
  fondo del indicador "Sin verificar", del marcador sin veredicto, del hueco de
  imagen satelital, del lector de superficie ya calculado y de la muestra OTBN
  cuando no hay capa.
- **Filete** (`line`): todo borde, divisor y separador del sistema.

### Named Rules

**La Regla del Papel.** Hay exactamente dos superficies: papel (#fafaf8) es el
suelo, blanco (#ffffff) es todo lo que se apoya encima. No inventes una tercera.
`field` no es una superficie: es la ausencia de dato, y usarla como fondo
decorativo rompe esa lectura.

**La Regla de la Palabra.** Ningún color de veredicto aparece jamás solo.
Aproximadamente uno de cada doce varones no separa el rojo del verde, y esta
audiencia es mayormente de varones trabajando al aire libre. Todo verde, ámbar o
rojo arrastra su título —"Sin observaciones" / "Con observaciones" / "No
cumple"— en la lista, en el marcador del mapa y en el PDF.

**La Regla del Ámbar Prestado.** `amarillo` (#e0a106) sólo existe como fondo.
Como texto sobre blanco es ilegible, y su contraparte es `alerta` (#8a5a00).
Nunca escribas texto en #e0a106.

**La Regla del Verde Prestado.** El basemap ya es verde. Un verde nuestro sobre
la imagen satelital tiene que ser un verde que la tierra no tenga: el Verde
Bosque es correcto sobre papel y desaparece sobre monte. Por eso el veredicto
verde tiene dos valores —`verde` para el chrome, `verde-mapa` para el polígono—
y por eso ámbar y rojo tienen uno solo: sus tonos no existen en la fotografía y
se anuncian solos. Es la contraparte de la Regla del Ámbar Prestado: el mismo
problema, un color que no sobrevive a su propio sustrato.

**La Regla del Color Citado.** Los tres colores del OTBN no son nuestros: son los
del organismo que publica la capa, para que la muestra coincida con un mapa que
el productor tal vez ya vio. No los armonices con la paleta. Esa disonancia es
exactamente el punto.

## Typography

**Display Font:** Archivo (con `ui-sans-serif, system-ui, sans-serif`)
**Body Font:** Archivo — la misma
**Label/Mono Font:** ninguna. No hay monoespaciada en la interfaz.

**Character:** Archivo, de Omnibus-Type (Buenos Aires), es una grotesca argentina
para una herramienta de campo argentina. Es una obrera: terminales rectas,
aperturas amplias y un ojo grande que la sostiene a 0,75 rem con luz fuerte. No
tiene pretensión editorial, y esa ausencia es la elección.

### Hierarchy

- **Display** (700, 1,875 rem → 2,25 rem en `sm` → 3 rem en `lg`, `line-height`
  1.1, `tracking` −0,025 em, `text-balance`): existe en un solo lugar de toda la
  aplicación —el titular del panel de acceso—. Es la única vez que el producto se
  presenta en vez de trabajar.
- **Headline** (700, 1,5 rem / 2 rem, `tracking` −0,025 em): título de pantalla y
  titular del panel de veredicto. Nunca dos en la misma vista.
- **Title** (700, 1,25 rem / 1,75 rem, `tracking` −0,025 em): título de pantallas
  secundarias — carga de lote, estado vacío.
- **Subhead** (600, 1 rem, `line-height` 1.375): encabezados de sección y títulos
  de fila. No llevan clase de tamaño: heredan 1 rem y se distinguen sólo por el
  peso. Es la jerarquía más usada del sistema y la más silenciosa.
- **Readout** (600, 1,125 rem / 1,75 rem): el valor numérico de un dato —
  hectáreas, porcentaje de pérdida, categoría OTBN. Siempre debajo de su etiqueta,
  nunca al lado.
- **Body** (400, 1 rem, `line-height` 1.625, `max-width: 65ch` vía `max-w-prose`):
  prosa explicativa. Todo párrafo largo lleva `leading-relaxed`.
- **Caption** (400, 0,875 rem / 1,25 rem, en `ink-soft`): el caballo de batalla
  real del sistema — metadatos, ayuda, leyendas, notas. Su variante de 0,75 rem
  cubre la letra chica.
- **Label** (500, 1 rem): etiqueta de campo de formulario. El tamaño base de
  shadcn es 0,875 rem y **siempre** se sobreescribe a 1 rem: a esta distancia y
  con esta luz, 14 px no alcanza.
- **Indicator** (700, 0,75 rem → 0,875 rem en `sm`, `line-height` 1.25,
  centrado): la columna de veredicto en la lista y la etiqueta del marcador del
  mapa. Es tipografía funcionando como señalética.

### Named Rules

**La Regla de la Única Familia.** Archivo es display y body. No hay pareja
tipográfica, y agregar una segunda familia quiebra la premisa: un instrumento no
tiene dos voces.

**La Regla del Peso Doble.** El sistema trabaja con 600 y 700. `font-medium` (500)
aparece dos veces en toda la aplicación y `font-normal` (400) sólo para deshacer
una negrita heredada. Si necesitás un tercer peso para resolver una jerarquía,
la jerarquía está mal planteada: usá tamaño o color.

**La Regla de los Números Alineados.** `font-variant-numeric: tabular-nums` vive
en el elemento `html`, no en una utilidad. Hectáreas y porcentajes alinean
columna a columna en toda la aplicación por defecto, y nadie tiene que acordarse.
No lo deshabilites localmente.

**La Regla de la Versalita Ausente.** No hay `uppercase` ni `tracking-wide` en
ninguna parte del sistema. Las mayúsculas sostenidas leen peor en movimiento y
esta interfaz no tiene etiquetas decorativas que las justifiquen.

## Layout

El modelo espacial es un **partido mapa/panel** que se voltea en un solo quiebre.
Por debajo de `lg` (1024 px) el mapa ocupa una banda superior de altura fija en
`svh` y el panel fluye debajo; a partir de `lg` giran a fila y el panel toma un
ancho fijo —28 rem en el detalle, 26 rem en la carga— mientras el mapa se lleva
el resto. El panel de acceso usa el mismo gesto al revés:
`lg:grid-cols-[1fr_28rem]`, con la columna de marca a la izquierda y el
formulario a la derecha. Esa columna abre con el lockup a `h-5`, no con el
nombre en texto.

Sólo existen **dos quiebres**: `sm` (640 px) resuelve saltos de padding y de
tamaño de texto entre teléfono chico y grande; `lg` (1024 px) es donde cambia la
estructura. No hay `md:`, `xl:` ni `2xl:` en todo el código de la aplicación.

Anchos de contenedor: `max-w-3xl` para la lista de lotes, `max-w-sm` para el
formulario de acceso, `max-w-lg` para la tarjeta de estado vacío, `max-w-prose`
para toda prosa larga. La cabecera y el `main` no imponen ancho: cada pantalla
trae el suyo.

El ritmo vertical se construye siempre con `gap-*` dentro de una grilla o un
flex — `space-y-*` no aparece ni una vez en el sistema. La escala real de espacio
es `0.5 / 1 / 2 / 3 / 4 / 5 / 6`, con `px-4` + `py-3` como par de relleno por
defecto y `mt-0.5` como micro-paso característico para colgar una leyenda debajo
de un valor.

### Named Rules

**La Regla del `svh`.** Toda altura de viewport usa `svh`, nunca `vh` ni `dvh`.
En un teléfono con la barra del navegador retraída, `dvh` reacomoda el mapa a
mitad de un gesto de dibujo; `svh` se queda quieto. La estabilidad gana sobre
aprovechar los últimos píxeles.

**La Regla de los 3,5 rem.** La cabecera mide 3,5 rem y ese número está escrito a
mano en cada `calc(100svh - 3.5rem)` del sistema. Si cambiás el padding de la
cabecera, cambiá los cinco cálculos — o el mapa empieza a empujar la página.

**La Regla de los Dos Quiebres.** `sm` ajusta, `lg` reestructura. Si una pantalla
nueva necesita un tercer quiebre, probablemente necesita menos contenido.

## Elevation & Depth

**El sistema es plano por definición.** La profundidad ordinaria es un borde de
1 px en `line` (#d5d9d2) sobre blanco, o un cambio de superficie de papel a
blanco. Los paneles laterales, el contenedor de la lista, el panel de edición y
el marco del comparador son todos borde, nunca sombra. No existe ninguna clase
`shadow-sm/md/lg/xl` en el proyecto, ni ninguna `drop-shadow`.

Hay exactamente **tres sombras**, todas de valor arbitrario y cada una resolviendo
un problema físico concreto, no una jerarquía:

### Shadow Vocabulary

- **Levante sobre el mapa** (`box-shadow: 0 -2px 24px rgba(0,0,0,0.18)`): la
  tarjeta del estado vacío flotando sobre imagen satelital. Proyecta **hacia
  arriba** porque la tarjeta está anclada al borde inferior; una sombra
  descendente ahí no se vería.
- **Legibilidad sobre satélite** (`box-shadow: 0 1px 6px rgba(0,0,0,0.45)`): la
  etiqueta del lote en el mapa. No es elevación: es el único modo de que un chip
  de color sobreviva sobre una textura fotográfica impredecible.
- **Filete del comparador** (`box-shadow: 0 0 0 1px rgba(0,0,0,0.35)`): un anillo
  de 1 px alrededor de la barra blanca del comparador. Es un borde disfrazado de
  sombra, para no sumar ancho al elemento.

### Named Rules

**La Regla del Filete.** La profundidad se construye con un borde de 1 px, no con
una sombra. Una sombra en este sistema tiene que justificarse contra una textura
fotográfica o contra una restricción de anclaje — nunca contra una jerarquía.

**La Regla del Halo Oscuro.** Todo lo que se dibuje sobre la imagen satelital
lleva oscuro debajo, y las tres sombras de arriba son sólo una de sus formas. Los
nombres de provincia y departamento van con `text-halo` negro, el chip del lote
con su sombra de legibilidad, los vértices del dibujo con contorno negro, y el
contorno del lote con su casing. La razón es siempre la misma: la luminancia del
fondo va de suelo trabajado a monte casi negro dentro de una misma pantalla, y
ningún color plano la cruza entera. Si agregás un elemento nuevo al mapa sin
oscuro debajo, va a desaparecer en la mitad de las capturas.

**La Regla de la Franja Izquierda.** Todo aviso, error o advertencia se marca con
un filete vertical de 4 px en el color del hecho (`rojo` para error, `amarillo`
para advertencia) sobre fondo blanco, sin tinte de fondo y sin ícono. La lista de
motivos del veredicto usa la misma gramática con 2 px en `line`, porque enumera
en vez de alertar.

## Shapes

El lenguaje de forma es **rectangular con las esquinas apenas quebradas**. El radio
base del sistema es `0.375rem`, y de él derivan los tres escalones que la
interfaz usa de verdad: `0.225rem` para la muestra OTBN de 16 px, `0.3rem` para
botones y baldosas, `0.375rem` para paneles, tarjetas, el contenedor de la lista
y el marco del comparador. Los chips del mapa y del comparador usan el `0.25rem`
por defecto de Tailwind, un escalón fuera del sistema que viene de ser elementos
montados imperativamente.

Nada es circular. No hay píldoras, no hay avatares, no hay badges redondeados. La
única geometría no rectangular del sistema es el polígono del lote mismo, que es
dato, no forma.

Los bordes tienen dos espesores con significado distinto: **1 px** es estructura
(paneles, divisores, contenedores) y **2 px** es acción (el contorno del botón
secundario). El `border-dashed` aparece una sola vez —el lector de superficie
antes de que haya un polígono— y significa literalmente "acá va a haber un dato".

### Named Rules

**La Regla del Radio Único.** Un radio, tres escalones derivados por cálculo. No
introduzcas un valor arbitrario: si un elemento nuevo necesita otra esquina, usá
el escalón más cercano.

**La Regla del Borde Parlante.** 1 px es estructura, 2 px es acción, punteado es
vacío. Un borde de 2 px que no sea un control interactivo miente sobre lo que se
puede tocar.

## Components

### Marca

El lockup —isotipo verde `#156137` y logotipo en negro— se pinta a `h-5`
(20 px de alto, ~90 px de ancho a su relación 4,5:1) en las cuatro superficies
donde la marca aparece: el encabezado y el pie de la landing, la columna del
acceso y la cabecera de la aplicación. Una sola imagen, una sola altura, un solo
componente: `components/marca/marca.tsx`.

- **Nunca por ruta.** Se importa como módulo. Una URL `/marca/…` la intercepta
  `proxy.ts` y la manda a `/ingresar`; el import estático se sirve desde
  `/_next`, que el matcher excluye. Lo mismo vale para los iconos: `/icon.png` y
  `/apple-icon.png` son rutas propias en Next 16 y están en `PREFIJOS_PUBLICOS`
  (`lib/auth/rutas-publicas.ts`), o el navegador recibe un redirect en lugar de
  una imagen y la pestaña queda sin marca.
- **Los archivos se derivan, no se editan.** `scripts/build-marca.ts` recorta el
  lockup y separa el isotipo para `app/icon.png` y `app/apple-icon.png`. El
  maestro vive en `assets/marca/`, fuera de `public/`: es fuente, no algo para
  servir.
- **El verde del logo no es `verde`.** `#156137` contra el `#17663a` del token.
  La diferencia no se armoniza: el archivo de marca es el original y el token es
  del veredicto, que es información y no identidad.

### Buttons

Cuatro tratamientos, y ninguno lleva ícono. El texto es siempre una frase
completa en voseo — "Guardar y volver a verificar", no "Guardar". Eso vale
también para el compacto: lo que baja es la altura, nunca las palabras.

- **Shape:** esquina apenas quebrada (`0.3rem`), altura mínima de **3,25 rem**
  vía la utilidad `tap`, nunca una clase `h-*`. La única segunda altura del
  sistema es **2,75 rem** vía `tap-compacto`, y sólo para el tratamiento
  Compact / Inline de abajo. Entre las dos no hay nada, y por debajo tampoco.
- **Primary:** tinta sólida sobre papel (fondo `ink` #000000, texto `paper`
  #fafaf8), `padding: 0 1rem`, peso 600, 1 rem. Es la acción que hace avanzar la
  tarea: guardar el lote, verificar, confirmar un cambio de contorno.
- **Secondary / Outline:** borde de **2 px** en `ink` sobre fondo transparente,
  texto `ink`, misma altura y radio. Es la acción alternativa de igual peso
  semántico —importar, cancelar, editar, descargar el documento—, no una acción
  menor.
- **Compact / Inline:** altura mínima **2,75 rem** vía `tap-compacto`, texto de
  **0,875 rem**, peso 600, mismo radio y mismos colores que Primary y Outline —
  es una variante de tamaño, no un cuarto color. Se usa **sólo** cuando el
  control comparte la fila con una línea de texto —un encabezado o una leyenda—
  y el alto de esa fila es el recurso escaso: «Cargar un lote» junto al `<h1>`
  de la lista, «Editar el contorno» junto al nombre del lote, «Quitar filtros»
  junto al conteo de visibles. Nunca para la acción que hace avanzar la tarea,
  nunca dentro de un formulario, y nunca para un botón que ocupa el ancho de su
  contenedor: ahí los 3,25 rem son el punto. Los 2,75 rem no son un número nuevo
  — es el mínimo de manual, el mismo que ya gasta la fila táctil del
  comparador.
- **Link:** texto `ink`, peso 600, subrayado con `underline-offset-4`. Sólo para
  salidas de flujo: "Salir", "Creá una", "Entrá". El tratamiento es de pintura y
  no de caja, así que su objetivo táctil depende de dónde caiga: **corriendo
  dentro de un párrafo no lleva ninguno** —el renglón es el objetivo y una caja
  ahí rompería el interlineado—, pero **parado solo en una fila lleva
  `tap-compacto`**, igual que cualquier otro control. Lo que nunca lleva es una
  clase `h-*`: ese hueco en la regla es exactamente el que se llenó una vez con
  un `h-12` inventado en el momento. **"Salir" es la excepción conocida y sigue
  sin objetivo táctil**: está parado solo en la cabecera, así que le
  correspondería, pero la cabecera mide 3,5 rem y ese número está escrito a mano
  en cada `calc(100svh - 3.5rem)` del sistema. Dárselo es recalcular la cabecera,
  no agregar una clase. Queda anotado acá, no disimulado.
- **Disabled:** `opacity: 0.5`, sin cambio de color.
- **Focus:** la utilidad `focus-ink` — `outline: 2px solid var(--color-ink)` con
  `outline-offset: 2px`. Es idéntica en los cuatro tratamientos, y el aire de 2 px
  es lo que la hace funcionar: dibujada sobre el borde del elemento desaparecería
  dentro del botón sólido negro. Se usa `outline` y no `ring` porque el hueco
  tiene que ser un hueco de verdad; el offset de una sombra pinta su propio
  color, y el que trae por defecto no es este papel.
- **Hover:** ninguno. Los botones escritos a mano no cambian al pasar el mouse;
  el único con hover es el `Button` vendorizado de shadcn, usado una sola vez en
  el formulario de acceso. En una herramienta pensada para el dedo, el hover no
  es el estado que decide nada.

### Inputs / Fields

- **Style:** borde de 1 px en `line`, fondo transparente, radio `0.375rem`,
  altura mínima **3,25 rem** vía `tap`, texto de **1 rem** (nunca 0,875 rem: a
  16 px iOS no hace zoom al enfocar). Acá no hay excepción compacta, y la razón
  no es de escala sino de mecánica: el zoom de iOS lo dispara enfocar un campo
  de texto, no tocar un botón. Por eso el tratamiento Compact / Inline puede
  bajar a 0,875 rem y un campo no puede nunca.
- **Focus:** borde en `ink` más anillo de 3 px en `ink` al 50 % de opacidad. Es
  el único anillo de foco del sistema y es negro, no azul.
- **Label:** siempre `<Label htmlFor>` real, 1 rem, peso 500, en un
  `grid gap-2` con su campo. El marcador de opcional va dentro de la etiqueta,
  en peso normal y `ink-soft`.
- **Error:** bloque con `role="alert"`, filete izquierdo de 4 px en `rojo`, fondo
  blanco, sin ícono. Dos líneas: **qué pasó** en peso 600 y `rojo`, **qué hacer**
  en `ink-soft`.
- **Helper:** 0,875 rem en `ink-soft`, debajo del campo.

### Cards / Containers

- **Corner Style:** `0.375rem`.
- **Background:** blanco (#ffffff) sobre el papel de la página.
- **Shadow Strategy:** ninguna. Ver Elevation & Depth — la excepción es la
  tarjeta del estado vacío, que flota sobre el mapa.
- **Border:** 1 px en `line`. En el partido mapa/panel el borde es direccional:
  `border-t` apilado, `border-l` en fila.
- **Internal Padding:** `1rem` en teléfono, `1.5rem` desde `sm`.

### List Rows

La fila de lote es el componente que más define la aplicación: una columna de
veredicto a sangre, de 6 rem (7 rem desde `sm`), estirada a la altura completa de
la fila, y el texto a su derecha. Altura mínima **4,5 rem**. El fondo pasa a
`field` en hover y en `focus-visible`. Las filas se separan con un divisor de
1 px, no con espacio.

La columna de veredicto lleva el título del veredicto en 0,75 rem peso 700,
centrado, en el color del veredicto con su texto contrastante. Sin veredicto
muestra "Sin verificar" o "Reintentar" sobre `field` en `ink-soft`.

### Navigation

- **Style:** cabecera pegajosa (`sticky top-0 z-10`) sobre fondo papel con borde
  inferior de 1 px. `padding: 0.75rem 1rem`, 1,5 rem desde `sm`. Altura efectiva
  3,5 rem.
- **Contenido:** el lockup a la izquierda a `h-5`, enlazado a `/lotes` (ver
  «Marca»); a la derecha el nombre del usuario en 0,875 rem `ink-soft` —oculto
  por debajo de `sm`— y "Salir" como botón de texto subrayado. La cabecera llevó
  la marca en texto hasta que existió un logo: la regla era "sin logo" por
  ausencia de archivo, no por una tesis sobre la pantalla, y las cuatro
  superficies muestran ahora lo mismo.
- **Móvil:** idéntica. No hay menú, no hay hamburguesa, no hay barra inferior. La
  aplicación tiene tres pantallas y no necesita navegación.

### Verdict Panel

El componente de firma. Un bloque de color a sangre con el veredicto —fondo del
color, título en 1,5 rem peso 700, resumen en 0,875 rem al 95 % de opacidad,
fecha en 0,75 rem al 90 %— seguido de una pila de filas de dato separadas por
borde superior de 1 px, cada una con etiqueta en 0,875 rem `ink-soft`, valor en
1,125 rem peso 600 y detalle opcional debajo.

La opacidad hace de segundo color de texto dentro de las superficies de
veredicto: sobre un fondo de color no se cambia de tinta, se baja la opacidad.

La categoría OTBN y los motivos del veredicto no están desplegados: viven en una
divulgación nativa `<details>/<summary>` titulada «Ordenamiento de Bosques
Nativos», **cerrada por defecto**, montada como última fila de la pila de datos y
con su mismo borde superior de 1 px. Sobre el pliegue quedan el veredicto y la
pérdida de bosque; el resto está a un clic. El `summary` conserva su marcador
—no se le toca el `display`— y llega a 3,25 rem con padding, no con `flex`.

Abierta, muestra la categoría como una muestra de 16 px con radio `0.225rem`
—`aria-hidden`, porque su etiqueta está al lado— alineada con el nombre de la
categoría; cuando no hay capa, la muestra es `field` con borde en vez de color.
Debajo van los motivos, cada uno como una línea con filete izquierdo de 2 px.

Sin categoría OTBN no hay divulgación y los motivos se dibujan sueltos en el
panel: un pliegue titulado «Ordenamiento de Bosques Nativos» que sólo contuviera
motivos nombraría algo que no tiene adentro.

Las fuentes citadas no están dentro del panel: son una sección hermana debajo,
cada una con su etiqueta en peso 500, su vigencia en `ink-soft` y su `caveat` en
`alerta` a 13 px.

Esa sección también es una divulgación nativa **cerrada por defecto**, con el
mismo tratamiento de `summary` que el pliegue de OTBN —marcador nativo intacto,
3,25 rem de padding, `focus-ink`— y su mismo borde superior de 1 px, que es lo
que hace que el padding se lea como una franja plegable y no como un hueco del
`gap-6` del aside. La procedencia se cita completa —la lista está en el HTML
inicial, no se pide al abrir—, pero no encabeza la lectura: plegada, la columna
termina en el documento descargable y no en una lista de citas.

El encabezado vive **dentro** del `summary`, en `inline`. Dentro porque el aside
tiene otros `h2` hermanos y perderlo rompe la navegación por encabezados;
`inline` porque un box de bloque empujaría el texto debajo del marcador y lo
dejaría solo en su línea.

### Map Layer

Base satelital cruda sin capa de estilo propia. Los lotes se pintan con el color
de su veredicto al **25 % de relleno** y un contorno de **3 px** sólido —en
`verde-mapa` cuando el veredicto es verde—, montado sobre un **casing negro de
5,4 px** con `line-blur` 0,4: 1,2 px de halo por lado, los mismos números que el
halo de las etiquetas. Sin veredicto, el polígono se dibuja en papel (#fafaf8),
con el mismo casing. El dibujo en curso usa ese mismo papel con vértices de
contorno negro.

El casing no es decoración ni jerarquía: es lo único que hace que el contorno
sobreviva. Ningún color plano puede, porque la imagen cubre la rampa entera de
luminancia —barridos de `oklch` L 0,62 a 0,86 tocan fondo en 1,27:1 o peor en
algún punto—. Con el casing puesto, el vecino del trazo deja de ser fotografía
impredecible: sobre monte lo lleva el trazo de color (9,0:1) y sobre suelo
desnudo lo lleva el casing (10,1:1). Siempre hay uno de los dos trabajando.

La etiqueta de cada lote es un marcador HTML, no una capa de símbolos: un chip de
radio `0.25rem` en el color del veredicto, texto de 0,75 rem peso 700, con la
sombra de legibilidad. **La etiqueta es el objetivo táctil, no el polígono** — a
zoom alejado un campo mide dos o tres píxeles y no hay dedo que lo acierte. Es un
`<button>` real con `aria-label`, o un `div` inerte con `pointer-events-none`
cuando no es navegable.

El buscador de zona es el único elemento de la esquina superior izquierda, y
espeja la torre de zoom de la opuesta: misma caja blanca, mismo borde de 1 px en
`line`, mismo `overflow-hidden` para que la lista se pegue al campo con el mismo
pelo que separa los dos botones de zoom. **Sin sombra** — la profundidad acá es el
borde, y las tres sombras del sistema siguen siendo tres. Sus filas son `tap`
completo y no `tap-compacto`: el eje escaso del desplegable es el vertical, y
elegir la fila correcta es la acción que mueve la tarea adelante, así que no
califica para la excepción compacta. La fila activa se pinta en `field`, que es el
mismo estado transitorio que ya usa la lista de lotes en `hover` y `focus-visible`;
la prohibición de `field` es sobre superficies decorativas, no sobre estados de
interacción. Su alto máximo se ata a la caja del mapa con `calc(100% - …)` y nunca
a un número de píxeles: en `/lotes/nuevo` el mapa pisa `min-h-[42svh]`, y un
`max-h` fijo desborda por abajo, donde el formulario —posterior en el DOM y sin
z-index— lo tapa.

El buscador es opt-in vía `conBuscador`, y sólo `/lotes/nuevo` lo prende. No es
cautela: en `/lotes` y `/lotes/[id]` la cámara la maneja el dato —
`seleccionadoId` encuadra el lote que eligió la lista — y un segundo conductor de
cámara pelearía con el primero. Tampoco deja un marcador en el lugar encontrado:
sería la cuarta clase de marca sobre la imagen, la Regla del Halo Oscuro le
exigiría oscuro debajo, y Terra Draw está en modo polígono desde que carga la
página, así que el próximo toque es el primer vértice y un marcador —que sí es un
elemento adentro del contenedor del mapa— se lo comería. El vuelo de cámara es el
feedback.

### Comparador

Marco con borde de 1 px sobre fondo negro, dos imágenes superpuestas y un
`clip-path: inset()` manejado por porcentaje. El divisor es una barra blanca de
2 px con un anillo negro de 1 px, `aria-hidden`. Las dos esquinas superiores
llevan chips de 0,75 rem peso 600 en blanco sobre negro al 70 %.

**El marco no es cuadrado: toma la proporción del lote.** El `aspect-ratio` sale
de las dimensiones del ráster, que se recortan al bounding box del lote medido
en metros, y las imágenes van con `object-contain`. Un marco cuadrado estiraba
un lote alargado hasta que dejaba de coincidir con el mapa de arriba, y el
`object-cover` que lo acompañaba recortaba evidencia. Mientras las imágenes
cargan, el placeholder usa esa misma proporción para que nada salte.

Arriba, en la fila del `h2`, va un único enlace de texto que alterna entre color
real y NDVI. No es un segmented control: son dos estados, y el que no se está
mirando es la etiqueta de la acción.

El control es un `<input type="range">` **nativo, sin ningún estilo de thumb**,
con `accent-color` en tinta y una fila táctil de 44 px. Funciona con pulgar, con
mouse y con teclado, y se anuncia solo a un lector de pantalla sin cableado
extra. Su etiqueta es `sr-only`.

### Named Rules

**La Regla del Par.** `tap` —o `tap-compacto`, su única alternativa— y
`focus-ink` viajan juntas. La primera resuelve el dedo, la segunda el teclado, y
un control al que le falte cualquiera de las dos está a medio terminar. El
compacto no debilita la regla: le baja la altura al dedo hasta el mínimo de
manual y no toca nada del teclado. Las tres viven en `globals.css` por la misma
razón: son decisiones del sistema, no de la pantalla que las usa.

**La Regla del Anillo Separado.** El foco se dibuja con `outline` y 2 px de aire,
nunca pegado al borde ni a media opacidad. Un anillo negro sobre un botón negro
no existe, y uno al 50 % no sobrevive al sol. Si el anillo no se ve desde un
brazo de distancia, no es un anillo de foco.

## Landing

La landing pública (`/`, `app/(marketing)`) es la única superficie donde el
producto se presenta en vez de trabajar. Se lee sentado, en un escritorio o en
el teléfono en casa, no en una camioneta al mediodía; por eso la premisa de
"cero animación" no le aplica, y por eso todo lo demás sí. Cada desviación
respecto del sistema está enumerada acá, tiene un parámetro y vive bajo
`app/(marketing)/landing.css` o `lib/landing/`. Nada de esto entra en la app.

### Qué se conserva

Los tokens, Archivo y sus pesos, la ausencia de mayúsculas sostenidas y de
tracking abierto, los dos quiebres (`sm` ajusta, `lg` reestructura), `tap` +
`focus-ink` en todo control (el CTA principal mide 52 px), `svh`, `gap-*`, los
botones escritos a mano con `bg-ink text-paper`, el color de veredicto siempre
con sus palabras, los colores del OTBN sin armonizar y el ámbar de texto en
`alerta` para toda advertencia de fuente. El papel y la hoja blanca con filete
de 1 px —que es el documento— siguen significando lo mismo; la landing agrega
una tercera superficie, y una sola: la tinta, enumerada abajo.

### Qué se permite, y con qué número

1. **Movimiento, centralizado.** Los parámetros viven en `lib/landing/movimiento.ts`
   y se repiten como custom properties en `landing.css`; si cambia uno, cambian
   los dos. Revelado secundario: `translateY(12px → 0)` y opacidad, 560 ms,
   `cubic-bezier(0.22, 1, 0.36, 1)`, escalonado de 70 ms con tope de 300 ms.
   Trazo del lote: `pathLength="1"` y `stroke-dashoffset`, 1100 ms, una sola
   vez. Hover del CTA: cambio de superficie y flecha de 3 px en 180 ms, sólo
   bajo `(hover: hover) and (pointer: fine)`, sin mover el área clickeable. La
   escena ligada al scroll escribe cuatro custom properties por frame desde un
   `requestAnimationFrame`, sin estado de React; el capítulo activo cambia tres
   veces en todo el recorrido.
2. **Perspectiva, en un solo lugar.** La escena «Del territorio al documento»
   usa `perspective: 1200px`, `rotateX(24deg)` y `rotateZ(-10deg)` como máximo,
   32 px entre planos y ±20 px de deriva decorativa. El hero lleva una
   inclinación leve y estática. Las capas son cuatro elementos HTML hermanos
   (`preserve-3d` no existe dentro de un `<svg>`), la cámara nunca lleva
   `overflow: hidden` y el margen que necesita la inclinación se paga con
   padding, no con recorte.
3. **Grano de papel.** Un PNG de 64 × 64 en gris de 8 bits, repetido al 2 % de
   opacidad, sólo sobre secciones de papel. Nunca sobre controles, sobre la
   imagen satelital ni sobre la hoja del documento. Es un archivo estático,
   no un canvas.
4. **Escala display.** H1 en `clamp(2.75rem, 1.2rem + 5.2vw, 6.25rem)`, tope
   elegido para que "Un campo no vale lo que mide." entre en dos líneas dentro
   del hero de seis columnas desde los 1024 px; interlineado 1,02, tracking
   −0,04 em y `padding-block: 0.06em` para que los acentos no se recorten; H2
   de 32 a 64 px. Es la segunda aparición del tamaño Display, con la misma
   justificación que la primera: el producto se está presentando.
5. **Un icono en un botón.** La flecha del CTA principal es un SVG inline con
   `aria-hidden`, no un glifo pegado al texto. Es la única excepción a la regla
   de botones sin iconos.
6. **Punto medio en rótulos de lugar.** «Ejemplo ilustrativo · Dpto. Pellegrini,
   Santiago del Estero» es un rótulo cartográfico y puede llevarlo. Las cadenas
   de metadatos no.
7. **Una superficie de tinta, y una sola.** «Mirá el cambio, no lo imagines» va
   a sangre en `landing__tinta`; el texto secundario sobre ella es `line`, nunca
   `ink-soft`, que fue elegido contra papel. Existe porque un comparador de
   barrido es ilegible sobre papel: el marco necesita un fondo que no compita
   con la fotografía. Sobre tinta se invierte el anillo de foco —`focus-ink`
   pinta negro, y sobre negro no hay anillo—, que es la misma regla al revés:
   tinta a plena fuerza con un hueco de papel alrededor, o papel a plena fuerza
   con un hueco de tinta.
8. **El comparador, en la landing.** Misma especificación que el de la app (ver
   «Comparador»): dos imágenes apiladas, `clip-path` porcentual, divisor de 2 px
   blanco con anillo negro de 1 px, `input[type=range]` nativo con
   `accent-color`. Dos diferencias, las dos forzadas: el marco es 4:3 y no
   cuadrado, porque `MARCO`/`VISTA` mandan y el contorno tiene que registrar; y
   sus dos imágenes son bytes commiteados. **La landing nunca llama a Copernicus
   en tiempo de request**: la caché de la app (`.cache/sentinel`) no sobrevive a
   un redeploy y sus rutas exigen sesión. El divisor no lleva transición, así
   que no hay nada que `prefers-reduced-motion` tenga que deshacer.
9. **Divulgación nativa.** Las advertencias de cada fuente viven en
   `<details>/<summary>`. Nativo y no un desplegable de React porque la Regla
   del Contenido Completo pide que la página esté terminada sin JavaScript, y
   sólo un elemento nativo deja el contenido en el HTML inicial y además pliega.
   El `summary` conserva su marcador —no se le toca el `display`, que en
   cualquier valor distinto de `list-item` lo borra— y llega a 3,25 rem con
   padding, no con `flex`. La licencia se imprime adentro, nunca como insignia:
   las capas del MAyDS publican una defectuosa y una insignia leería como aval.
10. **Resultados en dos ejes, nunca fusionados.** La sección muestra dos
    subsecciones bajo un único `<h2>`: «Qué se puede hacer» (aptitud, reparto de
    hectáreas en filas con la misma estructura que las de `PanelAptitud`:
    mismas etiquetas, mismo orden y las mismas cifras, porque las dos salen de
    `filasAptitud`. Difieren en la presentación —la landing usa `font-bold`,
    `py-4`, `gap-x-4` y `leading-relaxed` donde el panel usa `font-semibold`,
    `py-3`, `gap-x-3` y `leading-snug`— y en que las filas de la landing no
    llevan `CAVEAT_APTITUD`: debajo va el rótulo del ejemplo ficticio, y los
    límites de cada capa los da `AlcanceFuentes`) arriba, «Qué se puede
    vender» (exportabilidad, el semáforo de tres filas ya existente) abajo. El
    reparto de aptitud que muestra es un lote enteramente inventado
    (`lib/landing/aptitud-ejemplo.ts`, 312 ha) y lleva el rótulo obligatorio
    «Ejemplo ilustrativo sobre un lote ficticio de …» en el mismo párrafo que
    las hectáreas. **Ninguna hectárea de esta sección sale de**
    `lib/landing/ejemplo-capas.generated.ts`: ese módulo describe el encuadre
    satelital real de Pellegrini Norte, y la Regla del Ejemplo Rotulado ya
    prohíbe atribuirle un resultado — publicar el reparto real de un
    departamento real es exactamente el resultado que esa regla veta, y nadie
    fuera del producto lo leería como ilustrativo.

### Named Rules

**La Regla de la Presentación.** Todo movimiento de la landing vive bajo
`.escena`, `[data-revelar]` y `.cta`; ninguna regla de `landing.css` selecciona
elementos de la app. Si una animación necesita salir de esos selectores, no es
de la landing y no entra.

**La Regla del Ejemplo Rotulado.** Cada figura dice qué es: «Ejemplo
ilustrativo», «Imagen satelital: evidencia visual», «Contiene datos modificados
de Copernicus Sentinel». El encuadre es un lugar real con capas oficiales
reales, y por eso nunca se le atribuye un resultado: sin veredicto, hectáreas,
años, nombre de lote ni RENSPA. El módulo generado
(`lib/landing/ejemplo-capas.generated.ts`) no exporta resúmenes para que la
tentación no exista; las ventanas de adquisición sí, porque son procedencia.

La hoja del documento es la contracara: **no describe el encuadre**. Es un
registro explícitamente ficticio —coordenadas redondeadas a tres decimales, un
cuadrado de ~100 m que nadie confunde con una esquina relevada, y un pie que lo
dice— y por eso puede mostrar un veredicto completo. Antes computaba superficie
y centroide desde `ANILLO_LOTE`, que es el lote del seed: imprimía 501 ha y seis
decimales de un lugar real. Si una figura muestra el encuadre, no lleva
resultado; si muestra un resultado, no es el encuadre.

**La Regla del Contenido Completo.** El H1, la bajada y el CTA están en el HTML
inicial y nunca se ocultan. Los estados ocultos del revelado sólo existen bajo
`html[data-js]` y `prefers-reduced-motion: no-preference`, así que sin
JavaScript o con movimiento reducido la página se ve terminada, no vacía. La
escena apilada es el marcado; la versión sticky es una mejora que el hook
activa sólo en `lg` con movimiento bienvenido, y desactiva si cualquiera de las
dos condiciones deja de cumplirse.

**La Regla de una Sola Proyección.** El bbox que se le pide a Sentinel Hub y
el `viewBox` de todos los SVG son los mismos números (`MARCO` y `VISTA` en
`lib/landing/proyeccion.ts`): la relación de aspecto se calcula con el coseno
de la latitud y se pide la imagen con esas dimensiones exactas. Por eso el
raster y los polígonos registran píxel a píxel sin un segundo sistema de
coordenadas. Gobierna también el cuadro de referencia del comparador: las dos
mitades del barrido se piden con el mismo `MARCO` y el mismo `VISTA`, y con la
misma ganancia, porque una diferencia de procesado se lee como una diferencia
en el terreno. Si el contorno se corre entre una mitad y la otra, el que está
mal es el PNG: se regenera, no se mueve el SVG.

## Do's and Don'ts

### Do:

- **Do** poner `tap` (altura mínima 3,25 rem) en todo lo que se toque: botón,
  campo, fila de control. Es la regla que más define el sistema. La única
  excepción con nombre es `tap-compacto` (2,75 rem) para una acción que comparte
  la fila con un encabezado — y sigue llevando `focus-ink`.
- **Do** acompañar todo color de veredicto con su texto —"Sin observaciones" /
  "Con observaciones" / "No cumple"— en la misma superficie.
- **Do** usar `svh` para toda altura de viewport, y actualizar los cinco
  `calc(100svh - 3.5rem)` si cambiás el alto de la cabecera.
- **Do** construir la profundidad con un borde de 1 px en `line` y un cambio de
  papel a blanco.
- **Do** escribir texto ámbar en `alerta` (#8a5a00), nunca en `amarillo`.
- **Do** marcar avisos con filete izquierdo de 4 px sobre fondo blanco, con **qué
  pasó** en peso 600 y **qué hacer** en `ink-soft`.
- **Do** sobreescribir el tamaño de campos y etiquetas a 1 rem; el 0,875 rem que
  trae shadcn es demasiado chico para esta escena y provoca zoom en iOS.
- **Do** poner `focus-ink` en todo control que reciba foco de teclado, igual que
  ponés `tap`. Van de a dos.

### Don't:

- **Don't** agregar sombras de elevación. El sistema tiene tres sombras y las
  tres resuelven un problema físico: flotar sobre el mapa, leerse sobre satélite,
  o hacer de borde sin sumar ancho.
- **Don't** pasar `essential: true` a una animación de cámara de MapLibre. Hace
  que corra a pesar de `prefers-reduced-motion`, que es exactamente al revés de
  lo que pide la preferencia. El vuelo de 800 ms ya se acorta a 0 cuando alguien
  la tiene puesta.
- **Don't** dar por aislado un control flotante sobre el mapa por ser hermano del
  contenedor de MapLibre. Eso corta la propagación, no el redireccionamiento: un
  elemento que se desmonta en su propio `pointerdown` deja que el `pointerup` se
  vuelva a resolver contra el canvas, y Terra Draw lo lee como un vértice. Lo que
  lo evita es `ignoreMismatchedPointerEvents` en el adapter.
- **Don't** introducir una segunda familia tipográfica ni un tercer peso. Archivo,
  600 y 700.
- **Don't** escribir en mayúsculas sostenidas ni abrir el tracking. No existe en
  el sistema y lee peor en movimiento.
- **Don't** armonizar los colores del OTBN con la paleta. Son los del Ministerio
  y su disonancia es intencional.
- **Don't** usar `field` (#eff1ec) como superficie decorativa. Significa "sin
  dato".
- **Don't** agregar variantes de modo oscuro. El bloque `.dark` de `globals.css`
  es boilerplate de shadcn, no hay `ThemeProvider` montado y sus valores no
  corresponden a esta paleta. El sistema es sólo claro por la escena de uso.
- **Don't** animar transiciones de estado. Fuera del vuelo de cámara del mapa
  (800 ms) el sistema no tiene movimiento, y agregarlo contradice la premisa de
  una pantalla que se lee de un vistazo, en movimiento. La landing es la única
  excepción, documentada en «Landing», y su movimiento no sale de ahí.
- **Don't** hacer del polígono el objetivo táctil en el mapa. Siempre la etiqueta.
- **Don't** usar `space-y-*`. El ritmo vertical del sistema se construye con
  `gap-*`.
