import { env } from "@/lib/config/env"

/**
 * The location goes in the PATH. The `/:id?p=lat,lon` form that the docs show
 * answers HTTP 200 with `success: false, error: invalid_location` — a failure
 * that never throws, so it reads as "no cloud data here" unless `success` is
 * checked explicitly.
 */
const BASE_URL = "https://data.api.xweather.com/conditions/summary"

/** Xweather answers at most one month per request. Longer spans get chunked. */
const MAX_DAYS_PER_REQUEST = 31
const REQUEST_TIMEOUT_MS = 10_000
/** Requests answer in 120-500 ms, so pacing them costs almost nothing. */
const INTER_REQUEST_DELAY_MS = 250
const RATE_LIMIT_BACKOFF_MS = 3_000

export type DailyCloud = { date: string; cloudPct: number }

export type ClearWindow = {
  /** YYYY-MM-DD */
  from: string
  to: string
  /** Mean daily cloud cover over the window, 0-100. Null when no data. */
  cloudAvgPct: number | null
  /**
   * "xweather" means we picked this window from real cloud data.
   * "fallback" means Xweather gave us nothing and this is the caller's wide
   * range unchanged — Sentinel Hub's own leastCC mosaicking takes over.
   */
  source: "xweather" | "fallback"
}

/* -------------------------------------------------------------------------- */
/* Pure date helpers — all UTC, no Date parsing surprises                      */
/* -------------------------------------------------------------------------- */

const toUtc = (iso: string): number => Date.parse(`${iso}T00:00:00Z`)
const toIso = (ms: number): string => new Date(ms).toISOString().slice(0, 10)
const DAY_MS = 86_400_000

export function addDays(iso: string, days: number): string {
  return toIso(toUtc(iso) + days * DAY_MS)
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS)
}

/**
 * Splits a span into request-sized chunks. October-to-December 2020 is three
 * requests, not one; getting this wrong returns a silent partial series and the
 * "clearest window" is then chosen from whichever month happened to come back.
 */
export function chunkRange(
  from: string,
  to: string,
  maxDays = MAX_DAYS_PER_REQUEST,
): Array<{ from: string; to: string }> {
  if (daysBetween(from, to) < 0) return []

  const chunks: Array<{ from: string; to: string }> = []
  let cursor = from

  while (daysBetween(cursor, to) >= 0) {
    const end = addDays(cursor, maxDays - 1)
    const chunkEnd = daysBetween(end, to) < 0 ? to : end
    chunks.push({ from: cursor, to: chunkEnd })
    cursor = addDays(chunkEnd, 1)
  }

  return chunks
}

/* -------------------------------------------------------------------------- */
/* Window selection                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Lowest-mean-cloud run of `windowDays` CONSECUTIVE calendar days.
 *
 * Consecutiveness is checked against the dates themselves rather than array
 * positions: a gap in the series would otherwise produce a "5-day window"
 * spanning three weeks, and we would hand Sentinel a range with no imagery.
 */
export function pickBestWindow(
  days: DailyCloud[],
  windowDays: number,
): { from: string; to: string; cloudAvgPct: number } | null {
  if (windowDays <= 0 || days.length < windowDays) return null

  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date))
  let best: { from: string; to: string; cloudAvgPct: number } | null = null

  for (let start = 0; start + windowDays <= sorted.length; start += 1) {
    const slice = sorted.slice(start, start + windowDays)
    const first = slice[0]!
    const last = slice[slice.length - 1]!

    if (daysBetween(first.date, last.date) !== windowDays - 1) continue

    const mean =
      slice.reduce((total, day) => total + day.cloudPct, 0) / windowDays

    if (!best || mean < best.cloudAvgPct) {
      best = {
        from: first.date,
        to: last.date,
        cloudAvgPct: Number.parseFloat(mean.toFixed(1)),
      }
    }
  }

  return best
}

/* -------------------------------------------------------------------------- */
/* Transport                                                                   */
/* -------------------------------------------------------------------------- */

type UnknownRecord = Record<string, unknown>

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

const asRecord = (value: unknown): UnknownRecord | null =>
  typeof value === "object" && value !== null ? (value as UnknownRecord) : null

/**
 * Reads one daily period. The live `conditions/summary` response puts cloud
 * cover at `periods[].sky.avg`; the observations endpoint documents it one
 * level deeper, and older material spells it `coverAVG`. Accepting all three
 * costs nothing and removes a whole class of silent "no data" failures.
 */
export function readDailyCloud(period: unknown): DailyCloud | null {
  const record = asRecord(period)
  if (!record) return null

  const summary = asRecord(record.summary) ?? record
  const sky = asRecord(summary.sky) ?? asRecord(record.sky)
  if (!sky) return null

  const rawCloud = sky.avg ?? sky.coverAVG ?? sky.cover
  if (typeof rawCloud !== "number") return null

  const rawDate =
    summary.dateTimeISO ?? record.dateTimeISO ?? summary.date ?? record.date
  if (typeof rawDate !== "string") return null

  const date = rawDate.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null

  return { date, cloudPct: rawCloud }
}

async function fetchChunk(
  centroid: { lon: number; lat: number },
  range: { from: string; to: string },
): Promise<DailyCloud[]> {
  const url = new URL(`${BASE_URL}/${centroid.lat},${centroid.lon}`)
  url.searchParams.set("from", range.from)
  url.searchParams.set("to", range.to)
  // Without plimit the API returns exactly ONE period no matter how wide the
  // range is. A five-day window could then never be found, and every request
  // would degrade to the wide-range fallback without any error to notice.
  url.searchParams.set("plimit", String(daysBetween(range.from, range.to) + 1))
  url.searchParams.set("client_id", env.xweather.clientId)
  url.searchParams.set("client_secret", env.xweather.clientSecret)

  let response = await fetch(url, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  // A per-minute rate limit is transient by definition: one paced retry
  // recovers the window instead of silently degrading the evidence.
  if (response.status === 429) {
    const retryAfter = Number(response.headers.get("retry-after"))
    await sleep(
      Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, 10_000)
        : RATE_LIMIT_BACKOFF_MS,
    )
    response = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  }

  if (!response.ok) throw new Error(`xweather http ${response.status}`)

  const body = (await response.json()) as UnknownRecord
  if (body.success === false) {
    const error = asRecord(body.error)
    throw new Error(
      `xweather ${String(error?.code ?? "unknown")}: ${String(error?.description ?? "")}`,
    )
  }

  const responseField = body.response
  const first = Array.isArray(responseField)
    ? asRecord(responseField[0])
    : asRecord(responseField)
  const periods = first?.periods

  if (!Array.isArray(periods)) return []

  return periods
    .map(readDailyCloud)
    .filter((day): day is DailyCloud => day !== null)
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Picks the clearest `windowDays`-long stretch inside `period`.
 *
 * Never throws: if Xweather is unreachable, rate limited, or has no data for
 * the span, the caller gets its original wide range back tagged as "fallback".
 * Choosing a window is an optimization; failing to choose one must not stop a
 * producer from getting their imagery.
 */
export async function pickClearWindow(
  centroid: { lon: number; lat: number },
  period: { from: string; to: string },
  windowDays = 5,
): Promise<ClearWindow> {
  const fallback: ClearWindow = {
    from: period.from,
    to: period.to,
    cloudAvgPct: null,
    source: "fallback",
  }

  try {
    const chunks = chunkRange(period.from, period.to)
    if (chunks.length === 0) return fallback

    // Sequential and paced, NOT parallel. The account is rate limited per
    // minute, and firing every chunk at once is what trips it: the API answers
    // HTTP 429 `maxhits_min`, which without this looks exactly like "this
    // location has no cloud data". Each request costs ~300 ms, so the whole
    // series still lands well inside the latency budget.
    const days: DailyCloud[] = []

    for (const [index, chunk] of chunks.entries()) {
      if (index > 0) await sleep(INTER_REQUEST_DELAY_MS)
      try {
        days.push(...(await fetchChunk(centroid, chunk)))
      } catch (error) {
        console.warn(
          `[xweather] chunk ${chunk.from}..${chunk.to} failed:`,
          error instanceof Error ? error.message : error,
        )
      }
    }

    if (days.length === 0) {
      console.warn(
        `[xweather] no daily cloud data for ${period.from}..${period.to}`,
      )
      return fallback
    }

    const best = pickBestWindow(days, windowDays)
    if (!best) {
      console.warn(
        `[xweather] only ${days.length} days available, need ${windowDays}`,
      )
      return fallback
    }

    return { ...best, source: "xweather" }
  } catch (error) {
    console.warn("[xweather] falling back to the wide range", error)
    return fallback
  }
}
