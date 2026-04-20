/**
 * Booking mutations — backend-ready stubs.
 *
 * The payload shape MIRRORS the final Supabase `bookings` table contract
 * (see .lovable/BACKEND_SCHEMA.md). When swapping to the real backend, only
 * the body of `rescheduleBooking` changes — callers stay identical.
 *
 * DB column mapping:
 *   bookingId   → id           (UUID)
 *   date        → date         (DATE, 'YYYY-MM-DD' — NOT a timestamp)
 *   time        → time         (TEXT, e.g. "10:30 AM")
 *   artistId    → artist_id    (UUID, nullable → auto-assign)
 *   (server)    → status       = 'upcoming' (reset from 'late' if applicable)
 *   (server)    → updated_at   = now()
 */

export interface RescheduleRequest {
  bookingId: string;
  /** Calendar date in 'YYYY-MM-DD'. Timezone-safe — matches DB DATE column. */
  date: string;
  /** Display time slot, e.g. "10:30 AM". Matches DB TEXT column. */
  time: string;
  /** Artist UUID, or null to let the salon auto-assign. */
  artistId?: string | null;
}

export interface RescheduleResponse {
  ok: boolean;
  bookingId: string;
  error?: string;
}

/** Convert a JS Date to 'YYYY-MM-DD' in the user's local TZ (matches DB DATE). */
export { toLocalDateStr as toDateOnly } from '@/lib/dateOnly';

/**
 * Stub — resolves successfully after 500ms.
 *
 * Backend swap (one-line change). Replace the body with:
 *
 *   const { error } = await supabase
 *     .from('bookings')
 *     .update({
 *       date: req.date,           // 'YYYY-MM-DD'
 *       time: req.time,           // '10:30 AM'
 *       artist_id: req.artistId,  // UUID | null
 *       status: 'upcoming',       // reset late/missed flags
 *     })
 *     .eq('id', req.bookingId)
 *     .eq('user_id', (await supabase.auth.getUser()).data.user!.id); // RLS guard
 *   return { ok: !error, bookingId: req.bookingId, error: error?.message };
 *
 * Then invalidate the bookings query in the caller.
 */
export const rescheduleBooking = async (
  req: RescheduleRequest,
): Promise<RescheduleResponse> => {
  // Validate payload shape early — catches caller bugs before they hit the DB.
  if (!req.bookingId) {
    return { ok: false, bookingId: '', error: 'bookingId is required' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(req.date)) {
    return {
      ok: false,
      bookingId: req.bookingId,
      error: `date must be 'YYYY-MM-DD', got '${req.date}'`,
    };
  }
  if (!req.time) {
    return { ok: false, bookingId: req.bookingId, error: 'time is required' };
  }

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.info('[bookings] rescheduleBooking (stub)', req);
  }
  await new Promise((r) => setTimeout(r, 500));
  return { ok: true, bookingId: req.bookingId };
};
