import { useState, useCallback } from 'react';
import { bookings as initialBookings } from '@/data/mockData';
import type { Booking } from '@/types/salon';

/**
 * Bookings hook. `userId` will be enforced once auth is wired. Today returns
 * the global mock list. Local cancel mutation kept here so all booking
 * mutations live behind one hook.
 */
export const useBookings = (userId?: string) => {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);

  const cancelBooking = useCallback((id: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'cancelled' as const } : b)),
    );
  }, []);

  return {
    bookings,
    isLoading: false,
    error: null,
    cancelBooking,
  };
};
