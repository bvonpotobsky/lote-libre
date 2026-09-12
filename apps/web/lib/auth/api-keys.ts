import { createHmac, randomBytes } from "node:crypto"

import { and, desc, eq, isNull } from "drizzle-orm"

import { env } from "@/lib/config/env"
import { db } from "@/lib/db"
import { apiKeys, type ApiKeyScope } from "@/lib/db/schema"
import { ApiError } from "@/lib/http/responses"
import { nanoid } from "nanoid"
import { API_KEY_PREFIX, isApiKeyFormat } from "./api-key-format"

const MAX_ACTIVE_KEYS = 10

export type ApiKeyIdentity = {
  userId: string
  apiKeyId: string
  scopes: ApiKeyScope[]
  authType: "api_key"
}

function hashSecret(secret: string): Buffer {
  return createHmac("sha256", env.auth.secret).update(secret).digest()
}

function parseBearer(request: Request): string | null {
  const value = request.headers.get("authorization")
  if (!value) return null
  const match = /^Bearer\s+([^\s]+)$/i.exec(value)
  return match?.[1] ?? ""
}

export async function createApiKey(
  userId: string,
  input: { name: string; scopes: ApiKeyScope[]; expiresAt?: Date | null },
) {
  const active = await db
    .select({ id: apiKeys.id })
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)))

  if (active.length >= MAX_ACTIVE_KEYS) {
    throw new ApiError("API_KEY_LIMIT")
  }

  const secret = `${API_KEY_PREFIX}${randomBytes(32).toString("base64url")}`
  const keyHash = hashSecret(secret).toString("hex")
  const keyPrefix = secret.slice(0, API_KEY_PREFIX.length + 8)

  const [row] = await db
    .insert(apiKeys)
    .values({
      id: `key_${nanoid(16)}`,
      userId,
      name: input.name.trim(),
      keyPrefix,
      keyHash,
      scopes: input.scopes,
      expiresAt: input.expiresAt ?? null,
    })
    .returning({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      scopes: apiKeys.scopes,
      createdAt: apiKeys.createdAt,
      expiresAt: apiKeys.expiresAt,
    })

  return { ...row!, secret }
}

export async function listApiKeys(userId: string) {
  return db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      scopes: apiKeys.scopes,
      createdAt: apiKeys.createdAt,
      expiresAt: apiKeys.expiresAt,
      revokedAt: apiKeys.revokedAt,
      lastUsedAt: apiKeys.lastUsedAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId))
    .orderBy(desc(apiKeys.createdAt))
}

export async function revokeApiKey(userId: string, id: string): Promise<boolean> {
  const rows = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(apiKeys.id, id),
        eq(apiKeys.userId, userId),
        isNull(apiKeys.revokedAt),
      ),
    )
    .returning({ id: apiKeys.id })

  return rows.length > 0
}

export async function requireApiKey(
  request: Request,
  scope: ApiKeyScope,
): Promise<ApiKeyIdentity> {
  const secret = parseBearer(request)
  if (secret === null) throw new ApiError("API_KEY_REQUIRED")
  if (!isApiKeyFormat(secret)) throw new ApiError("API_KEY_INVALID")

  const digest = hashSecret(secret)
  const [row] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, digest.toString("hex")))

  if (!row) throw new ApiError("API_KEY_INVALID")
  if (row.revokedAt) throw new ApiError("API_KEY_REVOKED")
  if (row.expiresAt && row.expiresAt <= new Date()) {
    throw new ApiError("API_KEY_EXPIRED")
  }
  if (!row.scopes.includes(scope)) throw new ApiError("INSUFFICIENT_SCOPE")

  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, row.id))

  return {
    userId: row.userId,
    apiKeyId: row.id,
    scopes: row.scopes,
    authType: "api_key",
  }
}
