/**
 * Traffic-light status color system — single source of truth.
 *
 * Color language:
 *  - Waiting (today)  → Red    (urgent / queue)
 *  - Serving          → Amber  (in progress)
 *  - Completed        → Green  (done)
 *  - Cancelled        → Slate  (inactive / muted)
 *  - Future Waiting   → Sky    (scheduled)
 */

export type AppointmentStatus = 'waiting' | 'serving' | 'completed' | 'cancelled';

export interface StatusPalette {
  /** Solid color for the small timeline node circle */
  node: string;
  /** Ring around the timeline node */
  ring: string;
  /** Vertical track segment color */
  track: string;
  /** Left border color for cards (use as `border-l-<color>`) */
  borderL: string;
  /** Soft card background tint */
  bg: string;
  /** Tag chip background */
  tagBg: string;
  /** Tag chip text */
  tagText: string;
  /** Human label */
  label: string;
}

export const getStatusPalette = (
  status: AppointmentStatus,
  opts?: { isFuture?: boolean }
): StatusPalette => {
  // Future scheduled waiting → Sky
  if (status === 'waiting' && opts?.isFuture) {
    return {
      node: 'bg-sky-500',
      ring: 'ring-sky-200 dark:ring-sky-900',
      track: 'bg-sky-400/60',
      borderL: 'border-l-sky-500',
      bg: 'bg-sky-50 dark:bg-sky-950/30',
      tagBg: 'bg-sky-100 dark:bg-sky-900/40',
      tagText: 'text-sky-700 dark:text-sky-300',
      label: 'Scheduled',
    };
  }

  switch (status) {
    case 'waiting':
      return {
        node: 'bg-red-500',
        ring: 'ring-red-200 dark:ring-red-900',
        track: 'bg-red-400/60',
        borderL: 'border-l-red-500',
        bg: 'bg-red-50 dark:bg-red-950/30',
        tagBg: 'bg-red-100 dark:bg-red-900/40',
        tagText: 'text-red-700 dark:text-red-300',
        label: 'Waiting',
      };
    case 'serving':
      return {
        node: 'bg-amber-500',
        ring: 'ring-amber-200 dark:ring-amber-900',
        track: 'bg-amber-400/60',
        borderL: 'border-l-amber-500',
        bg: 'bg-amber-50 dark:bg-amber-950/30',
        tagBg: 'bg-amber-100 dark:bg-amber-900/40',
        tagText: 'text-amber-700 dark:text-amber-300',
        label: 'Serving',
      };
    case 'completed':
      return {
        node: 'bg-emerald-500',
        ring: 'ring-emerald-200 dark:ring-emerald-900',
        track: 'bg-emerald-400/60',
        borderL: 'border-l-emerald-500',
        bg: 'bg-emerald-50/60 dark:bg-emerald-950/20',
        tagBg: 'bg-emerald-100 dark:bg-emerald-900/40',
        tagText: 'text-emerald-700 dark:text-emerald-300',
        label: 'Finished',
      };
    case 'cancelled':
      return {
        node: 'bg-slate-400',
        ring: 'ring-slate-200 dark:ring-slate-800',
        track: 'bg-slate-300/60 dark:bg-slate-700/50',
        borderL: 'border-l-slate-400',
        bg: 'bg-slate-50 dark:bg-slate-900/40',
        tagBg: 'bg-slate-200 dark:bg-slate-800',
        tagText: 'text-slate-600 dark:text-slate-300',
        label: 'Cancelled',
      };
  }
};
