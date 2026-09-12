import { addDays, daysBetween } from "./xweather"

export type ImagePeriod = "reference" | "current"

export type SearchWindow = { from: string; to: string }

/** EUDR's deforestation-free cutoff. A baseline after this proves nothing. */
export const EUDR_CUTOFF = "2020-12-31"
/** The reference chip reads "2020", so the window has to actually be in 2020. */
export const REFERENCE_FLOOR = "2020-01-01"

export const CURRENT_SEARCH_DAYS = 60
/** Half-width of the reference span: 91 days, the same three Xweather chunks
 *  the old hardcoded October-to-December range already cost. */
export const REFERENCE_SPREAD_DAYS = 45
/** Length of the clear window hunted inside a span, in days. */
export const CLEAR_WINDOW_DAYS = 5

/** The sixty days ending today — recent enough to be worth showing. */
export function currentSearchWindow(today: string): SearchWindow {
  return { from: addDays(today, -CURRENT_SEARCH_DAYS), to: today }
}

/**
 * The 2020 span covering the same time of year as the current one.
 *
 * NDVI is a measure of green leaf, and green leaf is seasonal. Comparing a
 * spring 2020 baseline against a winter image — which a fixed
 * October-to-December range does for nine months of every year — shows
 * phenology, not clearing: standing dry Chaco in August reads as low as bare
 * ground, and the slider paints it the same colour. Mirroring the window puts
 * both sides in the same season, so what is left of the difference is change on
 * the ground.
 *
 * The anchor is quantised to the middle of the mirrored month rather than
 * tracking the day. A span that slid daily would fall out of the containment
 * predicate in `findReusableImage` every single day and re-fetch the most
 * expensive row in the cache; this one moves on the first of the month.
 *
 * Both clamps translate the span instead of truncating it, so its length — and
 * therefore the number of Xweather requests — never changes, and the result
 * always lands inside 2020. They cannot both fire: 91 days fit in a year with
 * room to spare.
 */
export function referenceSearchWindow(today: string): SearchWindow {
  const mid = addDays(today, -Math.round(CURRENT_SEARCH_DAYS / 2))
  const anchor = `2020-${mid.slice(5, 7)}-15`

  let from = addDays(anchor, -REFERENCE_SPREAD_DAYS)
  let to = addDays(anchor, REFERENCE_SPREAD_DAYS)

  const over = daysBetween(EUDR_CUTOFF, to)
  if (over > 0) {
    from = addDays(from, -over)
    to = addDays(to, -over)
  }

  const under = daysBetween(from, REFERENCE_FLOOR)
  if (under > 0) {
    from = addDays(from, under)
    to = addDays(to, under)
  }

  return { from, to }
}

export function searchWindow(
  period: ImagePeriod,
  today: string,
): SearchWindow {
  return period === "reference"
    ? referenceSearchWindow(today)
    : currentSearchWindow(today)
}

/** Whether a window already chosen still sits inside the span we would search. */
export function isWindowInside(
  window: SearchWindow,
  span: SearchWindow,
): boolean {
  return window.from >= span.from && window.to <= span.to
}
