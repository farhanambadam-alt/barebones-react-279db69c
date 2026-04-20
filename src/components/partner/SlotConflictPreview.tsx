import React, { useMemo, useState } from 'react';
import { minsToTime12, timeToMins, type Appointment } from '@/data/partnerMockData';
import { AlertTriangle, Check, Coffee } from 'lucide-react';

interface DayBreak {
  id: string;
  startMins: number;
  endMins: number;
}

interface Props {
  /** All bookings for the selected staff + date (any status). Cancelled are filtered out internally. */
  dayBookings: Appointment[];
  /** Existing breaks for the selected staff + date. Treated as busy/blocked time. */
  dayBreaks?: DayBreak[];
  /** Proposed slot start in minutes since midnight. */
  proposedStartMins: number;
  /** Proposed slot duration in minutes. */
  proposedDurationMins: number;
  /** When editing, exclude this booking id from conflict math. */
  currentBookingId?: string;
  /** When editing a break, exclude this break id from conflict math. */
  currentBreakId?: string;
  /** Visual+caption mode of the proposed segment. */
  proposedKind?: 'booking' | 'break';
  /** Window start (default 9 AM). */
  dayStartMins?: number;
  /** Window end (default 9 PM). */
  dayEndMins?: number;
  /** If provided (today only), draws an amber NOW tick. */
  nowMins?: number;
  /** Optional: snap-to-minute when user taps the bar (rounds to 5 min). */
  onPickStartMins?: (mins: number) => void;
  /** Notify parent when conflict state changes (so it can disable submit). */
  onConflictChange?: (hasConflict: boolean) => void;
}

const HOUR_LABEL_STEP = 2;

const SlotConflictPreview: React.FC<Props> = ({
  dayBookings,
  dayBreaks = [],
  proposedStartMins,
  proposedDurationMins,
  currentBookingId,
  currentBreakId,
  proposedKind = 'booking',
  dayStartMins = 9 * 60,
  dayEndMins = 21 * 60,
  nowMins,
  onPickStartMins,
  onConflictChange,
}) => {
  const windowMins = dayEndMins - dayStartMins;
  const proposedEndMins = proposedStartMins + proposedDurationMins;

  // Existing busy segments — exclude cancelled & the booking being edited
  const busy = useMemo(() => {
    return dayBookings
      .filter(b => b.status !== 'cancelled' && b.id !== currentBookingId)
      .map(b => {
        const start = timeToMins(b.scheduledTime);
        return { id: b.id, name: b.clientName, start, end: start + b.duration };
      });
  }, [dayBookings, currentBookingId]);

  const breakSegments = useMemo(() => {
    return dayBreaks
      .filter(b => b.id !== currentBreakId)
      .map(b => ({ id: b.id, start: b.startMins, end: b.endMins }));
  }, [dayBreaks, currentBreakId]);

  const bookingOverlap = useMemo(
    () => busy.find(b => proposedStartMins < b.end && proposedEndMins > b.start),
    [busy, proposedStartMins, proposedEndMins]
  );
  const breakOverlap = useMemo(
    () => breakSegments.find(b => proposedStartMins < b.end && proposedEndMins > b.start),
    [breakSegments, proposedStartMins, proposedEndMins]
  );
  const hasConflict = !!bookingOverlap || !!breakOverlap;

  // Notify parent
  React.useEffect(() => {
    onConflictChange?.(hasConflict);
  }, [hasConflict, onConflictChange]);

  const pctFromMins = (m: number) => {
    const clamped = Math.max(dayStartMins, Math.min(dayEndMins, m));
    return ((clamped - dayStartMins) / windowMins) * 100;
  };

  const proposedLeftPct = pctFromMins(proposedStartMins);
  const proposedRightPct = pctFromMins(proposedEndMins);
  const proposedWidthPct = Math.max(1.2, proposedRightPct - proposedLeftPct);

  const outOfWindow =
    proposedEndMins <= dayStartMins || proposedStartMins >= dayEndMins;

  const [tooltip, setTooltip] = useState<{ name: string; start: number; end: number } | null>(null);

  // Hour labels
  const hourLabels: { mins: number; label: string }[] = [];
  for (let h = Math.ceil(dayStartMins / 60); h <= Math.floor(dayEndMins / 60); h++) {
    if ((h - Math.ceil(dayStartMins / 60)) % HOUR_LABEL_STEP !== 0) continue;
    const m = h * 60;
    const period = h >= 12 ? 'P' : 'A';
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    hourLabels.push({ mins: m, label: `${h12}${period}` });
  }

  const handleBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onPickStartMins) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    const raw = dayStartMins + ratio * windowMins;
    const snapped = Math.round(raw / 5) * 5;
    onPickStartMins(snapped);
  };

  const proposedLabel = proposedKind === 'break' ? 'Break' : '';
  const captionText = outOfWindow
    ? `${proposedLabel ? proposedLabel + ' ' : ''}${minsToTime12(proposedStartMins)} → ${minsToTime12(proposedEndMins)} · outside salon hours`
    : breakOverlap
      ? `Overlaps with break ${minsToTime12(breakOverlap.start)}–${minsToTime12(breakOverlap.end)}`
      : bookingOverlap
        ? `Overlaps with ${bookingOverlap.name} ${minsToTime12(bookingOverlap.start)}–${minsToTime12(bookingOverlap.end)}`
        : `${proposedLabel ? proposedLabel + ' ' : ''}${minsToTime12(proposedStartMins)} → ${minsToTime12(proposedEndMins)} · ${proposedDurationMins} min · Fits`;

  // Visual style of the proposed segment
  const proposedClass = hasConflict
    ? 'bg-destructive/80 ring-2 ring-destructive animate-pulse'
    : proposedKind === 'break'
      ? 'bg-amber-500/85 ring-1 ring-amber-600'
      : 'bg-emerald-500/85 ring-1 ring-emerald-600';

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Day at a glance
        </label>
        <span className="text-[10px] text-muted-foreground/70">
          {minsToTime12(dayStartMins)} – {minsToTime12(dayEndMins)}
        </span>
      </div>

      {/* The bar */}
      <div
        onClick={handleBarClick}
        className={`relative h-7 rounded-full bg-secondary/60 border border-border overflow-hidden ${
          onPickStartMins ? 'cursor-pointer' : ''
        }`}
        role="img"
        aria-label={captionText}
      >
        {/* Existing busy segments (bookings) */}
        {busy.map(b => {
          const left = pctFromMins(b.start);
          const right = pctFromMins(b.end);
          const width = Math.max(0.8, right - left);
          if (width <= 0) return null;
          return (
            <button
              key={b.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setTooltip(prev =>
                  prev?.name === b.name && prev.start === b.start ? null : { name: b.name, start: b.start, end: b.end }
                );
              }}
              className="absolute top-0 h-full bg-foreground/30 hover:bg-foreground/40 transition-colors"
              style={{ left: `${left}%`, width: `${width}%` }}
              aria-label={`${b.name} ${minsToTime12(b.start)} to ${minsToTime12(b.end)}`}
            />
          );
        })}

        {/* Existing break segments (amber) */}
        {breakSegments.map(b => {
          const left = pctFromMins(b.start);
          const right = pctFromMins(b.end);
          const width = Math.max(0.8, right - left);
          if (width <= 0) return null;
          return (
            <button
              key={b.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setTooltip(prev =>
                  prev?.name === 'Break' && prev.start === b.start ? null : { name: 'Break', start: b.start, end: b.end }
                );
              }}
              className="absolute top-0 h-full bg-amber-500/40 hover:bg-amber-500/55 transition-colors"
              style={{ left: `${left}%`, width: `${width}%` }}
              aria-label={`Break ${minsToTime12(b.start)} to ${minsToTime12(b.end)}`}
            />
          );
        })}

        {/* Proposed segment */}
        {!outOfWindow && (
          <div
            className={`absolute top-0 h-full transition-all ${proposedClass}`}
            style={{ left: `${proposedLeftPct}%`, width: `${proposedWidthPct}%` }}
          />
        )}

        {/* NOW tick (today only) */}
        {nowMins !== undefined && nowMins >= dayStartMins && nowMins <= dayEndMins && (
          <div
            className="absolute top-0 h-full w-0.5 bg-amber-500"
            style={{ left: `${pctFromMins(nowMins)}%` }}
            aria-label="Now"
          />
        )}
      </div>

      {/* Hour labels */}
      <div className="relative h-3">
        {hourLabels.map(h => (
          <span
            key={h.mins}
            className="absolute top-0 -translate-x-1/2 text-[9px] text-muted-foreground/70 tabular-nums"
            style={{ left: `${pctFromMins(h.mins)}%` }}
          >
            {h.label}
          </span>
        ))}
      </div>

      {/* Caption */}
      <div
        className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg ${
          hasConflict || outOfWindow
            ? 'bg-destructive/10 border border-destructive/30 text-[#e83030]'
            : proposedKind === 'break'
              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30'
              : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
        }`}
      >
        {hasConflict || outOfWindow ? (
          <AlertTriangle className="w-3 h-3 shrink-0" />
        ) : proposedKind === 'break' ? (
          <Coffee className="w-3 h-3 shrink-0" />
        ) : (
          <Check className="w-3 h-3 shrink-0" />
        )}
        <span className="truncate">{captionText}</span>
      </div>

      {/* Tooltip line for tapped existing booking/break */}
      {tooltip && (
        <div className="text-[10px] text-muted-foreground px-1">
          <span className="font-semibold">{tooltip.name}</span> ·{' '}
          {minsToTime12(tooltip.start)}–{minsToTime12(tooltip.end)}
        </div>
      )}
    </div>
  );
};

export default SlotConflictPreview;
