export const API_KEY_PREFIX = "llk_live_"

export function isApiKeyFormat(value: string): boolean {
  return new RegExp(`^${API_KEY_PREFIX}[A-Za-z0-9_-]{43}$`).test(value)
}
