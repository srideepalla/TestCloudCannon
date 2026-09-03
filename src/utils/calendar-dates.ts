/**
 * Shared date formatting for calendar events (`src/data/calendar.json`).
 *
 * Events carry a required start `date` and an optional `endDate`. When
 * `endDate` is present and later than the start, the event is a range and both
 * the homepage hero cards and the calendar page render it as one.
 *
 * All parsing is done in UTC so a build machine's timezone can never shift an
 * event onto the wrong day.
 */

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/** En dash, with hair spaces for the inline form so it breathes next to text. */
const DASH = "–";

export type CalendarEvent = {
  date: string;
  endDate?: string | null;
  title?: string | null;
  label?: string | null;
  description?: string | null;
};

/**
 * Parse an event date string as a UTC date, or null when missing/unparseable.
 *
 * CloudCannon seeds a new event with `date: ""`, so an unparseable value is a
 * normal editing state, not a bug — callers skip those rather than rendering
 * "NaN".
 */
function parseEventDate(value?: string | null): Date | null {
  if (!value) return null;

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * The end date, but only when it is genuinely after the start. A missing,
 * unparseable, equal or backwards `endDate` collapses the event back to a
 * single day so bad data degrades to the old behaviour instead of rendering
 * a nonsense range.
 */
function resolveEndDate(date?: string | null, endDate?: string | null): Date | null {
  const start = parseEventDate(date);
  const end = parseEventDate(endDate);

  if (!start || !end) return null;

  return end.getTime() > start.getTime() ? end : null;
}

/**
 * The date that decides whether an event is in the past — the end of a range,
 * otherwise the start. Keeps a multi-day event on the homepage while it is
 * still running.
 *
 * @returns an ISO date string, or null when the event has no usable date.
 */
export function getEffectiveEndDate(date?: string | null, endDate?: string | null): string | null {
  const start = parseEventDate(date);

  if (!start) return null;

  return (resolveEndDate(date, endDate) ?? start).toISOString();
}

export type CalendarDateParts = {
  month: string;
  day: string;
  year: string;
  isRange: boolean;
};

/**
 * Stacked month / day / year parts for the calendar page cards, where a range
 * widens each slot in place rather than adding a second date block:
 *
 * - single day        → `OCT` / `28`      / `2026`
 * - same month        → `OCT` / `28–30`   / `2026`
 * - crosses a month   → `OCT–NOV` / `28–02` / `2026`
 * - crosses a year    → `OCT–NOV` / `28–02` / `2026–2027`
 *
 * @returns null when the event has no usable start date.
 */
export function getCalendarDateParts(
  date?: string | null,
  endDate?: string | null,
): CalendarDateParts | null {
  const start = parseEventDate(date);

  if (!start) return null;

  const end = resolveEndDate(date, endDate);

  const startMonth = MONTHS[start.getUTCMonth()];
  const startDay = String(start.getUTCDate()).padStart(2, "0");
  const startYear = String(start.getUTCFullYear());

  if (!end) {
    return { month: startMonth, day: startDay, year: startYear, isRange: false };
  }

  const endMonth = MONTHS[end.getUTCMonth()];
  const endDay = String(end.getUTCDate()).padStart(2, "0");
  const endYear = String(end.getUTCFullYear());

  return {
    month: startMonth === endMonth && startYear === endYear ? startMonth : `${startMonth}${DASH}${endMonth}`,
    day: `${startDay}${DASH}${endDay}`,
    year: startYear === endYear ? startYear : `${startYear}${DASH}${endYear}`,
    isRange: true,
  };
}

/**
 * Single-line date for the homepage hero cards:
 *
 * - single day        → `28 OCT 2026`
 * - same month        → `28–30 OCT 2026`
 * - crosses a month   → `28 OCT – 2 NOV 2026`
 * - crosses a year    → `28 OCT 2026 – 2 NOV 2027`
 *
 * @returns null when the event has no usable start date.
 */
export function formatCalendarDateRange(date?: string | null, endDate?: string | null): string | null {
  const start = parseEventDate(date);

  if (!start) return null;

  const end = resolveEndDate(date, endDate);

  const startDay = start.getUTCDate();
  const startMonth = MONTHS[start.getUTCMonth()];
  const startYear = start.getUTCFullYear();

  if (!end) return `${startDay} ${startMonth} ${startYear}`;

  const endDay = end.getUTCDate();
  const endMonth = MONTHS[end.getUTCMonth()];
  const endYear = end.getUTCFullYear();

  // Same month and year: collapse to one month/year, e.g. "28–30 OCT 2026".
  if (startMonth === endMonth && startYear === endYear) {
    return `${startDay}${DASH}${endDay} ${startMonth} ${startYear}`;
  }

  // Same year: name the year once, e.g. "28 OCT – 2 NOV 2026".
  if (startYear === endYear) {
    return `${startDay} ${startMonth} ${DASH} ${endDay} ${endMonth} ${startYear}`;
  }

  return `${startDay} ${startMonth} ${startYear} ${DASH} ${endDay} ${endMonth} ${endYear}`;
}
