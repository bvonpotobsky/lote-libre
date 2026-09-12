import { describe, expect, it } from "vitest"

import { isVerificationCurrent } from "./freshness"

const HASH_A = "a".repeat(64)
const HASH_B = "b".repeat(64)

describe("isVerificationCurrent", () => {
  it("holds when the verdict was computed from the polygon on file", () => {
    expect(isVerificationCurrent(HASH_A, HASH_A)).toBe(true)
  })

  // The whole reason the column exists: before it, this case was undetectable,
  // so an edited lote kept displaying a verdict about the shape it used to be.
  it("fails once the polygon has been edited", () => {
    expect(isVerificationCurrent(HASH_B, HASH_A)).toBe(false)
  })

  it("does not match on a prefix", () => {
    expect(isVerificationCurrent(HASH_A, HASH_A.slice(0, 32))).toBe(false)
  })
})
