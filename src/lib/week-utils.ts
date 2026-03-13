/**
 * Shared week utilities — canonical implementations for ISO week arithmetic.
 *
 * All functions use the ISO 8601 week-date system where weeks start on Monday
 * and "Jan 4" always falls in week 1. This correctly handles W53 years.
 */

/** Compute the UTC Monday of a given ISO week string like "2026-W11". */
export function weekToISOMonday(week: string): Date | null {
  const m = week.match(/^(\d{4})-W(\d{2})$/)
  if (!m) return null
  const year = parseInt(m[1], 10)
  const wNum = parseInt(m[2], 10)
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const dow = jan4.getUTCDay() === 0 ? 7 : jan4.getUTCDay()
  const monday = new Date(jan4)
  monday.setUTCDate(jan4.getUTCDate() - (dow - 1) + (wNum - 1) * 7)
  return monday
}

/**
 * Get date range display string + Monday/Sunday dates for an ISO week.
 * Display format: "2026年3月10日 - 2026年3月16日"
 */
export function parseWeekDateRange(week: string): { display: string; monday: Date; sunday: Date } | null {
  const monday = weekToISOMonday(week)
  if (!monday) return null
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  const fmt = (d: Date) => `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月${d.getUTCDate()}日`
  return { display: `${fmt(monday)} - ${fmt(sunday)}`, monday, sunday }
}

/**
 * Shift an ISO week string by `delta` weeks using real date arithmetic.
 * Handles W53 correctly (no hardcoded 52).
 */
export function shiftWeek(week: string, delta: number): string {
  const monday = weekToISOMonday(week)
  if (!monday) return week
  monday.setUTCDate(monday.getUTCDate() + delta * 7)
  const d = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

/**
 * Short format like "3月10日 - 3月16日" (no year prefix).
 */
export function formatWeekRange(week: string): string | null {
  const monday = weekToISOMonday(week)
  if (!monday) return null
  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  const fmt = (d: Date) => `${d.getUTCMonth() + 1}月${d.getUTCDate()}日`
  return `${fmt(monday)} - ${fmt(sunday)}`
}
