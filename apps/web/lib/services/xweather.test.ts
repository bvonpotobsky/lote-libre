import { describe, expect, it } from "vitest"

import {
  addDays,
  chunkRange,
  daysBetween,
  pickBestWindow,
  readDailyCloud,
  type DailyCloud,
} from "./xweather"

/**
 * Real Xweather daily cloud cover for Pampa de los Guanacos, Santiago del
 * Estero (-26.0, -62.5) in October 2020 — the reference period of the demo.
 * Captured from a live response, not invented.
 */
const OCTOBER_2020: DailyCloud[] = [
  ["2020-10-01", 9.9583333333333],
  ["2020-10-02", 48.958333333333],
  ["2020-10-03", 48.916666666667],
  ["2020-10-04", 83.916666666667],
  ["2020-10-05", 28.166666666667],
  ["2020-10-06", 24.791666666667],
  ["2020-10-07", 30.041666666667],
  ["2020-10-08", 31.458333333333],
  ["2020-10-09", 83.291666666667],
  ["2020-10-10", 22.708333333333],
  ["2020-10-11", 4.375],
  ["2020-10-12", 0],
  ["2020-10-13", 40.958333333333],
  ["2020-10-14", 77.333333333333],
  ["2020-10-15", 97.916666666667],
  ["2020-10-16", 81.875],
  ["2020-10-17", 65.208333333333],
  ["2020-10-18", 8.25],
  ["2020-10-19", 1.75],
  ["2020-10-20", 43.083333333333],
  ["2020-10-21", 44.875],
  ["2020-10-22", 88.291666666667],
  ["2020-10-23", 68.541666666667],
  ["2020-10-24", 43.25],
  ["2020-10-25", 43.041666666667],
  ["2020-10-26", 34.958333333333],
  ["2020-10-27", 0],
  ["2020-10-28", 27.291666666667],
  ["2020-10-29", 97.083333333333],
  ["2020-10-30", 53],
  ["2020-10-31", 11],
].map(([date, cloudPct]) => ({
  date: date as string,
  cloudPct: cloudPct as number,
}))

describe("date helpers", () => {
  it("adds days across a month boundary", () => {
    expect(addDays("2020-10-31", 1)).toBe("2020-11-01")
    expect(addDays("2021-03-01", -1)).toBe("2021-02-28")
  })

  it("counts days across a leap day", () => {
    expect(daysBetween("2020-02-28", "2020-03-01")).toBe(2)
  })
})

describe("chunkRange", () => {
  it("splits the 2020 reference period into three requests", () => {
    const chunks = chunkRange("2020-10-01", "2020-12-31")
    expect(chunks).toHaveLength(3)
    expect(chunks[0]!.from).toBe("2020-10-01")
    expect(chunks.at(-1)!.to).toBe("2020-12-31")
  })

  it("covers every day exactly once, with no gap and no overlap", () => {
    const chunks = chunkRange("2020-10-01", "2020-12-31")
    for (let i = 1; i < chunks.length; i += 1) {
      expect(chunks[i]!.from).toBe(addDays(chunks[i - 1]!.to, 1))
    }
    const covered = chunks.reduce(
      (total, chunk) => total + daysBetween(chunk.from, chunk.to) + 1,
      0,
    )
    expect(covered).toBe(daysBetween("2020-10-01", "2020-12-31") + 1)
  })

  it("splits a 60-day current window into two requests", () => {
    expect(chunkRange("2026-07-14", "2026-09-11")).toHaveLength(2)
  })

  it("keeps a short range as a single request", () => {
    expect(chunkRange("2026-09-01", "2026-09-05")).toEqual([
      { from: "2026-09-01", to: "2026-09-05" },
    ])
  })

  it("returns nothing for an inverted range", () => {
    expect(chunkRange("2026-09-10", "2026-09-01")).toEqual([])
  })
})

describe("pickBestWindow", () => {
  it("finds the clearest five days of October 2020", () => {
    const best = pickBestWindow(OCTOBER_2020, 5)
    // 8-12 Oct: 31.5, 83.3, 22.7, 4.4, 0 -> mean 28.4, the lowest run available.
    expect(best).toEqual({
      from: "2020-10-08",
      to: "2020-10-12",
      cloudAvgPct: 28.4,
    })
  })

  it("beats every other window it could have chosen", () => {
    const best = pickBestWindow(OCTOBER_2020, 5)!
    for (let i = 0; i + 5 <= OCTOBER_2020.length; i += 1) {
      const mean =
        OCTOBER_2020.slice(i, i + 5).reduce((t, d) => t + d.cloudPct, 0) / 5
      expect(best.cloudAvgPct).toBeLessThanOrEqual(
        Number.parseFloat(mean.toFixed(1)),
      )
    }
  })

  it("refuses a window that spans a gap in the series", () => {
    const gapped: DailyCloud[] = [
      { date: "2020-10-01", cloudPct: 0 },
      { date: "2020-10-02", cloudPct: 0 },
      { date: "2020-10-03", cloudPct: 0 },
      { date: "2020-10-04", cloudPct: 0 },
      // 05-09 missing: a naive window would report 01-10 as five clear days
      { date: "2020-10-10", cloudPct: 50 },
      { date: "2020-10-11", cloudPct: 50 },
      { date: "2020-10-12", cloudPct: 50 },
      { date: "2020-10-13", cloudPct: 50 },
      { date: "2020-10-14", cloudPct: 50 },
    ]
    expect(pickBestWindow(gapped, 5)).toEqual({
      from: "2020-10-10",
      to: "2020-10-14",
      cloudAvgPct: 50,
    })
  })

  it("sorts an out-of-order series before choosing", () => {
    const shuffled = [...OCTOBER_2020].reverse()
    expect(pickBestWindow(shuffled, 5)?.from).toBe("2020-10-08")
  })

  it("returns null when there are fewer days than the window", () => {
    expect(pickBestWindow(OCTOBER_2020.slice(0, 3), 5)).toBeNull()
    expect(pickBestWindow([], 5)).toBeNull()
  })
})

describe("readDailyCloud", () => {
  it("reads the nested summary shape", () => {
    expect(
      readDailyCloud({
        summary: { dateTimeISO: "2020-10-08T00:00:00-03:00", sky: { avg: 31.5 } },
      }),
    ).toEqual({ date: "2020-10-08", cloudPct: 31.5 })
  })

  it("reads the flat shape the other endpoint documents", () => {
    expect(
      readDailyCloud({ dateTimeISO: "2020-10-08T00:00:00Z", sky: { avg: 31.5 } }),
    ).toEqual({ date: "2020-10-08", cloudPct: 31.5 })
  })

  it("reads the legacy coverAVG spelling", () => {
    expect(
      readDailyCloud({ date: "2020-10-08", sky: { coverAVG: 12 } }),
    ).toEqual({ date: "2020-10-08", cloudPct: 12 })
  })

  it("ignores a period with no sky data instead of reading it as clear", () => {
    expect(readDailyCloud({ dateTimeISO: "2020-10-08T00:00:00Z" })).toBeNull()
    expect(readDailyCloud({ sky: { avg: 10 } })).toBeNull()
    expect(readDailyCloud(null)).toBeNull()
  })
})
