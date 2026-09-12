import { describe, expect, it } from "vitest"

import { daysBetween } from "./xweather"
import {
  EUDR_CUTOFF,
  REFERENCE_FLOOR,
  currentSearchWindow,
  isWindowInside,
  referenceSearchWindow,
  searchWindow,
} from "./imagery-window"

/** Day of the year, 1-366, from an ISO date. */
function dayOfYear(iso: string): number {
  const start = Date.parse(`${iso.slice(0, 4)}-01-01T00:00:00Z`)
  return Math.round((Date.parse(`${iso}T00:00:00Z`) - start) / 86_400_000) + 1
}

/** Circular distance between two days of the year, in days. */
function seasonalGap(a: string, b: string): number {
  const raw = Math.abs(dayOfYear(a) - dayOfYear(b))
  return Math.min(raw, 365 - raw)
}

const midpoint = (w: { from: string; to: string }): string =>
  new Date(
    (Date.parse(`${w.from}T00:00:00Z`) + Date.parse(`${w.to}T00:00:00Z`)) / 2,
  )
    .toISOString()
    .slice(0, 10)

/** Every day of a leap year, so 29 February is covered. */
const everyDayOf2028 = Array.from({ length: 366 }, (_, index) => {
  const ms = Date.parse("2028-01-01T00:00:00Z") + index * 86_400_000
  return new Date(ms).toISOString().slice(0, 10)
})

describe("currentSearchWindow", () => {
  it("spans the sixty days ending today", () => {
    expect(currentSearchWindow("2026-09-12")).toEqual({
      from: "2026-07-14",
      to: "2026-09-12",
    })
  })
})

describe("referenceSearchWindow", () => {
  it("mirrors a September request onto the 2020 winter, not its spring", () => {
    // The whole point of the change: the old constant was nailed to
    // 2020-10-01/2020-12-31 and compared spring against winter.
    expect(referenceSearchWindow("2026-09-12")).toEqual({
      from: "2020-07-01",
      to: "2020-09-29",
    })
  })

  it("lands on the old hardcoded range in December, and only in December", () => {
    expect(referenceSearchWindow("2026-12-20")).toEqual({
      from: "2020-10-01",
      to: "2020-12-30",
    })
  })

  it("shifts rather than truncates when it would cross the EUDR cutoff", () => {
    const window = referenceSearchWindow("2027-01-20")
    expect(window).toEqual({ from: "2020-10-02", to: "2020-12-31" })
    expect(daysBetween(window.from, window.to)).toBe(90)
  })

  it("shifts rather than truncates when it would fall out of 2020", () => {
    const window = referenceSearchWindow("2027-02-20")
    expect(window).toEqual({ from: "2020-01-01", to: "2020-03-31" })
    expect(daysBetween(window.from, window.to)).toBe(90)
  })

  it("counts 29 February 2020 when the span crosses it", () => {
    expect(referenceSearchWindow("2027-03-05")).toEqual({
      from: "2020-01-01",
      to: "2020-03-31",
    })
  })

  it("stays inside 2020 with a constant span on every day of a leap year", () => {
    for (const today of everyDayOf2028) {
      const window = referenceSearchWindow(today)
      expect(window.from >= REFERENCE_FLOOR).toBe(true)
      expect(window.to <= EUDR_CUTOFF).toBe(true)
      expect(daysBetween(window.from, window.to)).toBe(90)
    }
  })

  it("keeps the reference span in the same season as the current one", () => {
    // This is the assertion that encodes the bug being fixed. The old constant
    // drifted up to half a year and always in the same direction; anchoring to
    // the mirrored month bounds the gap between the two span centres.
    //
    // Away from the year boundary the bound is the month quantisation. Near it
    // the EUDR cutoff wins: there is no lawful January 2021 baseline, so a
    // January request has to borrow from November 2020 and the gap widens. That
    // is forced by the regulation, not by the anchoring.
    for (const today of everyDayOf2028) {
      const window = referenceSearchWindow(today)
      const clamped =
        window.to === EUDR_CUTOFF || window.from === REFERENCE_FLOOR
      const gap = seasonalGap(
        midpoint(currentSearchWindow(today)),
        midpoint(window),
      )

      expect(gap).toBeLessThanOrEqual(clamped ? 45 : 20)
    }
  })

  it("holds still for a whole month so the reference cache can be reused", () => {
    // A span that slid day by day would miss the containment predicate in
    // findReusableImage every single day, re-fetching the most expensive row.
    const first = referenceSearchWindow("2026-09-01")
    expect(referenceSearchWindow("2026-09-30")).toEqual(first)
    expect(referenceSearchWindow("2026-10-01")).not.toEqual(first)
  })
})

describe("searchWindow", () => {
  it("routes each period to its own rule", () => {
    expect(searchWindow("current", "2026-09-12")).toEqual(
      currentSearchWindow("2026-09-12"),
    )
    expect(searchWindow("reference", "2026-09-12")).toEqual(
      referenceSearchWindow("2026-09-12"),
    )
  })
})

describe("isWindowInside", () => {
  const span = { from: "2020-07-01", to: "2020-09-29" }

  it("accepts a window contained in the span, edges included", () => {
    expect(isWindowInside({ from: "2020-08-01", to: "2020-08-05" }, span)).toBe(
      true,
    )
    expect(isWindowInside(span, span)).toBe(true)
  })

  it("rejects a window that overruns either edge by a day", () => {
    expect(isWindowInside({ from: "2020-06-30", to: "2020-07-04" }, span)).toBe(
      false,
    )
    expect(isWindowInside({ from: "2020-09-26", to: "2020-09-30" }, span)).toBe(
      false,
    )
  })
})
