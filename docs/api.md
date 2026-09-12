# API de Lote Limpio

La API v1 permite a una integración crear, listar y leer los lotes de un usuario.
La API es server-to-server: nunca expongas una API key en un navegador o una
aplicación móvil.

## Autenticación

Enviá la key en el header `Authorization`:

```http
Authorization: Bearer llk_live_...
```

Las keys se crean desde la pantalla `API keys` de la aplicación. El secreto
completo se muestra una sola vez. Si se pierde, hay que revocar la key y crear
otra.

## Crear un lote

```bash
curl https://app.lotelimpio.ar/api/v1/lotes \
  -X POST \
  -H 'Authorization: Bearer llk_live_...' \
  -H 'Content-Type: application/json' \
  -d '{
    "nombre": "Lote Norte",
    "renspa": "00.000.0.00000/00",
    "geometry": {
      "type": "Polygon",
      "coordinates": [[
        [-64.123456, -31.123456],
        [-64.120000, -31.123456],
        [-64.120000, -31.126000],
        [-64.123456, -31.126000],
        [-64.123456, -31.123456]
      ]]
    }
  }'
```

La geometría debe ser GeoJSON `Polygon`, en WGS84 y orden `[longitud, latitud]`.
El anillo debe estar cerrado. La superficie, provincia, centroide, bbox y hash
se calculan en el servidor.

## Listar lotes

```bash
curl https://app.lotelimpio.ar/api/v1/lotes \
  -H 'Authorization: Bearer llk_live_...'
```

La lista devuelve resúmenes sin geometría. El endpoint devuelve únicamente los
lotes pertenecientes al usuario de la key.

## Leer un lote

```bash
curl https://app.lotelimpio.ar/api/v1/lotes/ID_DEL_LOTE \
  -H 'Authorization: Bearer llk_live_...'
```

El detalle incluye la geometría y la última verificación, si existe. Un lote de
otro usuario responde `404`.

## Scopes

- `lotes:read`: listar y leer lotes.
- `lotes:create`: crear lotes.

## Errores

Las respuestas JSON mantienen el formato de la aplicación:

```json
{
  "ok": false,
  "error": {
    "code": "API_KEY_INVALID",
    "message": "La API key no es válida.",
    "hint": "Revisá la key o generá una nueva desde tu cuenta."
  }
}
```

Una geometría inválida devuelve `422` con el motivo concreto. No envíes
superficie ni coordenadas en `[latitud, longitud]`: invertir los ejes puede
producir un polígono válido en el lugar equivocado.
