import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'customer_booking_draft';

export interface BookingDraft {
  salonId: string;
  step: 'datetime' | 'barber' | 'summary';
  selectedDate: string; // ISO
  selectedTime: string | null;
  selectedBarber: string | null;
  autoAssign: boolean;
}

interface AllDrafts {
  [salonId: string]: BookingDraft;
}

const readAll = (): AllDrafts => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AllDrafts) : {};
  } catch {
    return {};
  }
};

const writeAll = (all: AllDrafts) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
};

/**
 * Persist a per-salon booking draft to localStorage so a refresh
 * mid-checkout doesn't lose progress. Pass `salonId` to scope.
 */
export const useBookingDraft = (salonId: string | undefined) => {
  const [draft, setDraft] = useState<BookingDraft | null>(() => {
    if (!salonId) return null;
    return readAll()[salonId] ?? null;
  });
  const dirty = useRef(false);

  useEffect(() => {
    if (!salonId || !dirty.current) return;
    const all = readAll();
    if (draft) all[salonId] = draft;
    else delete all[salonId];
    writeAll(all);
  }, [draft, salonId]);

  const update = (patch: Partial<BookingDraft>) => {
    dirty.current = true;
    setDraft((prev) => ({
      salonId: salonId!,
      step: prev?.step ?? 'datetime',
      selectedDate: prev?.selectedDate ?? new Date().toISOString(),
      selectedTime: prev?.selectedTime ?? null,
      selectedBarber: prev?.selectedBarber ?? null,
      autoAssign: prev?.autoAssign ?? false,
      ...patch,
    }));
  };

  const clear = () => {
    dirty.current = true;
    setDraft(null);
  };

  return { draft, update, clear };
};
