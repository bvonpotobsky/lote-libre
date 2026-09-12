import { NextResponse } from "next/server"

/**
 * Every route handler answers with this shape. `message` and `hint` are the
 * Spanish strings the interface renders verbatim: the useful wording is written
 * once, on the server, where we actually know what went wrong — so the client
 * never needs a switch statement to translate a code into something a producer
 * can act on.
 *
 * `message` says WHAT happened. `hint` says WHAT TO DO about it.
 */
export type ApiOk<T> = { ok: true; data: T }
export type ApiErr = {
  ok: false
  error: { code: ErrorCode; message: string; hint?: string }
}
export type ApiResult<T> = ApiOk<T> | ApiErr

export type ErrorCode = keyof typeof ERRORS

type ErrorSpec = { status: number; message: string; hint?: string }

export const ERRORS = {
  UNAUTHORIZED: {
    status: 401,
    message: "Tenés que iniciar sesión.",
    hint: "Ingresá con tu email y contraseña para ver tus lotes.",
  },
  NOT_FOUND: {
    status: 404,
    message: "No encontramos ese lote.",
    hint: "Puede que lo hayas borrado, o que el enlace esté mal.",
  },
  INVALID_BODY: {
    status: 422,
    message: "Los datos que mandaste no son válidos.",
    hint: "Revisá el nombre y la geometría del lote.",
  },

  /* --- Geometry ---------------------------------------------------------- */
  GEOMETRY_NOT_POLYGON: {
    status: 422,
    message: "El archivo no contiene un polígono.",
    hint: "Un lote tiene que ser un área cerrada. Si el KML trae puntos o recorridos, exportá el contorno del lote en lugar de eso.",
  },
  GEOMETRY_SELF_INTERSECTING: {
    status: 422,
    message: "El polígono se cruza a sí mismo.",
    hint: "Volvé a dibujar el contorno sin que los lados se crucen. Si viene de un archivo, corregilo en tu plataforma antes de exportar.",
  },
  GEOMETRY_OUTSIDE_ARGENTINA: {
    status: 422,
    message: "El lote queda fuera de la Argentina.",
    hint: "Fijate que el archivo esté en coordenadas geográficas (latitud y longitud). Si viene en Gauss-Krüger o POSGAR, hay que convertirlo antes de importarlo.",
  },
  GEOMETRY_TOO_SMALL: {
    status: 422,
    message: "El lote mide menos de media hectárea.",
    hint: "Verificá que dibujaste el contorno completo y no solo una esquina.",
  },
  GEOMETRY_TOO_LARGE: {
    status: 422,
    message: "El lote supera las 100.000 hectáreas.",
    hint: "Puede que hayas importado el campo entero o varios lotes juntos. Se carga un lote por vez.",
  },

  /* --- File import ------------------------------------------------------- */
  FILE_UNREADABLE: {
    status: 422,
    message: "No pudimos leer el archivo.",
    hint: "Tiene que ser un KML o un GeoJSON. Si lo exportaste como KMZ, descomprimilo primero y subí el KML de adentro.",
  },
  FILE_MULTIPLE_POLYGONS: {
    status: 422,
    message: "El archivo tiene más de un polígono.",
    hint: "Elegí cuál de los lotes querés cargar. Se carga uno por vez.",
  },

  /* --- Verification and evidence ----------------------------------------- */
  VERIFICATION_PENDING: {
    status: 409,
    message: "Todavía no verificaste este lote.",
    hint: "Verificalo primero: el documento necesita el veredicto y las fuentes consultadas.",
  },
  PROVINCE_NOT_COVERED: {
    status: 422,
    message: "Todavía no tenemos las capas de esta provincia.",
    hint: "Por ahora cubrimos Córdoba, Santiago del Estero y Chaco. El lote queda guardado y lo vas a poder verificar cuando sumemos la tuya.",
  },
  FOREST_LOSS_UNAVAILABLE: {
    status: 502,
    message: "No pudimos consultar la capa de pérdida forestal.",
    hint: "El lote quedó guardado y la verificación quedó pendiente. Reintentala en un momento.",
  },
  SENTINEL_UNAVAILABLE: {
    status: 502,
    message: "Copernicus no respondió.",
    hint: "El lote quedó guardado. Probá de nuevo en un momento; las imágenes no afectan el veredicto.",
  },
  IMAGERY_EMPTY: {
    status: 200,
    message:
      "El rango de fechas no tuvo imágenes con menos de 30% de nubes.",
    hint: "Probá ampliando el rango de fechas.",
  },

  INTERNAL: {
    status: 500,
    message: "Algo falló de nuestro lado.",
    hint: "Probá de nuevo. Tu lote quedó guardado igual.",
  },
} as const satisfies Record<string, ErrorSpec>

export function ok<T>(data: T, init?: ResponseInit): NextResponse<ApiOk<T>> {
  return NextResponse.json({ ok: true as const, data }, init)
}

export function fail(
  code: ErrorCode,
  overrides?: { message?: string; hint?: string },
): NextResponse<ApiErr> {
  const spec: ErrorSpec = ERRORS[code]
  return NextResponse.json(
    {
      ok: false as const,
      error: {
        code,
        message: overrides?.message ?? spec.message,
        hint: overrides?.hint ?? spec.hint,
      },
    },
    { status: spec.status },
  )
}

/** Thrown by guards; converted to a response by `withRoute`. */
export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly overrides?: { message?: string; hint?: string },
  ) {
    super(code)
    this.name = "ApiError"
  }
}

/**
 * Wraps a handler so an uncaught throw becomes a typed JSON error instead of
 * Next's HTML error page — which a fetch() on the client cannot parse.
 */
export function withRoute<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await handler(...args)
    } catch (error) {
      if (error instanceof ApiError) return fail(error.code, error.overrides)
      console.error("[route] unhandled error", error)
      return fail("INTERNAL")
    }
  }
}
