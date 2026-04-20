/**
 * Local-timezone-safe `YYYY-MM-DD` formatter.
 *
 * CRITICAL: Never use `date.toISOString().split('T')[0]` — that converts to UTC
 * and silently shifts the date by ±1 day for users east/west of UTC (e.g. IST
 * users at 11pm get tomorrow's date). All booking/break/leave validation must
 * use the user's LOCAL calendar date so that "today" matches what the
 * DateChipStrip (which uses local getDate()) shows.
 *
 * Output matches the Postgres `DATE` column format — drop-in for Supabase.
 */
export const toLocalDateStr = (d: Date = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Today's date as 'YYYY-MM-DD' in the user's local timezone. */
export const todayLocalStr = (): string => toLocalDateStr(new Date());

/**
 * Parse a 'YYYY-MM-DD' string into a Date at LOCAL midnight (NOT UTC).
 *
 * CRITICAL: `new Date('2026-04-21')` is parsed as UTC midnight by spec, which
 * for any non-UTC timezone makes `.getDate()` / `.toLocaleDateString()` return
 * the WRONG calendar day. Always use this helper for ISO date strings.
 *
 * Returns `null` for malformed input (e.g. 'Feb 31', empty, undefined).
 * Use this everywhere you have a 'YYYY-MM-DD' from the DB or a <input type="date">.
 */
export const parseLocalDate = (iso: string | null | undefined): Date | null => {
  if (!iso) return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const result = new Date(y, mo - 1, d); // local midnight
  // Reject impossible dates (e.g. Feb 31 silently rolls to March)
  if (result.getFullYear() !== y || result.getMonth() !== mo - 1 || result.getDate() !== d) {
    return null;
  }
  return result;
};

/**
 * Format a 'YYYY-MM-DD' string for display in the user's locale.
 * Safe replacement for `new Date(iso).toLocaleDateString(...)`.
 */
export const formatLocalDate = (
  iso: string | null | undefined,
  opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' },
  locale = 'en-IN',
): string => {
  const d = parseLocalDate(iso);
  return d ? d.toLocaleDateString(locale, opts) : '';
};
