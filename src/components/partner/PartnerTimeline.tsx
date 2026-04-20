import React, { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import { OPEN_TIME, CLOSE_TIME, PPM, minsToTime12 } from '@/data/partnerMockData';
import TimelineJumpControl from './TimelineJumpControl';
import { Calendar } from 'lucide-react';

/* ── Constants ── */
const TIMELINE_START = 0;
const TIMELINE_END = 24 * 60; // 1440

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/* ── Public handle ── */
export interface PartnerTimelineHandle {
  scrollToMins: (mins: number) => void;
  getScrollElement: () => HTMLDivElement | null;
}

interface PartnerTimelineProps {
  selectedDate: Date;
  /** Rendered inside the positioned timeline canvas (booking cards, breaks, etc.) */
  children: React.ReactNode;
  /** Total pixel height of the timeline canvas — pass the collision-layout-adjusted height */
  canvasHeight: number;
  /** Extra className on the scroll wrapper */
  className?: string;
  /** Empty state — if true, show "no bookings" instead of the timeline */
  empty?: boolean;
  /** Jump control bottom offset className override */
  jumpBottomClass?: string;
}

const PartnerTimeline = forwardRef<PartnerTimelineHandle, PartnerTimelineProps>(
  ({ selectedDate, children, canvasHeight, className, empty, jumpBottomClass }, ref) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [showJump, setShowJump] = useState(false);
    const [now, setNow] = useState(new Date());

    const getScrollTarget = useCallback((mins: number) => {
      const el = scrollRef.current;
      if (!el) return Math.max(0, mins * PPM - 120);
      const offset = Math.min(Math.max(el.clientHeight * 0.32, 120), 220);
      return Math.max(0, mins * PPM - offset);
    }, []);

    useImperativeHandle(ref, () => ({
      scrollToMins: (mins: number) => {
        scrollRef.current?.scrollTo({ top: getScrollTarget(mins), behavior: 'smooth' });
      },
      getScrollElement: () => scrollRef.current,
    }));

    // Tick every second
    useEffect(() => {
      const t = setInterval(() => setNow(new Date()), 1000);
      return () => clearInterval(t);
    }, []);

    const isToday = isSameDay(selectedDate, new Date());
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const nowOffset = nowMins * PPM;

    // Auto-scroll on date change
    useEffect(() => {
      const el = scrollRef.current;
      if (!el) return;
      const raf = requestAnimationFrame(() => {
        setTimeout(() => {
          const target = isToday ? nowMins : OPEN_TIME;
          el.scrollTop = getScrollTarget(target);
        }, 50);
      });
      return () => cancelAnimationFrame(raf);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDate, getScrollTarget]);

    // Track scroll → show/hide jump button
    useEffect(() => {
      const el = scrollRef.current;
      if (!el) return;
      const check = () => {
        const mins = new Date().getHours() * 60 + new Date().getMinutes();
        const px = mins * PPM;
        const top = el.scrollTop;
        const bottom = top + el.clientHeight;
        setShowJump(!(px >= top + 50 && px <= bottom - 50) && isToday);
      };
      el.addEventListener('scroll', check, { passive: true });
      check();
      return () => el.removeEventListener('scroll', check);
    }, [isToday]);

    const scrollToNow = useCallback(() => {
      const mins = new Date().getHours() * 60 + new Date().getMinutes();
      const target = isToday ? mins : OPEN_TIME;
      scrollRef.current?.scrollTo({ top: getScrollTarget(target), behavior: 'smooth' });
    }, [getScrollTarget, isToday]);

    // Hour marks: 0 → 24 inclusive
    const hours = Array.from({ length: 25 }, (_, i) => i * 60);

    // Ensure canvas is at least as tall as the natural 24-hour range
    const naturalHeight = TIMELINE_END * PPM;
    const height = Math.max(naturalHeight, canvasHeight);

    if (empty) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Calendar className="w-10 h-10 mb-2 opacity-40" />
          <p className="text-sm font-medium">No bookings found</p>
          <p className="text-xs mt-1">Try a different date or staff member</p>
        </div>
      );
    }

    return (
      <div className="flex-1 relative flex flex-col min-h-0">
        <div
          ref={scrollRef}
          className={`flex-1 overflow-y-auto min-h-0 overscroll-contain ${className ?? ''}`}
        >
          <div className="relative ml-14 mr-3 sm:mr-4 lg:mr-6 mt-2" style={{ height: `${height + 160}px` }}>
            {/* Default timeline track */}
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-border/40" />

            {/* Closed band (midnight → open) */}
            <div
              className="absolute left-0 right-0 bg-muted/30 border-b-2 border-border/60"
              style={{ top: 0, height: `${OPEN_TIME * PPM}px` }}
            >
              <span className="sticky top-2 left-1 inline-block text-foreground/50 uppercase tracking-wider text-[10px] font-bold ml-1 mt-1">
                Closed
              </span>
            </div>

            {/* Overtime band (close → midnight) */}
            <div
              className="absolute left-0 right-0 bg-amber-500/5 border-t-2 border-amber-500/40"
              style={{ top: `${CLOSE_TIME * PPM}px`, height: `${(TIMELINE_END - CLOSE_TIME) * PPM}px` }}
            >
              <span className="sticky top-2 left-1 inline-block text-[10px] text-amber-500 font-bold uppercase tracking-wider ml-1 mt-1">
                ⚠ Overtime
              </span>
            </div>

            {/* Hour grid lines */}
            {hours.map(hourMins => {
              const top = hourMins * PPM;
              const isOvertime = hourMins >= CLOSE_TIME || hourMins < OPEN_TIME;
              return (
                <React.Fragment key={`h-${hourMins}`}>
                  <div className="absolute left-0 right-0 border-t border-border/60" style={{ top: `${top}px` }}>
                    <span className={`absolute -left-14 -top-2.5 text-[10px] font-bold w-12 text-right ${isOvertime ? 'text-amber-500' : 'text-muted-foreground'}`}>
                      {formatHourLabel(hourMins)}
                    </span>
                  </div>
                  {hourMins + 30 < TIMELINE_END && (
                    <div className="absolute left-0 right-0 border-t border-dashed border-border/30" style={{ top: `${top + 30 * PPM}px` }}>
                      <span className="absolute -left-14 -top-2.5 text-[9px] text-muted-foreground/50 w-12 text-right">
                        {minsToTime12(hourMins + 30)}
                      </span>
                    </div>
                  )}
                </React.Fragment>
              );
            })}

            {/* NOW indicator */}
            {isToday && nowMins >= TIMELINE_START && nowMins <= TIMELINE_END && (
              <div className="absolute left-0 right-0 z-20 flex items-center pointer-events-none" style={{ top: `${nowOffset}px` }}>
                <div className="relative -ml-1.5">
                  <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
                  <div className="absolute inset-0 w-3 h-3 rounded-full bg-destructive/40 animate-ping" />
                </div>
                <div className="flex-1 h-[2px] bg-destructive" />
                <span className="text-[9px] font-bold text-destructive ml-1 bg-background px-1.5 py-0.5 rounded-full shadow-sm border border-destructive/20">NOW</span>
              </div>
            )}

            {/* Page-specific content (cards, breaks, track segments) */}
            {children}
          </div>
        </div>

        <TimelineJumpControl
          visible={showJump}
          onClick={scrollToNow}
          className={jumpBottomClass ?? 'bottom-[calc(var(--inset-bottom)+5.5rem)]'}
        />
      </div>
    );
  }
);

PartnerTimeline.displayName = 'PartnerTimeline';

/** Format hour label — handles 0=12AM, 12=12PM, 24=12AM correctly */
function formatHourLabel(mins: number): string {
  const h = Math.floor(mins / 60);
  if (h === 0 || h === 24) return '12 AM';
  if (h === 12) return '12 PM';
  if (h < 12) return `${h} AM`;
  return `${h - 12} PM`;
}

export default PartnerTimeline;
