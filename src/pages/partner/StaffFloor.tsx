import { toLocalDateStr, todayLocalStr, formatLocalDate } from '@/lib/dateOnly';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { usePartner } from '@/contexts/PartnerContext';
import {
  minsToTime12, minsToTime, timeToMins,
  OPEN_TIME, CLOSE_TIME, PPM,
  type Appointment,
} from '@/data/partnerMockData';
import ActionDrawer from '@/components/partner/ActionDrawer';
import ConfirmActionDialog from '@/components/partner/ConfirmActionDialog';
import DateChipStrip from '@/components/partner/DateChipStrip';
import PartnerTimeline, { type PartnerTimelineHandle } from '@/components/partner/PartnerTimeline';
import PartnerPageState from '@/components/partner/PartnerPageState';
import SlotConflictPreview from '@/components/partner/SlotConflictPreview';
import { getStatusPalette } from '@/components/partner/statusColors';
import GenderToggle from '@/components/GenderToggle';
import { useGender } from '@/contexts/GenderContext';
import {
  Plus, Clock, Smartphone, User, Coffee, Check,
  AlertTriangle, X, ChevronUp, ChevronDown, Phone, CalendarDays,
} from 'lucide-react';
import { Scissors, Sparkles, Timer } from 'lucide-react';
import { toast } from 'sonner';

/* ── Scroll-wheel Duration Picker ── */
const MIN_DURATION = 5;

const ITEM_H = 36;
const VISIBLE = 3;
const WHEEL_H = ITEM_H * VISIBLE;

/**
 * Native-scroll based wheel column with infinite looping.
 * Uses real overflow-y scrolling with scroll-snap for natural touch.
 */
const WheelColumn = ({
  values,
  selected,
  onChange,
  formatValue,
}: {
  values: number[];
  selected: number;
  onChange: (v: number) => void;
  formatValue: (v: number) => string;
}) => {
  const len = values.length;
  const containerRef = useRef<HTMLDivElement>(null);
  const isRecentering = useRef(false);
  const isUserScroll = useRef(false);
  const snapTimer = useRef<ReturnType<typeof setTimeout>>();
  const padTop = Math.floor(VISIBLE / 2) * ITEM_H;
  const tripled = useMemo(() => [...values, ...values, ...values], [values]);


  const scrollToIdx = React.useCallback((idx: number) => {
    const el = containerRef.current;
    if (!el) return;
    const middleIdx = len + idx;
    const top = middleIdx * ITEM_H;
    isRecentering.current = true;
    el.scrollTo({ top, behavior: 'instant' as ScrollBehavior });
    requestAnimationFrame(() => { isRecentering.current = false; });
  }, [len]);

  // On mount + when selected changes externally, scroll to position
  useEffect(() => {
    if (isUserScroll.current) return;
    const idx = values.indexOf(selected);
    if (idx >= 0) scrollToIdx(idx);
  }, [selected, values, scrollToIdx]);

  const handleScroll = React.useCallback(() => {
    if (isRecentering.current) return;
    const el = containerRef.current;
    if (!el) return;

    clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => {
      const scrollTop = el.scrollTop;
      const rawIdx = Math.round(scrollTop / ITEM_H);
      const valueIdx = ((rawIdx % len) + len) % len;

      // Recenter to middle segment
      const middleIdx = len + valueIdx;
      const targetTop = middleIdx * ITEM_H;
      if (Math.abs(scrollTop - targetTop) > ITEM_H * 0.5) {
        isRecentering.current = true;
        el.scrollTo({ top: targetTop, behavior: 'instant' as ScrollBehavior });
        requestAnimationFrame(() => { isRecentering.current = false; });
      }

      isUserScroll.current = false;
      onChange(values[valueIdx]);
    }, 80);
  }, [len, values, onChange]);

  // Desktop +/- buttons – update value AND scroll wheel to match
  const increment = (delta: number) => {
    const curIdx = values.indexOf(selected);
    const newIdx = ((curIdx + delta) % len + len) % len;
    onChange(values[newIdx]);
    // Sync the scroll position so the wheel visually moves
    requestAnimationFrame(() => scrollToIdx(newIdx));
  };

  return (
    <div className="flex flex-col items-center gap-1" data-vaul-no-drag>
      {/* Up - desktop only */}
      <button
        type="button"
        onClick={() => increment(-1)}
        className="hidden sm:flex w-8 h-8 items-center justify-center rounded-full bg-secondary/80 border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-90"
        aria-label="Decrease"
      >
        <span className="text-lg leading-none font-medium">−</span>
      </button>

      <div className="relative overflow-hidden" style={{ height: WHEEL_H, width: '5rem' }}>
        {/* Center highlight band */}
        <div
          className="absolute inset-x-0 pointer-events-none z-10 rounded-lg"
          style={{
            top: padTop,
            height: ITEM_H,
            background: 'hsl(var(--accent) / 0.10)',
            border: '1.5px solid hsl(var(--accent) / 0.18)',
          }}
        />
        {/* Fade top */}
        <div
          className="absolute inset-x-0 top-0 pointer-events-none z-20"
          style={{
            height: ITEM_H * 1.5,
            background: 'linear-gradient(to bottom, hsl(var(--background)), hsl(var(--background) / 0))',
          }}
        />
        {/* Fade bottom */}
        <div
          className="absolute inset-x-0 bottom-0 pointer-events-none z-20"
          style={{
            height: ITEM_H * 1.5,
            background: 'linear-gradient(to top, hsl(var(--background)), hsl(var(--background) / 0))',
          }}
        />

        {/* Real scrollable container */}
        <div
          ref={containerRef}
          className="h-full overflow-y-auto scrollbar-none overscroll-contain"
          style={{
            scrollSnapType: 'y mandatory',
            WebkitOverflowScrolling: 'touch',
            paddingTop: padTop,
            paddingBottom: padTop,
          }}
          onScroll={handleScroll}
          onTouchStart={() => { isUserScroll.current = true; }}
          onPointerDown={() => { isUserScroll.current = true; }}
        >
          {tripled.map((v, i) => {
            const isSelected = v === selected && Math.floor(i / len) === 1;
            return (
              <div
                key={i}
                className={`flex items-center justify-center select-none ${
                  isSelected ? 'text-foreground font-bold' : 'text-muted-foreground/60 font-medium'
                }`}
                style={{
                  height: ITEM_H,
                  fontSize: isSelected ? '1.5rem' : '1rem',
                  scrollSnapAlign: 'center',
                }}
              >
                {formatValue(v)}
              </div>
            );
          })}
        </div>
      </div>

      {/* Down - desktop only */}
      <button
        type="button"
        onClick={() => increment(1)}
        className="hidden sm:flex w-8 h-8 items-center justify-center rounded-full bg-secondary/80 border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-90"
        aria-label="Increase"
      >
        <span className="text-lg leading-none font-medium">+</span>
      </button>
    </div>
  );
};

const DurationDial = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  const hourValues = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minuteValues = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);

  return (
    <div className="flex items-center justify-center gap-1 py-1" data-vaul-no-drag>
      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mr-2">Duration</label>
      <WheelColumn
        values={hourValues}
        selected={hours}
        onChange={(h) => onChange(Math.max(MIN_DURATION, h * 60 + minutes))}
        formatValue={(v) => String(v).padStart(2, '0')}
      />
      <span className="text-xl font-bold text-foreground">:</span>
      <WheelColumn
        values={minuteValues}
        selected={minutes}
        onChange={(m) => onChange(Math.max(MIN_DURATION, hours * 60 + m))}
        formatValue={(v) => String(v).padStart(2, '0')}
      />
    </div>
  );
};

/* ── Cancel Reasons ── */
const CANCEL_REASONS = [
  'Customer delayed',
  'Customer cancelled',
  'No-show',
  'Staff unavailable',
  'Other',
] as const;

/* ── Min card height so all elements are visible ── */
const MIN_CARD_PX = 110;

/* ── Date helpers ── */

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/* ── Collision-free layout: compute visual top/height avoiding overlaps ── */
interface LayoutSlot {
  id: string;
  visualTop: number;
  visualHeight: number;
  booking: Appointment;
}

const computeLayout = (bookings: Appointment[], timelineStartMins: number): LayoutSlot[] => {
  const sorted = [...bookings].sort((a, b) => timeToMins(a.scheduledTime) - timeToMins(b.scheduledTime));
  const slots: LayoutSlot[] = [];
  let maxBottom = 0;

  // Cancelled appointments collapse to a compact fixed height to avoid
  // hogging vertical space on the timeline.
  const CANCELLED_CARD_PX = 44;

  for (const booking of sorted) {
    const bStart = timeToMins(booking.scheduledTime);
    const naturalTop = (bStart - timelineStartMins) * PPM;
    const isCancelled = booking.status === 'cancelled';
    const height = isCancelled
      ? CANCELLED_CARD_PX
      : Math.max(booking.duration * PPM, MIN_CARD_PX);

    // Push down if overlapping with previous card
    const top = Math.max(naturalTop, maxBottom + 2);
    slots.push({ id: booking.id, visualTop: top, visualHeight: height, booking });
    maxBottom = top + height;
  }
  return slots;
};

/* ── Main Floor Component ── */
const StaffFloor = () => {
  const {
    activeStaff, staffAppointments, completeService, startService,
    addWalkIn, addAppointment, breaks,
    scheduleBreak, cancelBreak, endActiveBreak, getActiveBreak, getNextScheduledBreak,
    getNextAvailableSlot,
    updateAppointmentStatus, undoComplete, undoCancel, getBreakConflicts,
    rescheduleAppointment, editAppointment,
    services: mockServices,
  } = usePartner();
  const { gender } = useGender();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [wiDrawerOpen, setWiDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'walkin' | 'appointment'>('walkin');
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [apptDate, setApptDate] = useState<string>(todayLocalStr());
  const [apptTime, setApptTime] = useState<string>('10:00');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [manualDuration, setManualDuration] = useState(30);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [cancelDrawerOpen, setCancelDrawerOpen] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [confirmStartId, setConfirmStartId] = useState<string | null>(null);
  const [confirmCompleteId, setConfirmCompleteId] = useState<string | null>(null);
  // Break drawer state (schedule a break for any chosen time slot)
  const [breakDrawerOpen, setBreakDrawerOpen] = useState(false);
  const [breakStartTime, setBreakStartTime] = useState<string>('');
  const [breakDuration, setBreakDuration] = useState<number>(30);
  const [breakHasConflict, setBreakHasConflict] = useState(false);
  const [pastDateBlockOpen, setPastDateBlockOpen] = useState(false);
  const [durationManuallySet, setDurationManuallySet] = useState(false);
  // Edit flow state
  const [editTarget, setEditTarget] = useState<Appointment | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editServices, setEditServices] = useState<string[]>([]);
  const [editDuration, setEditDuration] = useState(30);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDurationManuallySet, setEditDurationManuallySet] = useState(false);
  // Conflict gating from SlotConflictPreview
  const [drawerHasConflict, setDrawerHasConflict] = useState(false);
  const [editHasConflict, setEditHasConflict] = useState(false);
  const timelineRef = useRef<PartnerTimelineHandle>(null);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const lastScrollTop = useRef(0);
  const manualOverride = useRef(false);

  const openEditDrawer = useCallback((booking: Appointment) => {
    setEditTarget(booking);
    setEditDate(booking.date);
    setEditTime(booking.scheduledTime);
    setEditServices(booking.serviceIds);
    setEditDuration(booking.duration);
    setEditName(booking.clientName);
    setEditPhone(booking.clientPhone || '');
    setEditDurationManuallySet(false);
  }, []);

  // Auto-sync edit duration to sum of selected services unless user manually edited
  const editSumDuration = useMemo(
    () => mockServices.filter(s => editServices.includes(s.id)).reduce((a, s) => a + s.duration, 0),
    [editServices]
  );
  const editSumPrice = useMemo(
    () => mockServices.filter(s => editServices.includes(s.id)).reduce((a, s) => a + s.price, 0),
    [editServices]
  );
  useEffect(() => {
    if (!editTarget) return;
    if (editDurationManuallySet) return;
    if (editSumDuration > 0) setEditDuration(editSumDuration);
  }, [editSumDuration, editTarget, editDurationManuallySet]);
  const editDurationTooShort = editSumDuration > 0 && editDuration < editSumDuration;
  const canSaveEdit = editServices.length > 0;

  // Scroll-driven auto-collapse
  useEffect(() => {
    const el = timelineRef.current?.getScrollElement();
    if (!el) return;
    const onScroll = () => {
      if (manualOverride.current) return;
      const st = el.scrollTop;
      if (st > 30 && st > lastScrollTop.current) {
        setHeaderCollapsed(true);
      } else if (st < 10) {
        setHeaderCollapsed(false);
      }
      lastScrollTop.current = st;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const toggleHeader = useCallback(() => {
    manualOverride.current = true;
    setHeaderCollapsed(prev => !prev);
    // Reset manual override after a short delay so scroll can take over again
    setTimeout(() => { manualOverride.current = false; }, 1000);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Smart auto-scroll on staff/date change
  useEffect(() => {
    const el = timelineRef.current?.getScrollElement();
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      setTimeout(() => {
        const now = new Date();
        const isViewingToday = isSameDay(selectedDate, now);
        const currentMins = now.getHours() * 60 + now.getMinutes();
        const dateStr = toLocalDateStr(selectedDate);
        const dBookings = staffAppointments
          .filter(a => a.date === dateStr)
          .sort((a, b) => timeToMins(a.scheduledTime) - timeToMins(b.scheduledTime));
        const firstBookingMins = dBookings.length > 0 ? timeToMins(dBookings[0].scheduledTime) : null;
        let targetMins: number;
        if (isViewingToday) {
          if ((currentMins < OPEN_TIME || currentMins >= CLOSE_TIME) && firstBookingMins !== null) {
            targetMins = firstBookingMins;
          } else {
            targetMins = currentMins;
          }
        } else {
          targetMins = firstBookingMins ?? OPEN_TIME;
        }
        el.scrollTop = Math.max(0, targetMins * PPM - 120);
      }, 50);
    });
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStaff?.id, selectedDate]);

  // dateChips now handled by DateChipStrip component

  const barberId = activeStaff?.id ?? '';

  const nextSlot = useMemo(() => {
    if (!wiDrawerOpen || !barberId) return null;
    return getNextAvailableSlot(barberId, manualDuration);
  }, [wiDrawerOpen, barberId, manualDuration, getNextAvailableSlot]);

  // Sum of currently-selected service durations (for auto-duration sync)
  const sumServiceDurationForEffect = useMemo(
    () => mockServices.filter(s => selectedServices.includes(s.id)).reduce((a, s) => a + s.duration, 0),
    [selectedServices]
  );

  // Auto-sync duration to sum of services unless user manually edited
  useEffect(() => {
    if (!wiDrawerOpen) return;
    if (durationManuallySet) return;
    if (sumServiceDurationForEffect > 0) {
      setManualDuration(sumServiceDurationForEffect);
    }
  }, [sumServiceDurationForEffect, wiDrawerOpen, durationManuallySet]);

  // Reset manual-override flag when drawer closes
  useEffect(() => {
    if (!wiDrawerOpen) setDurationManuallySet(false);
  }, [wiDrawerOpen]);

  if (!activeStaff) return null;

  const staffBreaks = breaks[barberId] ?? [];
  const activeBreak = getActiveBreak(barberId);
  const nextBreak = getNextScheduledBreak(barberId);
  const nowMins = currentTime.getHours() * 60 + currentTime.getMinutes();
  const isOnBreak = !!activeBreak;
  const isToday = isSameDay(selectedDate, new Date());
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const selectedStart = new Date(selectedDate); selectedStart.setHours(0, 0, 0, 0);
  const isPastDate = selectedStart < todayStart;
  const selectedDateStr = toLocalDateStr(selectedDate);

  const dayBookings = staffAppointments.filter(a => a.date === selectedDateStr);
  const dayBreaksForSelected = staffBreaks.filter(b => b.date === selectedDateStr);
  const allBookings = [...dayBookings].sort((a, b) => timeToMins(a.scheduledTime) - timeToMins(b.scheduledTime));

  // Full 24-hour timeline: 0:00 to 24:00
  const timelineStartMins = 0;

  const layoutSlots = computeLayout(allBookings, timelineStartMins);
  const lastSlotBottom = layoutSlots.length > 0
    ? layoutSlots[layoutSlots.length - 1].visualTop + layoutSlots[layoutSlots.length - 1].visualHeight
    : 0;

  const totalHeight = Math.max(24 * 60 * PPM, lastSlotBottom + 40);

  // Compute sum of selected service durations
  const selectedSvcObjs = mockServices.filter(s => selectedServices.includes(s.id));
  const sumServiceDuration = selectedSvcObjs.reduce((acc, s) => acc + s.duration, 0);
  const sumServicePrice = selectedSvcObjs.reduce((acc, s) => acc + s.price, 0);
  const durationTooShort = sumServiceDuration > 0 && manualDuration < sumServiceDuration;
  const canSubmitWalkIn = selectedServices.length > 0;

  const handleDurationChange = (v: number) => {
    setDurationManuallySet(true);
    setManualDuration(v);
  };

  const resetDrawerState = () => {
    setWalkInName('');
    setWalkInPhone('');
    setSelectedServices([]);
    setManualDuration(30);
    setDurationManuallySet(false);
  };

  const handleAddWalkIn = async () => {
    if (!canSubmitWalkIn) return;
    if (drawerMode === 'appointment') {
      // String comparison on 'YYYY-MM-DD' is timezone-safe (same fix as PartnerContext).
      if (apptDate < todayLocalStr()) {
        toast.error('🔒 Past date', { description: 'Pick today or a future date', duration: 3000 });
        return;
      }
      const res = await addAppointment(barberId, walkInName, walkInPhone, selectedServices, manualDuration, sumServicePrice, apptDate, apptTime);
      if (!res.ok) {
        toast.error('⛔ ' + (res.error || 'Could not book'), { duration: 3000 });
        return;
      }
      toast.success('📞 Appointment booked', {
        description: `${formatLocalDate(apptDate)} · ${apptTime}`,
        duration: 3000,
      });
    } else {
      if (!isToday) {
        toast.error('Walk-ins are only allowed for today', { duration: 3000 });
        return;
      }
      const res = await addWalkIn(barberId, walkInName, selectedServices, manualDuration, sumServicePrice, selectedDateStr);
      if (!res.ok) {
        toast.error(res.error || 'Walk-ins are only allowed for today', { duration: 3000 });
        return;
      }
    }
    setWiDrawerOpen(false);
    resetDrawerState();
  };

  const handleCancelRequest = (id: string) => {
    setCancelTargetId(id);
    setCancelDrawerOpen(true);
  };

  const handleCancelConfirm = (reason: string) => {
    if (cancelTargetId) {
      const id = cancelTargetId;
      updateAppointmentStatus(id, 'cancelled', reason);
      toast('Appointment cancelled', {
        description: `Reason: ${reason}`,
        action: { label: 'Undo', onClick: () => undoCancel(id) },
        duration: 6000,
      });
    }
    setCancelDrawerOpen(false);
    setCancelTargetId(null);
  };

  const waitingQueue = allBookings.filter(a => a.status === 'waiting').sort((a, b) => a.queueNo - b.queueNo);

  /* ── Traffic-light status palette (centralised in statusColors.ts) ── */

  return (
    <PartnerPageState>
    <div className="flex flex-col h-full bg-background">
      {/* ── Date Chips + Controls Header ── */}
      <div className="bg-card border-b border-border px-3 py-2 relative">
        {/* Collapsible: Clock + Status row */}
        <div
          className="overflow-hidden transition-all duration-300 ease-in-out"
          style={{ maxHeight: headerCollapsed ? 0 : 48, opacity: headerCollapsed ? 0 : 1 }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isOnBreak ? 'bg-amber-500' : activeStaff.status === 'free' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="text-[10px] text-muted-foreground font-medium">
                {isOnBreak ? 'ON BREAK' : activeStaff.status === 'free' ? 'Available' : 'Busy'}
              </span>
            </div>
            <div className="flex items-center gap-1 text-primary">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-xs font-bold font-mono tabular-nums">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>
        </div>

        {/* Collapsible: Date Chips */}
        <div
          className="overflow-hidden transition-all duration-300 ease-in-out"
          style={{ maxHeight: headerCollapsed ? 0 : 56, opacity: headerCollapsed ? 0 : 1 }}
        >
          <DateChipStrip
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            rangeBefore={3}
            rangeAfter={7}
          />
        </div>

        {/* Action controls - always visible */}
        <div className={`${headerCollapsed ? '' : 'mt-2'}`}>
          {isPastDate ? (
            <span className="h-8 px-3 inline-flex items-center justify-center gap-1.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 whitespace-nowrap float-right">
              🔒 Past date — read-only
            </span>
          ) : (
            <div className="flex items-center gap-1.5 w-full">
              {/* Break button — amber to differentiate */}
              {isOnBreak ? (
                <button
                  onClick={() => endActiveBreak(barberId)}
                  className="flex-1 min-w-0 h-8 flex items-center justify-center gap-1 px-2 bg-amber-500 text-white rounded-full text-[11px] font-bold active:scale-95 transition-transform whitespace-nowrap overflow-hidden"
                  title={`On break · ends ${minsToTime12(activeBreak!.endMins)}`}
                >
                  <Coffee className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">End Break</span>
                </button>
              ) : nextBreak ? (
                <button
                  onClick={() => {
                    const startMs = Math.max(nowMins, nextBreak.startMins);
                    setBreakStartTime(minsToTime(startMs));
                    setBreakDuration(nextBreak.endMins - nextBreak.startMins);
                    setBreakDrawerOpen(true);
                  }}
                  className="flex-1 min-w-0 h-8 flex items-center justify-center gap-1 px-2 bg-amber-500 text-white rounded-full text-[11px] font-bold active:scale-95 transition-transform whitespace-nowrap overflow-hidden"
                  title="Tap to edit scheduled break"
                >
                  <Coffee className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Break {minsToTime12(nextBreak.startMins)}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); cancelBreak(nextBreak.id); }}
                    className="opacity-80 hover:opacity-100 shrink-0"
                    aria-label="Cancel scheduled break"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </button>
              ) : (
                <button
                  onClick={() => {
                    const defaultStart = isToday
                      ? Math.round((getNextAvailableSlot(barberId, 30) ?? nowMins) / 5) * 5
                      : 10 * 60;
                    setBreakStartTime(minsToTime(defaultStart));
                    setBreakDuration(30);
                    setBreakDrawerOpen(true);
                  }}
                  className="flex-1 min-w-0 h-8 flex items-center justify-center gap-1 px-2 bg-amber-500 text-white rounded-full text-[11px] font-bold active:scale-95 transition-transform whitespace-nowrap overflow-hidden"
                >
                  <Coffee className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Break</span>
                </button>
              )}

              {/* Appointment */}
              <button
                onClick={() => {
                  setApptDate(selectedDateStr);
                  setApptTime('10:00');
                  setDrawerMode('appointment');
                  setWiDrawerOpen(true);
                }}
                className="flex-1 min-w-0 h-8 flex items-center justify-center gap-1 px-2 bg-blue-600 text-white rounded-full text-[11px] font-bold active:scale-95 transition-transform whitespace-nowrap overflow-hidden"
                aria-label="Add phone appointment"
              >
                <Phone className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Appointment</span>
              </button>

              {/* Walk-in */}
              {isToday ? (
                <button
                  onClick={() => {
                    setDrawerMode('walkin');
                    setWiDrawerOpen(true);
                  }}
                  className="flex-1 min-w-0 h-8 flex items-center justify-center gap-1 px-2 bg-emerald-600 text-white rounded-full text-[11px] font-bold active:scale-95 transition-transform whitespace-nowrap overflow-hidden"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Walk-in</span>
                </button>
              ) : (
                <span className="flex-1 min-w-0 h-8 inline-flex items-center justify-center text-[10px] text-muted-foreground text-center leading-tight px-1">
                  Today only
                </span>
              )}
            </div>
          )}
        </div>

        {/* Toggle button */}
        <button
          onClick={toggleHeader}
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center w-7 h-7 rounded-full bg-background border-2 border-primary/40 shadow-md transition-transform active:scale-90 hover:border-primary/60"
          aria-label={headerCollapsed ? 'Expand header' : 'Collapse header'}
        >
          {headerCollapsed ? <ChevronDown className="w-4 h-4 text-foreground" /> : <ChevronUp className="w-4 h-4 text-foreground" />}
        </button>
      </div>

      {/* ── Timeline (shared component) ── */}
      <PartnerTimeline
        ref={timelineRef}
        selectedDate={selectedDate}
        canvasHeight={totalHeight}
        className="pb-[calc(var(--inset-bottom)+6rem)]"
        jumpBottomClass="bottom-[calc(var(--inset-bottom)+5.5rem)]"
      >
        {/* Colored track segments per booking */}
        {layoutSlots.map(slot => {
          const isFuture = selectedDate > todayStart && slot.booking.status === 'waiting';
          const trackPalette = getStatusPalette(slot.booking.status, { isFuture });
          return (
            <div
              key={`track-${slot.id}`}
              className={`absolute left-0 w-0.5 ${trackPalette.track} transition-colors`}
              style={{ top: `${slot.visualTop}px`, height: `${slot.visualHeight}px` }}
            />
          );
        })}

        {/* Break blocks — render every break for the selected date */}
        {dayBreaksForSelected.map(b => {
          const isActiveBreak = isToday && nowMins >= b.startMins && nowMins < b.endMins;
          const isPastBreak = isToday && nowMins >= b.endMins;
          return (
            <div
              key={b.id}
              className={`absolute left-1 right-0 bg-amber-500/15 border-l-4 border-amber-500 rounded-r-lg flex items-center gap-2 px-3 ${
                isActiveBreak ? 'ring-1 ring-amber-500/40' : ''
              }`}
              style={{
                top: `${(b.startMins - timelineStartMins) * PPM}px`,
                height: `${Math.max(8, (b.endMins - b.startMins) * PPM)}px`,
              }}
            >
              <Coffee className="w-4 h-4 text-amber-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                  {isActiveBreak ? 'On break' : isPastBreak ? 'Break' : 'Scheduled break'}
                  {b.endedEarly && <span className="font-normal opacity-70"> · ended early</span>}
                </p>
                <p className="text-[10px] text-amber-600/70">
                  {minsToTime12(b.startMins)} – {minsToTime12(b.endMins)} ({b.endMins - b.startMins}m)
                </p>
              </div>
              {/* Cancel only future scheduled breaks (not active or past) */}
              {!isActiveBreak && !isPastBreak && !isPastDate && (
                <button
                  onClick={(e) => { e.stopPropagation(); cancelBreak(b.id); }}
                  className="text-amber-700 dark:text-amber-400 opacity-70 hover:opacity-100 shrink-0"
                  aria-label="Cancel scheduled break"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}

        {/* ── Booking cards (collision-free) ── */}
        {layoutSlots.map(slot => {
          const booking = slot.booking;
          const bStart = timeToMins(booking.scheduledTime);
          const bEnd = bStart + booking.duration;
          const isOvertimeStart = bStart >= CLOSE_TIME;
          const isBeforeOpen = bStart < OPEN_TIME;
          const isSmall = slot.visualHeight <= MIN_CARD_PX + 10;
          const isExpanded = expandedCardId === booking.id;

          const serviceNames = booking.serviceIds
            .map(sid => mockServices.find(s => s.id === sid)?.name)
            .filter(Boolean);

          const bookingOvertime = booking.status === 'serving' && nowMins > bEnd;
          const isFuture = selectedDate > todayStart && booking.status === 'waiting';
          const palette = getStatusPalette(booking.status, { isFuture });
          const nodeStyle = { bg: palette.node, ring: palette.ring };

          const borderColor = palette.borderL;

          const bgColor = booking.status === 'completed'
            ? 'bg-muted/50'
            : booking.status === 'cancelled'
              ? palette.bg
              : isOvertimeStart || isBeforeOpen
                ? 'bg-amber-50 dark:bg-amber-950/20'
                : 'bg-card';

          const cardHeight = isExpanded ? 'auto' : `${slot.visualHeight}px`;

          return (
            <div key={booking.id} className="absolute left-0 right-0" style={{ top: `${slot.visualTop}px`, zIndex: isExpanded ? 30 : 10 }}>
              {/* Timeline node */}
              <div className="absolute left-0 top-3 -translate-x-1/2 z-10">
                <div className={`w-4 h-4 rounded-full ${nodeStyle.bg} ring-2 ${nodeStyle.ring} flex items-center justify-center`}>
                  {booking.status === 'completed' && <Check className="w-2.5 h-2.5 text-white" />}
                  {booking.status === 'cancelled' && <X className="w-2.5 h-2.5 text-white" />}
                  {booking.status === 'serving' && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                </div>
              </div>

              {/* Card */}
              <div
                onClick={() => isSmall && setExpandedCardId(isExpanded ? null : booking.id)}
                className={`${isExpanded ? 'timeline-card-expanded' : 'timeline-card'} ml-4 ${bgColor} rounded-xl border border-border border-l-4 ${borderColor} transition-all duration-200 ${
                  isSmall ? 'cursor-pointer' : ''
                } ${isExpanded ? 'shadow-xl ring-1 ring-primary/20 relative' : 'shadow-sm overflow-hidden'}`}
                style={{ height: isExpanded ? 'auto' : cardHeight, minHeight: isExpanded ? undefined : undefined }}
              >
                <div className={`p-2 h-full flex flex-col ${isExpanded ? '' : 'overflow-hidden'}`}>
                  {/* Row 1: Tags */}
                  <div className="flex flex-wrap items-center gap-0.5 mb-0.5">
                    <span className="tc-tag font-bold bg-foreground/10 text-foreground px-1 py-px rounded-full leading-none">#{booking.queueNo}</span>
                    <span className={`tc-tag font-medium px-1 py-px rounded-full flex items-center gap-px leading-none ${
                      booking.type === 'online' ? 'bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}>
                      {booking.type === 'online' ? <Smartphone className="w-2 h-2" /> : <User className="w-2 h-2" />}
                      {booking.type === 'online' ? 'Online' : 'Walk-in'}
                    </span>
                    {booking.status === 'serving' && (
                      <span className="tc-tag font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1 py-px rounded-full animate-pulse leading-none">Serving</span>
                    )}
                    {booking.status === 'waiting' && (
                      <span className={`tc-tag font-bold ${palette.tagBg} ${palette.tagText} px-1 py-px rounded-full leading-none`}>{isFuture ? 'Scheduled' : 'Waiting'}</span>
                    )}
                    {booking.status === 'completed' && (
                      <span className="tc-tag font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-1 py-px rounded-full flex items-center gap-0.5 leading-none">
                        <Check className="w-2 h-2" /> Finished
                      </span>
                    )}
                    {booking.status === 'cancelled' && (
                      <span className="tc-tag font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1 py-px rounded-full flex items-center gap-0.5 leading-none">
                        <X className="w-2 h-2" /> Cancelled
                      </span>
                    )}
                    {bookingOvertime && (
                      <span className="tc-tag font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1 py-px rounded-full flex items-center gap-0.5 leading-none">
                        <AlertTriangle className="w-2 h-2" /> OT
                      </span>
                    )}
                  </div>

                  {/* Row 2: Name + time */}
                  <div className="flex items-center justify-between gap-1">
                    <p className={`tc-name font-bold truncate ${booking.status === 'completed' ? 'text-muted-foreground line-through' : booking.status === 'cancelled' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                      {booking.clientName}
                    </p>
                    <span className="tc-meta text-muted-foreground whitespace-nowrap flex-shrink-0">
                      {minsToTime12(bStart)}–{minsToTime12(bEnd)} · ₹{booking.price}
                    </span>
                  </div>

                  {/* Row 3: Services */}
                  <div className="flex flex-wrap gap-0.5 mt-0.5">
                    {(isExpanded ? serviceNames : serviceNames.slice(0, 2)).map((name, i) => (
                      <span key={i} className="tc-service text-muted-foreground bg-secondary px-1 py-px rounded leading-none">{name}</span>
                    ))}
                    {!isExpanded && serviceNames.length > 2 && (
                      <span className="tc-service text-primary font-semibold px-1 py-px leading-none">+{serviceNames.length - 2}</span>
                    )}
                  </div>

                  {/* Action buttons — only available for today's bookings */}
                  {booking.status === 'serving' && isToday && (
                    <button onClick={(e) => { e.stopPropagation(); setConfirmCompleteId(booking.id); }} className="mt-1 w-full flex items-center justify-center gap-1 bg-amber-500 hover:bg-amber-600 text-white py-1.5 rounded-lg tc-action font-bold active:scale-95 transition-transform">
                      <Check className="w-3 h-3" /> COMPLETE
                    </button>
                  )}
                  {booking.status === 'waiting' && isToday && (
                    <div className="flex gap-1 mt-1">
                      <button onClick={(e) => { e.stopPropagation(); setConfirmStartId(booking.id); }} className="flex-1 flex items-center justify-center gap-1 bg-foreground text-background py-1.5 rounded-lg tc-action font-bold active:scale-95 transition-transform">
                        START
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleCancelRequest(booking.id); }} className="flex items-center justify-center px-2.5 py-1.5 rounded-lg bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 active:scale-95 transition-all" aria-label="Cancel booking">
                        <X className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    </div>
                  )}
                  {!isToday && (booking.status === 'waiting' || booking.status === 'serving') && (
                    <div className="mt-1 flex gap-1">
                      <div className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-muted/60 text-muted-foreground tc-action font-medium">
                        {selectedDate > new Date() ? '⏳ Upcoming' : '🔒 Past'}
                      </div>
                      {booking.status === 'waiting' && selectedDate >= todayStart && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDrawer(booking);
                          }}
                          className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-blue-600 text-white tc-action font-bold active:scale-95 transition-transform"
                          aria-label="Edit appointment"
                        >
                          <CalendarDays className="w-3 h-3" /> Edit
                        </button>
                      )}
                    </div>
                  )}
                  {isToday && booking.status === 'waiting' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDrawer(booking);
                      }}
                      className="mt-1 w-full flex items-center justify-center gap-1 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 tc-action font-semibold active:scale-95 transition-transform"
                      aria-label="Edit appointment"
                    >
                      <CalendarDays className="w-3 h-3" /> Edit
                    </button>
                  )}
                  {booking.status === 'cancelled' && booking.cancelReason && (
                    <p className="mt-1 text-[10px] text-destructive/80 italic truncate">Reason: {booking.cancelReason}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </PartnerTimeline>

      {/* Walk-In / Appointment Drawer */}
      <ActionDrawer
        open={wiDrawerOpen}
        onClose={() => { setWiDrawerOpen(false); resetDrawerState(); }}
        title={drawerMode === 'appointment' ? 'New Appointment' : 'Add Walk-in'}
        description={
          drawerMode === 'appointment'
            ? 'Phone booking · choose any future date & time'
            : `${selectedDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} · Queue position #${dayBookings.length + 1}`
        }
        footer={
          <div className="flex flex-col gap-2 w-full">
            {drawerHasConflict && (
              <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-1.5 text-[#e83030]">
                <AlertTriangle className="w-3 h-3" />
                Slot overlaps an existing booking — pick another time
              </div>
            )}
            <button
              onClick={handleAddWalkIn}
              disabled={!canSubmitWalkIn || drawerHasConflict}
              className="w-full py-3.5 rounded-2xl font-bold text-sm active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-accent-foreground shadow-lg"
              style={{
                background: 'var(--btn-gradient)',
                boxShadow: 'var(--btn-shadow)',
              }}
            >
              {drawerMode === 'appointment'
                ? <><Phone className="w-4 h-4" /> {canSubmitWalkIn ? 'Book Appointment' : 'Select at least one service'}</>
                : <><Plus className="w-4 h-4" /> {canSubmitWalkIn ? 'Add to Queue' : 'Select at least one service'}</>
              }
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-5 pt-2">

          {/* Date + Time pickers — appointment mode only */}
          {drawerMode === 'appointment' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Date</label>
                <div className="relative">
                  <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none" />
                  <input
                    type="date"
                    value={apptDate}
                    min={todayLocalStr()}
                    onChange={e => setApptDate(e.target.value)}
                    className="w-full bg-secondary/60 border border-border rounded-2xl pl-10 pr-3 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Time</label>
                <div className="relative">
                  <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none" />
                  <input
                    type="time"
                    value={apptTime}
                    onChange={e => setApptTime(e.target.value)}
                    className="w-full bg-secondary/60 border border-border rounded-2xl pl-10 pr-3 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60 transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Duration Stepper — placed above timeline so it's always visible while adjusting */}
          <div>
            <DurationDial value={manualDuration} onChange={handleDurationChange} />
            {durationTooShort && (
              <div className="mt-2 mx-auto w-fit flex items-center gap-1.5 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full">
                <AlertTriangle className="w-3 h-3" />
                Shorter than service total ({sumServiceDuration}m) — overlap possible
              </div>
            )}
          </div>

          {/* Compact conflict-preview mini-timeline */}
          {(() => {
            const proposedStart = drawerMode === 'appointment'
              ? timeToMins(apptTime)
              : Math.round(nowMins / 5) * 5;
            // For appointment mode, filter bookings by chosen apptDate (could differ from selectedDateStr)
            const previewDate = drawerMode === 'appointment' ? apptDate : selectedDateStr;
            const previewBookings = staffAppointments.filter(a => a.date === previewDate);
            const previewBreaks = staffBreaks.filter(b => b.date === previewDate);
            return (
              <SlotConflictPreview
                dayBookings={previewBookings}
                dayBreaks={previewBreaks}
                proposedStartMins={proposedStart}
                proposedDurationMins={manualDuration}
                nowMins={previewDate === todayLocalStr() ? nowMins : undefined}
                onPickStartMins={drawerMode === 'appointment'
                  ? (m) => setApptTime(minsToTime(m))
                  : undefined}
                onConflictChange={setDrawerHasConflict}
              />
            );
          })()}

          <div className="relative">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Customer <span className="normal-case font-normal text-muted-foreground/50">(optional)</span></label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
              <input
                value={walkInName}
                onChange={e => setWalkInName(e.target.value)}
                placeholder="Auto-assigns Client ID if empty"
                className="w-full bg-secondary/60 border border-border rounded-2xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60 transition-all"
              />
            </div>
          </div>

          {/* Phone number — appointment mode only */}
          {drawerMode === 'appointment' && (
            <div className="relative">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Phone <span className="normal-case font-normal text-muted-foreground/50">(optional)</span></label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                <input
                  value={walkInPhone}
                  onChange={e => setWalkInPhone(e.target.value)}
                  inputMode="tel"
                  placeholder="e.g. 98765 43210"
                  className="w-full bg-secondary/60 border border-border rounded-2xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60 transition-all"
                />
              </div>
            </div>
          )}

          {/* Services */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Services</label>
            {/* Gender Toggle */}
            <GenderToggle variant="segmented" className="mb-3" />
            {/* Service list - SalonDetail style */}
            <div className="bg-card rounded-2xl border border-border">
              <div className="px-2 space-y-1.5 py-2">
                {mockServices
                  .filter(s => {
                    if (s.gender === 'unisex') return true;
                    return s.gender === gender;
                  })
                  .map(s => {
                    const isSelected = selectedServices.includes(s.id);
                    return (
                      <div
                        key={s.id}
                        className={`flex items-center gap-3 rounded-2xl p-2.5 transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                          isSelected ? 'bg-accent/8 ring-1 ring-accent/30' : 'bg-background'
                        }`}
                        onClick={() => setSelectedServices(p => p.includes(s.id) ? p.filter(x => x !== s.id) : [...p, s.id])}
                      >
                        {/* Service Image */}
                        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border border-border">
                          {s.image ? (
                            <img src={s.image} alt={s.name} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full h-full bg-secondary flex items-center justify-center">
                              <Scissors className="w-4 h-4 text-muted-foreground/40" />
                            </div>
                          )}
                        </div>
                        {/* Service Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-heading font-medium text-[13px] text-foreground leading-tight truncate">{s.name}</h4>
                          <span className="text-[10px] font-body text-muted-foreground bg-secondary px-2 py-0.5 rounded-md inline-block mt-1">
                            {s.duration} min
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-heading font-semibold text-[14px] text-foreground">₹{s.price}</span>
                          </div>
                        </div>
                        {/* Select / Deselect */}
                        {isSelected ? (
                          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                            <Check className="w-4 h-4 text-accent-foreground" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center flex-shrink-0">
                            <Plus className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Selected summary */}
          {selectedServices.length > 0 && (
            <div className="flex items-center justify-between bg-accent/8 border border-accent/20 rounded-2xl px-4 py-2.5">
              <span className="text-xs text-foreground font-medium">
                {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} selected
              </span>
              <span className="text-sm font-bold text-accent">
                ₹{mockServices.filter(s => selectedServices.includes(s.id)).reduce((a, s) => a + s.price, 0)}
              </span>
            </div>
          )}
        </div>
      </ActionDrawer>

      {/* Cancel Reason Drawer */}
      <ActionDrawer open={cancelDrawerOpen} onClose={() => setCancelDrawerOpen(false)} title="Cancel Appointment" description="Select a reason for cancellation">
        <div className="flex flex-col gap-2">
          {CANCEL_REASONS.map(reason => (
            <button
              key={reason}
              onClick={() => handleCancelConfirm(reason)}
              className="w-full text-left px-4 py-3 rounded-xl bg-secondary hover:bg-destructive/10 text-sm font-medium text-foreground transition-colors active:scale-[0.98]"
            >
              {reason}
            </button>
          ))}
        </div>
      </ActionDrawer>

      {/* Confirm Start */}
      <ConfirmActionDialog
        open={!!confirmStartId}
        onOpenChange={(v) => !v && setConfirmStartId(null)}
        title="Start service?"
        description="This will mark the appointment as currently being served. Any other in-progress appointment for this staff will be paused."
        confirmLabel="Start now"
        tone="start"
        onConfirm={() => {
          if (!isToday) {
            const future = selectedDate > new Date();
            toast.error(future ? '⏳ Not today yet' : '🔒 Past date', {
              description: future ? 'Wait for the booking day' : 'Cannot edit past days',
              duration: 3000,
            });
            setConfirmStartId(null);
            return;
          }
          if (confirmStartId) startService(confirmStartId);
          setConfirmStartId(null);
        }}
      />

      {/* Confirm Complete */}
      <ConfirmActionDialog
        open={!!confirmCompleteId}
        onOpenChange={(v) => !v && setConfirmCompleteId(null)}
        title="Mark as completed?"
        description="This will close the appointment and log earnings. You can undo within a few seconds."
        confirmLabel="Complete"
        tone="complete"
        onConfirm={() => {
          if (!isToday) {
            const future = selectedDate > new Date();
            toast.error(future ? '⏳ Not today yet' : '🔒 Past date', {
              description: future ? 'Wait for the booking day' : 'Cannot edit past days',
              duration: 3000,
            });
            setConfirmCompleteId(null);
            return;
          }
          if (confirmCompleteId) {
            const id = confirmCompleteId;
            completeService(id);
            toast.success('✓ Service completed', {
              description: 'Earnings updated',
              action: { label: 'Undo', onClick: () => undoComplete(id) },
              duration: 6000,
            });
          }
          setConfirmCompleteId(null);
        }}
      />

      {/* Schedule Break Drawer */}
      <ActionDrawer
        open={breakDrawerOpen}
        onClose={() => setBreakDrawerOpen(false)}
        title="Schedule Break"
        description={`${activeStaff.name} · ${selectedDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}`}
        footer={
          <div className="flex flex-col gap-2 w-full">
            {breakHasConflict && (
              <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-1.5 text-[#e83030]">
                <AlertTriangle className="w-3 h-3" />
                Break overlaps an existing booking or break — pick another time
              </div>
            )}
            <button
              disabled={breakHasConflict || !breakStartTime}
              onClick={async () => {
                const startMins = timeToMins(breakStartTime);
                const result = await scheduleBreak(barberId, selectedDateStr, startMins, breakDuration);
                if (!result.ok) {
                  toast.error('🔒 ' + (result.error || 'Could not schedule break'), { duration: 3500 });
                  return;
                }
                toast.success('☕ Break scheduled', {
                  description: `${minsToTime12(startMins)} – ${minsToTime12(startMins + breakDuration)} (${breakDuration}m)`,
                  duration: 3000,
                });
                setBreakDrawerOpen(false);
              }}
              className="w-full py-3.5 rounded-2xl font-bold text-sm active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-accent-foreground shadow-lg"
              style={{ background: 'var(--btn-gradient)', boxShadow: 'var(--btn-shadow)' }}
            >
              <Coffee className="w-4 h-4" /> Save Break
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-5 pt-2">
          {/* Start time + Quick durations */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Start time</label>
              <div className="relative">
                <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none" />
                <input
                  type="time"
                  value={breakStartTime}
                  onChange={(e) => setBreakStartTime(e.target.value)}
                  className="w-full bg-secondary/60 border border-border rounded-2xl pl-10 pr-3 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Duration</label>
              <div className="flex gap-1.5">
                {[15, 30, 45, 60].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setBreakDuration(d)}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${
                      breakDuration === d
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-secondary/60 text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    {d}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Day at a glance */}
          {breakStartTime && (
            <SlotConflictPreview
              dayBookings={dayBookings}
              dayBreaks={dayBreaksForSelected}
              proposedStartMins={timeToMins(breakStartTime)}
              proposedDurationMins={breakDuration}
              proposedKind="break"
              nowMins={isToday ? nowMins : undefined}
              onPickStartMins={(m) => setBreakStartTime(minsToTime(m))}
              onConflictChange={setBreakHasConflict}
            />
          )}
        </div>
      </ActionDrawer>


      {/* Past-date walk-in blocked */}
      <ConfirmActionDialog
        open={pastDateBlockOpen}
        onOpenChange={setPastDateBlockOpen}
        tone="destructive"
        title="🔒 Past date"
        description="You can't add walk-ins to previous days."
        confirmLabel="Got it"
        cancelLabel="Close"
        onConfirm={() => setPastDateBlockOpen(false)}
      />

      {/* Edit Appointment Drawer */}
      <ActionDrawer
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit Appointment"
        description={editTarget ? `${editTarget.clientName} · ${minsToTime12(timeToMins(editTarget.scheduledTime))}` : ''}
        footer={
          <div className="flex flex-col gap-2 w-full">
            {editHasConflict && (
              <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-1.5">
                <AlertTriangle className="w-3 h-3" />
                Slot overlaps another booking — pick another time
              </div>
            )}
            <button
              disabled={!canSaveEdit || editHasConflict}
              onClick={async () => {
                if (!editTarget) return;
                const result = await editAppointment(editTarget.id, {
                  serviceIds: editServices,
                  duration: editDuration,
                  price: editSumPrice,
                  date: editDate,
                  time: editTime,
                  name: editName,
                  phone: editTarget.type === 'online' ? editPhone : undefined,
                });
                if (!result.ok) {
                  toast.error('🔒 ' + (result.error || 'Invalid changes'), {
                    description: 'Review the fields and try again.',
                    duration: 3500,
                  });
                  return;
                }
                const dateLabel = formatLocalDate(editDate);
                toast.success('✏️ Updated', {
                  description: `${dateLabel} · ${editTime} · ₹${editSumPrice}`,
                  duration: 3000,
                });
                setEditTarget(null);
              }}
              className="w-full py-3.5 rounded-2xl font-bold text-sm active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-accent-foreground shadow-lg"
              style={{ background: 'var(--btn-gradient)', boxShadow: 'var(--btn-shadow)' }}
            >
              <Check className="w-4 h-4" /> {canSaveEdit ? 'Save changes' : 'Select at least one service'}
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-5 pt-2">
          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Date</label>
              <div className="relative">
                <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none" />
                <input
                  type="date"
                  value={editDate}
                  min={todayLocalStr()}
                  onChange={e => setEditDate(e.target.value)}
                  className="w-full bg-secondary/60 border border-border rounded-2xl pl-10 pr-3 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Time</label>
              <div className="relative">
                <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none" />
                <input
                  type="time"
                  value={editTime}
                  onChange={e => setEditTime(e.target.value)}
                  className="w-full bg-secondary/60 border border-border rounded-2xl pl-10 pr-3 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Duration — placed above timeline so it's always visible while adjusting */}
          <div>
            <DurationDial value={editDuration} onChange={(v) => { setEditDurationManuallySet(true); setEditDuration(v); }} />
            {editDurationTooShort && (
              <div className="mt-2 mx-auto w-fit flex items-center gap-1.5 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full">
                <AlertTriangle className="w-3 h-3" />
                Shorter than service total ({editSumDuration}m) — overlap possible
              </div>
            )}
          </div>

          {/* Compact conflict-preview mini-timeline */}
          {editTarget && (
            <SlotConflictPreview
              dayBookings={staffAppointments.filter(a => a.date === editDate)}
              dayBreaks={staffBreaks.filter(b => b.date === editDate)}
              proposedStartMins={timeToMins(editTime || '00:00')}
              proposedDurationMins={editDuration}
              currentBookingId={editTarget.id}
              nowMins={editDate === todayLocalStr() ? nowMins : undefined}
              onPickStartMins={(m) => setEditTime(minsToTime(m))}
              onConflictChange={setEditHasConflict}
            />
          )}

          {/* Customer name */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Customer</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="Customer name"
                className="w-full bg-secondary/60 border border-border rounded-2xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60 transition-all"
              />
            </div>
          </div>

          {/* Phone — only for online/phone bookings */}
          {editTarget?.type === 'online' && (
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Phone <span className="normal-case font-normal text-muted-foreground/50">(optional)</span></label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                <input
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  inputMode="tel"
                  placeholder="e.g. 98765 43210"
                  className="w-full bg-secondary/60 border border-border rounded-2xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60 transition-all"
                />
              </div>
            </div>
          )}

          {/* Services */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Services</label>
            <GenderToggle variant="segmented" className="mb-3" />
            <div className="bg-card rounded-2xl border border-border">
              <div className="px-2 space-y-1.5 py-2">
                {mockServices
                  .filter(s => s.gender === 'unisex' || s.gender === gender)
                  .map(s => {
                    const isSelected = editServices.includes(s.id);
                    return (
                      <div
                        key={s.id}
                        className={`flex items-center gap-3 rounded-2xl p-2.5 transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                          isSelected ? 'bg-accent/8 ring-1 ring-accent/30' : 'bg-background'
                        }`}
                        onClick={() => setEditServices(p => p.includes(s.id) ? p.filter(x => x !== s.id) : [...p, s.id])}
                      >
                        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border border-border">
                          {s.image ? (
                            <img src={s.image} alt={s.name} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full h-full bg-secondary flex items-center justify-center">
                              <Scissors className="w-4 h-4 text-muted-foreground/40" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-heading font-medium text-[13px] text-foreground leading-tight truncate">{s.name}</h4>
                          <span className="text-[10px] font-body text-muted-foreground bg-secondary px-2 py-0.5 rounded-md inline-block mt-1">
                            {s.duration} min
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-heading font-semibold text-[14px] text-foreground">₹{s.price}</span>
                          </div>
                        </div>
                        {isSelected ? (
                          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                            <Check className="w-4 h-4 text-accent-foreground" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center flex-shrink-0">
                            <Plus className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Live summary */}
          {editServices.length > 0 && (
            <div className="flex items-center justify-between bg-accent/8 border border-accent/20 rounded-2xl px-4 py-2.5">
              <span className="text-xs text-foreground font-medium">
                {editServices.length} service{editServices.length > 1 ? 's' : ''} · {Math.floor(editDuration / 60)}h {editDuration % 60}m
              </span>
              <span className="text-sm font-bold text-accent">₹{editSumPrice}</span>
            </div>
          )}
        </div>
      </ActionDrawer>
    </div>
    </PartnerPageState>
  );
};

export default StaffFloor;
