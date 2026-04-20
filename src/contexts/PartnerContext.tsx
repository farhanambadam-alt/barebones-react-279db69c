import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import {
  mockStaff, mockAppointments, mockServices, mockCategories, mockPackages, mockFinancials,
  StaffMember, Appointment, BreakInfo, SalonService, ServiceCategory, ServicePackage, FinancialSummary,
  timeToMins, minsToTime, OPEN_TIME, CLOSE_TIME,
} from '@/data/partnerMockData';
import { toLocalDateStr, todayLocalStr, parseLocalDate } from '@/lib/dateOnly';

export interface ServiceLog {
  id: string;
  appointmentId: string;
  staffId: string;
  clientName: string;
  serviceIds: string[];
  duration: number;
  price: number;
  type: 'online' | 'walkin';
  scheduledTime: string;
  startedAt: number;
  completedAt: number;
  date: string;
}

export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRecord {
  id: string;
  staffId: string;
  date: string;          // requested ISO date
  reason?: string;
  status: LeaveStatus;
  requestedAt: number;
  reviewedAt?: number;
  reviewerNote?: string;
}

/**
 * Standard async result envelope returned by every mutator.
 * Mirrors what a future Supabase RPC layer will return so call sites can swap
 * `await ctx.foo(...)` for `await supabase.rpc('foo', ...)` with no shape change.
 */
export interface AsyncResult<T = void> {
  ok: boolean;
  error?: string;
  data?: T;
}

interface PartnerState {
  // ── Data ──
  activeStaffId: string | null;
  staff: StaffMember[];
  appointments: Appointment[];
  /** All breaks (scheduled + active + past) per staff, keyed by staffId. */
  breaks: Record<string, BreakInfo[]>;
  serviceLogs: ServiceLog[];
  leaves: LeaveRecord[];
  // Catalog (single source of truth)
  services: SalonService[];
  categories: ServiceCategory[];
  packages: ServicePackage[];
  // Derived financial summary (live from logs + staff aggregates, with fallback to seed)
  financials: FinancialSummary;
  // ── Async lifecycle (always false/null for in-memory mocks; becomes meaningful once wired to Supabase) ──
  loading: boolean;
  error: string | null;
  refetch: () => Promise<AsyncResult>;
  // ── Selectors (sync, derived) ──
  setActiveStaff: (id: string) => void;
  getActiveBreak: (staffId: string) => BreakInfo | null;
  getNextScheduledBreak: (staffId: string) => BreakInfo | null;
  getNextAvailableSlot: (barberId: string, duration: number) => number | null;
  activeStaff: StaffMember | null;
  staffAppointments: Appointment[];
  getStaffLogs: (staffId: string) => ServiceLog[];
  getBreakConflicts: (staffId: string, startMins: number, endMins: number) => Appointment[];
  getPendingLeaveRequests: () => LeaveRecord[];
  getStaffPendingLeaves: (staffId: string) => number;
  getBookingsOnDate: (staffId: string, date: string) => number;
  getStaffLeavesThisMonth: (staffId: string) => number;
  getStaffLeavesThisYear: (staffId: string) => number;
  getStaffLeaves: (staffId: string) => LeaveRecord[];
  // ── Mutators (all async, returning AsyncResult so backend swap is mechanical) ──
  toggleStaffStatus: (id: string) => Promise<AsyncResult>;
  updateAppointmentStatus: (id: string, status: Appointment['status'], reason?: string) => Promise<AsyncResult>;
  completeService: (id: string) => Promise<AsyncResult>;
  startService: (id: string) => Promise<AsyncResult>;
  addWalkIn: (barberId: string, name: string, serviceIds: string[], duration: number, price: number, date?: string) => Promise<AsyncResult<string>>;
  addAppointment: (barberId: string, name: string, phone: string, serviceIds: string[], duration: number, price: number, date: string, time: string) => Promise<AsyncResult<string>>;
  scheduleBreak: (staffId: string, date: string, startMins: number, durationMins: number) => Promise<AsyncResult>;
  cancelBreak: (breakId: string) => Promise<AsyncResult>;
  endActiveBreak: (staffId: string) => Promise<AsyncResult>;
  addStaffMember: (data: { name: string; role: string; avatar: string; image?: string; phone?: string; email?: string }) => Promise<AsyncResult<StaffMember>>;
  removeStaffMember: (staffId: string) => Promise<AsyncResult>;
  setStaffServices: (staffId: string, serviceIds: string[]) => Promise<AsyncResult>;
  updateStaffMember: (staffId: string, data: { name: string; role: string; phone?: string; email?: string; image?: string }) => Promise<AsyncResult>;
  undoComplete: (appointmentId: string) => Promise<AsyncResult>;
  undoCancel: (appointmentId: string) => Promise<AsyncResult>;
  rescheduleAppointment: (id: string, date: string, time: string) => Promise<AsyncResult>;
  editAppointment: (id: string, data: { serviceIds: string[]; duration: number; price: number; date: string; time: string; name?: string; phone?: string }) => Promise<AsyncResult>;
  requestLeave: (staffId: string, date: string, reason?: string) => Promise<AsyncResult>;
  approveLeave: (leaveId: string) => Promise<AsyncResult>;
  rejectLeave: (leaveId: string, note?: string) => Promise<AsyncResult>;
  cancelLeaveRequest: (leaveId: string) => Promise<AsyncResult>;
  addCategory: (name: string) => Promise<AsyncResult<ServiceCategory>>;
  addService: (data: { name: string; categoryId: string; duration: number; price: number; gender: 'male' | 'female' | 'unisex' }) => Promise<AsyncResult<SalonService>>;
  removeService: (serviceId: string) => Promise<AsyncResult>;
  addPackage: (data: Omit<ServicePackage, 'id' | 'createdAt'>) => Promise<AsyncResult<ServicePackage>>;
  removePackage: (packageId: string) => Promise<AsyncResult>;
}

/**
 * Convert a numeric epoch (ms) — what mock data uses — into an ISO string,
 * which is what Supabase `timestamptz` columns return. Use at the API boundary
 * so the rest of the app reads ISO strings consistently.
 */
export const toISO = (ms: number): string => new Date(ms).toISOString();
/** Convert an ISO timestamptz string back into epoch ms for arithmetic. */
export const fromISO = (iso: string): number => new Date(iso).getTime();

const PartnerContext = createContext<PartnerState | null>(null);

export const usePartner = () => {
  const ctx = useContext(PartnerContext);
  if (!ctx) throw new Error('usePartner must be inside PartnerProvider');
  return ctx;
};

export const PartnerProvider = ({ children }: { children: ReactNode }) => {
  const [activeStaffId, setActiveStaffId] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>(mockStaff);
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);
  const [breaks, setBreaks] = useState<Record<string, BreakInfo[]>>({});
  const [serviceLogs, setServiceLogs] = useState<ServiceLog[]>([]);
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  // Catalog state — single source of truth
  const [services, setServices] = useState<SalonService[]>(mockServices);
  const [categories, setCategories] = useState<ServiceCategory[]>(mockCategories);
  const [packages, setPackages] = useState<ServicePackage[]>(mockPackages);
  // Async lifecycle — always idle for in-memory mocks; will become meaningful once wired to Supabase
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);
  const refetch = useCallback(async (): Promise<AsyncResult> => ({ ok: true }), []);

  const setActiveStaff = useCallback((id: string) => setActiveStaffId(id), []);

  const toggleStaffStatus = useCallback(async (id: string): Promise<AsyncResult> => {
    setStaff(prev => prev.map(s =>
      s.id === id
        ? { ...s, status: s.status === 'free' ? 'busy' : 'free', busySince: s.status === 'free' ? Date.now() : undefined }
        : s
    ));
    return { ok: true };
  }, []);

  const updateAppointmentStatus = useCallback(async (id: string, status: Appointment['status'], reason?: string): Promise<AsyncResult> => {
    setAppointments(prev => prev.map(a => {
      if (a.id !== id) return a;
      if (status === 'cancelled') {
        return { ...a, status, cancelReason: reason, cancelledAt: Date.now() };
      }
      return { ...a, status };
    }));
    return { ok: true };
  }, []);

  const completeService = useCallback(async (id: string): Promise<AsyncResult> => {
    setAppointments(prev => {
      const target = prev.find(a => a.id === id);
      if (!target) return prev;
      // Log the completed service
      const log: ServiceLog = {
        id: `log-${Date.now()}`,
        appointmentId: target.id,
        staffId: target.staffId,
        clientName: target.clientName,
        serviceIds: target.serviceIds,
        duration: target.duration,
        price: target.price,
        type: target.type,
        scheduledTime: target.scheduledTime,
        startedAt: target.startedAt || Date.now(),
        completedAt: Date.now(),
        date: target.date,
      };
      setServiceLogs(logs => [...logs, log]);
      // Update staff earnings + bookingsCompleted
      setStaff(prevStaff => prevStaff.map(s => s.id === target.staffId
        ? {
            ...s,
            earnings: {
              today: s.earnings.today + target.price,
              week: s.earnings.week + target.price,
              month: s.earnings.month + target.price,
            },
            bookingsCompleted: s.bookingsCompleted + 1,
          }
        : s
      ));
      return prev.map(a => a.id === id ? { ...a, status: 'completed' as const, completedAt: Date.now() } : a);
    });
    return { ok: true };
  }, []);

  const startService = useCallback(async (id: string): Promise<AsyncResult> => {
    setAppointments(prev => {
      const target = prev.find(a => a.id === id);
      if (!target) return prev;
      return prev.map(a => {
        if (a.id === id) return { ...a, status: 'serving' as const, startedAt: Date.now() };
        if (a.staffId === target.staffId && a.status === 'serving') return { ...a, status: 'waiting' as const };
        return a;
      });
    });
    return { ok: true };
  }, []);

  const getNextAvailableSlot = useCallback((barberId: string, duration: number): number | null => {
    const now = new Date();
    const todayStr = toLocalDateStr(now);
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const barberBookings = appointments
      .filter(b => b.staffId === barberId && b.status !== 'completed' && b.status !== 'cancelled' && b.date === todayStr)
      .map(b => ({ start: timeToMins(b.scheduledTime), end: timeToMins(b.scheduledTime) + b.duration }))
      .sort((a, b) => a.start - b.start);

    const todaysBreaks = (breaks[barberId] ?? [])
      .filter(b => b.date === todayStr)
      .sort((a, b) => a.startMins - b.startMins);
    let searchPointer = Math.max(nowMins, OPEN_TIME);

    // No hard upper limit - allow overtime
    const maxTime = 24 * 60;
    while (searchPointer + duration <= maxTime) {
      const bookingConflict = barberBookings.find(b =>
        (searchPointer >= b.start && searchPointer < b.end) ||
        (searchPointer + duration > b.start && searchPointer + duration <= b.end) ||
        (searchPointer <= b.start && searchPointer + duration >= b.end)
      );
      const breakConflict = todaysBreaks.find(br =>
        searchPointer < br.endMins && searchPointer + duration > br.startMins
      );

      if (bookingConflict) {
        searchPointer = bookingConflict.end;
      } else if (breakConflict) {
        searchPointer = breakConflict.endMins;
      } else {
        return searchPointer;
      }
    }
    return null;
  }, [appointments, breaks]);

  const addWalkIn = useCallback(async (barberId: string, name: string, serviceIds: string[], duration: number, price: number, date?: string): Promise<AsyncResult<string>> => {
    const todayStr = todayLocalStr();
    const targetDate = date || todayStr;
    // Walk-ins are only valid for today — they represent customers physically present now
    if (targetDate !== todayStr) return { ok: false, error: 'Walk-ins are only allowed for today' };

    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const slot = getNextAvailableSlot(barberId, duration) ?? nowMins;

    const maxQueue = appointments
      .filter(a => a.staffId === barberId && a.date === targetDate)
      .reduce((max, a) => Math.max(max, a.queueNo), 0);
    const clientId = `WI-${Date.now().toString(36).toUpperCase().slice(-5)}`;
    const clientName = name.trim() ? name.trim() : clientId;
    const newAppt: Appointment = {
      id: `w${Date.now()}`,
      clientName,
      clientPhone: '',
      bookingCount: 0,
      noShowCount: 0,
      staffId: barberId,
      serviceIds,
      date: targetDate,
      scheduledTime: minsToTime(slot),
      duration,
      price,
      status: 'waiting',
      type: 'walkin',
      queueNo: maxQueue + 1,
    };
    setAppointments(prev => [...prev, newAppt]);
    return { ok: true, data: newAppt.id };
  }, [appointments, getNextAvailableSlot]);

  const addAppointment = useCallback(async (
    barberId: string,
    name: string,
    phone: string,
    serviceIds: string[],
    duration: number,
    price: number,
    date: string,
    time: string,
  ): Promise<AsyncResult<string>> => {
    // Block past dates entirely
    const todayStr = todayLocalStr();
    if (date < todayStr) return { ok: false, error: 'Cannot book in the past' };
    // Block past times on today
    if (date === todayStr) {
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      if (timeToMins(time) < nowMins) return { ok: false, error: 'Cannot book in the past' };
    }
    // Block overlap with any active (non-cancelled) booking on same staff/date
    const newStart = timeToMins(time);
    const newEnd = newStart + duration;
    const conflict = appointments.find(a =>
      a.staffId === barberId &&
      a.date === date &&
      a.status !== 'cancelled' &&
      a.status !== 'completed' &&
      timeToMins(a.scheduledTime) < newEnd &&
      timeToMins(a.scheduledTime) + a.duration > newStart
    );
    if (conflict) return { ok: false, error: `Conflicts with ${conflict.clientName} at ${conflict.scheduledTime}` };

    const maxQueue = appointments
      .filter(a => a.staffId === barberId && a.date === date)
      .reduce((max, a) => Math.max(max, a.queueNo), 0);
    const clientId = `PB-${Date.now().toString(36).toUpperCase().slice(-5)}`;
    const clientName = name.trim() ? name.trim() : clientId;
    const newAppt: Appointment = {
      id: `p${Date.now()}`,
      clientName,
      clientPhone: phone.trim(),
      bookingCount: 0,
      noShowCount: 0,
      staffId: barberId,
      serviceIds,
      date,
      scheduledTime: time,
      duration,
      price,
      status: 'waiting',
      type: 'online',
      queueNo: maxQueue + 1,
    };
    setAppointments(prev => [...prev, newAppt]);
    return { ok: true, data: newAppt.id };
  }, [appointments]);

  const scheduleBreak = useCallback(async (staffId: string, date: string, startMins: number, durationMins: number): Promise<AsyncResult> => {
    if (durationMins <= 0) return { ok: false, error: 'Pick a duration' };
    const endMins = startMins + durationMins;

    // Past-time guard for today
    const now = new Date();
    const todayStr = toLocalDateStr(now);
    if (date < todayStr) return { ok: false, error: 'Cannot schedule a break in the past' };
    if (date === todayStr) {
      const nowMins = now.getHours() * 60 + now.getMinutes();
      if (endMins <= nowMins) return { ok: false, error: 'Break end time is already in the past' };
    }

    // Conflict vs bookings
    const bookingConflict = appointments.find(a =>
      a.staffId === staffId &&
      a.date === date &&
      a.status !== 'cancelled' &&
      a.status !== 'completed' &&
      timeToMins(a.scheduledTime) < endMins &&
      timeToMins(a.scheduledTime) + a.duration > startMins
    );
    if (bookingConflict) {
      return { ok: false, error: `Overlaps with ${bookingConflict.clientName} at ${bookingConflict.scheduledTime}` };
    }

    // Conflict vs other breaks (same staff/date)
    const existing = breaks[staffId] ?? [];
    const breakConflict = existing.find(b =>
      b.date === date && b.startMins < endMins && b.endMins > startMins
    );
    if (breakConflict) {
      return { ok: false, error: `Overlaps with another break at ${minsToTime(breakConflict.startMins)}` };
    }

    const newBreak: BreakInfo = {
      id: `br-${Date.now().toString(36)}`,
      date,
      startMins,
      endMins,
    };
    setBreaks(prev => ({ ...prev, [staffId]: [...(prev[staffId] ?? []), newBreak] }));
    return { ok: true };
  }, [appointments, breaks]);

  const cancelBreak = useCallback(async (breakId: string): Promise<AsyncResult> => {
    setBreaks(prev => {
      const next: Record<string, BreakInfo[]> = {};
      for (const [sid, list] of Object.entries(prev)) {
        next[sid] = list.filter(b => b.id !== breakId);
      }
      return next;
    });
    return { ok: true };
  }, []);

  const endActiveBreak = useCallback(async (staffId: string): Promise<AsyncResult> => {
    const now = new Date();
    const todayStr = toLocalDateStr(now);
    const nowMins = now.getHours() * 60 + now.getMinutes();
    setBreaks(prev => {
      const list = prev[staffId];
      if (!list) return prev;
      return {
        ...prev,
        [staffId]: list.map(b => {
          if (b.date !== todayStr) return b;
          if (nowMins >= b.startMins && nowMins < b.endMins) {
            return { ...b, endMins: nowMins, endedEarly: true };
          }
          return b;
        }),
      };
    });
    return { ok: true };
  }, []);

  const getActiveBreak = useCallback((staffId: string): BreakInfo | null => {
    const now = new Date();
    const todayStr = toLocalDateStr(now);
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const list = breaks[staffId] ?? [];
    return list.find(b => b.date === todayStr && nowMins >= b.startMins && nowMins < b.endMins) ?? null;
  }, [breaks]);

  const getNextScheduledBreak = useCallback((staffId: string): BreakInfo | null => {
    const now = new Date();
    const todayStr = toLocalDateStr(now);
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const list = (breaks[staffId] ?? [])
      .filter(b => b.date === todayStr && b.startMins > nowMins)
      .sort((a, b) => a.startMins - b.startMins);
    return list[0] ?? null;
  }, [breaks]);

  const getStaffLogs = useCallback((staffId: string) => {
    return serviceLogs.filter(l => l.staffId === staffId);
  }, [serviceLogs]);

  const addStaffMember = useCallback(async (data: { name: string; role: string; avatar: string; image?: string; phone?: string; email?: string }): Promise<AsyncResult<StaffMember>> => {
    const newStaff: StaffMember = {
      id: `s${Date.now()}`,
      name: data.name,
      initials: data.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
      avatar: data.avatar,
      image: data.image || '',
      role: data.role,
      status: 'free',
      earnings: { today: 0, week: 0, month: 0 },
      bookingsCompleted: 0,
      noShows: 0,
      rating: 0,
      reviews: [],
      skills: [],
      assignedServiceIds: [],
    };
    setStaff(prev => [...prev, newStaff]);
    return { ok: true, data: newStaff };
  }, []);

  const removeStaffMember = useCallback(async (staffId: string): Promise<AsyncResult> => {
    setStaff(prev => prev.filter(s => s.id !== staffId));
    setAppointments(prev => prev.filter(a => a.staffId !== staffId));
    setBreaks(prev => {
      const next = { ...prev };
      delete next[staffId];
      return next;
    });
    setLeaves(prev => prev.filter(l => l.staffId !== staffId));
    // Cascade: drop service logs for the deleted staff so revenue stats don't drift
    setServiceLogs(prev => prev.filter(l => l.staffId !== staffId));
    setActiveStaffId(prev => (prev === staffId ? null : prev));
    return { ok: true };
  }, []);

  const setStaffServices = useCallback(async (staffId: string, serviceIds: string[]): Promise<AsyncResult> => {
    setStaff(prev => prev.map(s => s.id === staffId ? { ...s, assignedServiceIds: serviceIds } : s));
    return { ok: true };
  }, []);

  const updateStaffMember = useCallback(async (staffId: string, data: { name: string; role: string; phone?: string; email?: string; image?: string }): Promise<AsyncResult> => {
    setStaff(prev => prev.map(s => {
      if (s.id !== staffId) return s;
      const name = data.name.trim() || s.name;
      const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      return {
        ...s,
        name,
        initials,
        role: data.role || s.role,
        phone: data.phone,
        email: data.email,
        image: data.image ?? s.image,
      };
    }));
    return { ok: true };
  }, []);

  const undoComplete = useCallback(async (appointmentId: string): Promise<AsyncResult> => {
    setServiceLogs(logs => {
      const log = logs.find(l => l.appointmentId === appointmentId);
      if (!log) return logs;
      // Roll back staff earnings + bookingsCompleted
      setStaff(prevStaff => prevStaff.map(s => s.id === log.staffId
        ? {
            ...s,
            earnings: {
              today: Math.max(0, s.earnings.today - log.price),
              week: Math.max(0, s.earnings.week - log.price),
              month: Math.max(0, s.earnings.month - log.price),
            },
            bookingsCompleted: Math.max(0, s.bookingsCompleted - 1),
          }
        : s
      ));
      // Restore appointment to 'serving'
      setAppointments(prev => prev.map(a => a.id === appointmentId
        ? { ...a, status: 'serving' as const, completedAt: undefined }
        : a
      ));
      return logs.filter(l => l.appointmentId !== appointmentId);
    });
    return { ok: true };
  }, []);

  const undoCancel = useCallback(async (appointmentId: string): Promise<AsyncResult> => {
    setAppointments(prev => prev.map(a => a.id === appointmentId
      ? { ...a, status: 'waiting' as const, cancelReason: undefined, cancelledAt: undefined }
      : a
    ));
    return { ok: true };
  }, []);

  const getBreakConflicts = useCallback((staffId: string, startMins: number, endMins: number): Appointment[] => {
    return appointments.filter(a => {
      if (a.staffId !== staffId) return false;
      if (a.status === 'completed' || a.status === 'cancelled') return false;
      const aStart = timeToMins(a.scheduledTime);
      const aEnd = aStart + a.duration;
      return aStart < endMins && aEnd > startMins;
    });
  }, [appointments]);

  const rescheduleAppointment = useCallback(async (id: string, date: string, time: string): Promise<AsyncResult> => {
    // Block past dates/times
    const todayStr = todayLocalStr();
    if (date < todayStr) {
      return { ok: false, error: 'Cannot move to a past date' };
    }
    if (date === todayStr) {
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      if (timeToMins(time) < nowMins) {
        return { ok: false, error: 'Cannot move to a past time' };
      }
    }
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, date, scheduledTime: time } : a));
    return { ok: true };
  }, []);

  const editAppointment = useCallback(async (
    id: string,
    data: { serviceIds: string[]; duration: number; price: number; date: string; time: string; name?: string; phone?: string }
  ): Promise<AsyncResult> => {
    const target = appointments.find(a => a.id === id);
    if (!target) return { ok: false, error: 'Appointment not found' };
    if (target.status !== 'waiting') {
      return { ok: false, error: 'Only waiting appointments can be edited' };
    }
    if (data.serviceIds.length === 0) {
      return { ok: false, error: 'Select at least one service' };
    }
    const todayStr = todayLocalStr();
    if (data.date < todayStr) {
      return { ok: false, error: 'Cannot move to a past date' };
    }
    if (data.date === todayStr) {
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      if (timeToMins(data.time) < nowMins) {
        return { ok: false, error: 'Cannot move to a past time' };
      }
    }
    // Block overlap with other active bookings on same staff/date
    const newStart = timeToMins(data.time);
    const newEnd = newStart + data.duration;
    const conflict = appointments.find(a =>
      a.id !== id &&
      a.staffId === target.staffId &&
      a.date === data.date &&
      a.status !== 'cancelled' &&
      a.status !== 'completed' &&
      timeToMins(a.scheduledTime) < newEnd &&
      timeToMins(a.scheduledTime) + a.duration > newStart
    );
    if (conflict) {
      return { ok: false, error: `Conflicts with ${conflict.clientName} at ${conflict.scheduledTime}` };
    }
    setAppointments(prev => prev.map(a => {
      if (a.id !== id) return a;
      const nextName = data.name !== undefined
        ? (data.name.trim() ? data.name.trim() : a.clientName)
        : a.clientName;
      const nextPhone = data.phone !== undefined ? data.phone.trim() : a.clientPhone;
      return {
        ...a,
        serviceIds: data.serviceIds,
        duration: data.duration,
        price: data.price,
        date: data.date,
        scheduledTime: data.time,
        clientName: nextName,
        clientPhone: nextPhone,
      };
    }));
    return { ok: true };
  }, [appointments]);

  const requestLeave = useCallback(async (staffId: string, date: string, reason?: string): Promise<AsyncResult> => {
    const today = todayLocalStr();
    if (date < today) return { ok: false, error: 'Cannot request leave for a past date.' };
    const duplicate = leaves.some(l => l.staffId === staffId && l.date === date && l.status !== 'rejected');
    if (duplicate) return { ok: false, error: 'A leave request already exists for this date.' };
    // Block if the staff has any active bookings on this date — schedule must be fully clear
    const activeBookings = appointments.filter(a =>
      a.staffId === staffId &&
      a.date === date &&
      a.status !== 'cancelled' &&
      a.status !== 'completed'
    );
    if (activeBookings.length > 0) {
      return {
        ok: false,
        error: `You have ${activeBookings.length} booking${activeBookings.length === 1 ? '' : 's'} on this date. Reschedule or cancel them before requesting leave.`,
      };
    }
    setLeaves(prev => [...prev, {
      id: `lv-${Date.now()}`,
      staffId,
      date,
      reason: reason?.trim() || undefined,
      status: 'pending',
      requestedAt: Date.now(),
    }]);
    return { ok: true };
  }, [leaves, appointments]);

  const approveLeave = useCallback(async (leaveId: string): Promise<AsyncResult> => {
    setLeaves(prev => prev.map(l => l.id === leaveId
      ? { ...l, status: 'approved' as const, reviewedAt: Date.now() }
      : l));
    return { ok: true };
  }, []);

  const rejectLeave = useCallback(async (leaveId: string, note?: string): Promise<AsyncResult> => {
    setLeaves(prev => prev.map(l => l.id === leaveId
      ? { ...l, status: 'rejected' as const, reviewedAt: Date.now(), reviewerNote: note?.trim() || undefined }
      : l));
    return { ok: true };
  }, []);

  const cancelLeaveRequest = useCallback(async (leaveId: string): Promise<AsyncResult> => {
    setLeaves(prev => prev.filter(l => !(l.id === leaveId && l.status === 'pending')));
    return { ok: true };
  }, []);

  const getStaffLeaves = useCallback((staffId: string) => {
    return leaves.filter(l => l.staffId === staffId);
  }, [leaves]);

  const getPendingLeaveRequests = useCallback(() => {
    return leaves.filter(l => l.status === 'pending');
  }, [leaves]);

  const getStaffLeavesThisMonth = useCallback((staffId: string) => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    return leaves.filter(l => {
      if (l.staffId !== staffId || l.status !== 'approved') return false;
      const d = parseLocalDate(l.date);
      return !!d && d.getMonth() === month && d.getFullYear() === year;
    }).length;
  }, [leaves]);

  const getStaffLeavesThisYear = useCallback((staffId: string) => {
    const year = new Date().getFullYear();
    return leaves.filter(l => {
      if (l.staffId !== staffId || l.status !== 'approved') return false;
      const d = parseLocalDate(l.date);
      return !!d && d.getFullYear() === year;
    }).length;
  }, [leaves]);

  const getStaffPendingLeaves = useCallback((staffId: string) => {
    return leaves.filter(l => l.staffId === staffId && l.status === 'pending').length;
  }, [leaves]);

  const getBookingsOnDate = useCallback((staffId: string, date: string) => {
    return appointments.filter(a => a.staffId === staffId && a.date === date && a.status !== 'cancelled').length;
  }, [appointments]);

  const activeStaff = staff.find(s => s.id === activeStaffId) ?? null;
  const staffAppointments = appointments.filter(a => a.staffId === activeStaffId);

  // ── Catalog mutators ──
  const addCategory = useCallback(async (name: string): Promise<AsyncResult<ServiceCategory>> => {
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, error: 'Category name is required' };
    const cat: ServiceCategory = { id: `cat-${Date.now()}`, name: trimmed };
    setCategories(prev => [...prev, cat]);
    return { ok: true, data: cat };
  }, []);

  const addService = useCallback(async (data: { name: string; categoryId: string; duration: number; price: number; gender: 'male' | 'female' | 'unisex' }): Promise<AsyncResult<SalonService>> => {
    const trimmed = data.name.trim();
    if (!trimmed) return { ok: false, error: 'Service name is required' };
    if (!data.categoryId) return { ok: false, error: 'Pick a category' };
    if (!data.price) return { ok: false, error: 'Price is required' };
    // Resolve category name from current state — read inside setter to avoid stale closure
    let created: SalonService | null = null;
    setCategories(prevCats => {
      const cat = prevCats.find(c => c.id === data.categoryId);
      created = {
        id: `sv-${Date.now()}`,
        name: trimmed,
        category: cat?.name ?? '',
        categoryId: data.categoryId,
        duration: data.duration || 30,
        price: data.price,
        gender: data.gender,
      };
      return prevCats;
    });
    if (!created) return { ok: false, error: 'Could not create service' };
    setServices(prev => [...prev, created!]);
    return { ok: true, data: created };
  }, []);

  const removeService = useCallback(async (serviceId: string): Promise<AsyncResult> => {
    setServices(prev => prev.filter(s => s.id !== serviceId));
    // Strip from any package that referenced it
    setPackages(prev => prev.map(p => ({ ...p, serviceIds: p.serviceIds.filter(id => id !== serviceId) })));
    // Strip from staff assigned-services lists
    setStaff(prev => prev.map(s => s.assignedServiceIds
      ? { ...s, assignedServiceIds: s.assignedServiceIds.filter(id => id !== serviceId) }
      : s));
    return { ok: true };
  }, []);

  const addPackage = useCallback(async (data: Omit<ServicePackage, 'id' | 'createdAt'>): Promise<AsyncResult<ServicePackage>> => {
    const pkg: ServicePackage = {
      ...data,
      id: `p-${Date.now()}`,
      createdAt: todayLocalStr(),
    };
    setPackages(prev => [...prev, pkg]);
    return { ok: true, data: pkg };
  }, []);

  const removePackage = useCallback(async (packageId: string): Promise<AsyncResult> => {
    setPackages(prev => prev.filter(p => p.id !== packageId));
    return { ok: true };
  }, []);

  // ── Derived financials (live from logs + staff aggregates; falls back to seed for empty mock state) ──
  const financials = useMemo<FinancialSummary>(() => {
    const todayStr = todayLocalStr();
    const todayLogs = serviceLogs.filter(l => l.date === todayStr);
    const todayLogsRevenue = todayLogs.reduce((sum, l) => sum + l.price, 0);

    // Week aggregate from staff.earnings.week (already maintained on completeService/undoComplete)
    const staffWeekRevenue = staff.reduce((sum, s) => sum + s.earnings.week, 0);
    const staffMonthRevenue = staff.reduce((sum, s) => sum + s.earnings.month, 0);

    return {
      todayRevenue: todayLogsRevenue > 0 ? todayLogsRevenue : mockFinancials.todayRevenue,
      weekRevenue: staffWeekRevenue > 0 ? staffWeekRevenue : mockFinancials.weekRevenue,
      monthRevenue: staffMonthRevenue > 0 ? staffMonthRevenue : mockFinancials.monthRevenue,
      // Funds & payouts remain seeded — true value comes from backend reconciliation
      fundsAvailable: mockFinancials.fundsAvailable,
      nextPayoutDate: mockFinancials.nextPayoutDate,
      payoutHistory: mockFinancials.payoutHistory,
    };
  }, [serviceLogs, staff]);

  return (
    <PartnerContext.Provider value={{
      activeStaffId, staff, appointments, breaks, serviceLogs, leaves,
      services, categories, packages, financials,
      loading, error, refetch,
      setActiveStaff, toggleStaffStatus,
      updateAppointmentStatus, completeService, startService, addWalkIn, addAppointment,
      scheduleBreak, cancelBreak, endActiveBreak, getActiveBreak, getNextScheduledBreak,
      getNextAvailableSlot, activeStaff, staffAppointments, getStaffLogs, addStaffMember,
      removeStaffMember, setStaffServices, updateStaffMember,
      undoComplete, undoCancel, getBreakConflicts, rescheduleAppointment, editAppointment,
      requestLeave, approveLeave, rejectLeave, cancelLeaveRequest,
      getPendingLeaveRequests, getStaffPendingLeaves, getBookingsOnDate,
      getStaffLeavesThisMonth, getStaffLeavesThisYear, getStaffLeaves,
      addCategory, addService, removeService, addPackage, removePackage,
    }}>
      {children}
    </PartnerContext.Provider>
  );
};
