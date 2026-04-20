import React, { useMemo, useRef, useEffect } from 'react';
import { Calendar } from 'lucide-react';

interface DateChipStripProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  rangeBefore?: number;
  rangeAfter?: number;
  showDateInput?: boolean;
  onToggleDateInput?: () => void;
}

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const DateChipStrip: React.FC<DateChipStripProps> = ({
  selectedDate,
  onSelectDate,
  rangeBefore = 7,
  rangeAfter = 7,
  showDateInput = false,
  onToggleDateInput,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const chips = useMemo(() => {
    const result: { date: Date; dayName: string; dayNum: number; isToday: boolean }[] = [];
    for (let i = -rangeBefore; i <= rangeAfter; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      result.push({
        date: d,
        dayName: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        dayNum: d.getDate(),
        isToday: i === 0,
      });
    }
    return result;
  }, [today, rangeBefore, rangeAfter]);

  // Auto-scroll to today on mount
  useEffect(() => {
    if (!scrollRef.current) return;
    const todayEl = scrollRef.current.querySelector('[data-today="true"]');
    if (todayEl) {
      todayEl.scrollIntoView({ inline: 'center', block: 'nearest' });
    }
  }, []);

  return (
    <div className="flex items-center gap-1.5">
      {onToggleDateInput && (
        <button
          onClick={onToggleDateInput}
          className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 transition-all active:scale-90 ${
            showDateInput
              ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
              : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
          }`}
          aria-label="Pick a date"
        >
          <Calendar className="w-4 h-4" />
        </button>
      )}
      <div ref={scrollRef} className="flex gap-1 overflow-x-auto flex-1 scrollbar-none no-scrollbar py-1 -mx-0.5 px-0.5">
        {chips.map(chip => {
          const isSelected = isSameDay(chip.date, selectedDate);
          const isSelectedAndToday = isSelected && chip.isToday;
          return (
            <button
              key={chip.date.toISOString()}
              data-today={chip.isToday ? 'true' : undefined}
              onClick={() => onSelectDate(new Date(chip.date))}
              className={`relative flex flex-col items-center min-w-[44px] px-2.5 py-1.5 rounded-2xl text-center transition-all shrink-0 ${
                isSelectedAndToday
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25 ring-2 ring-primary/30 ring-offset-1 ring-offset-card'
                  : isSelected
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                    : chip.isToday
                      ? 'bg-primary/12 text-primary ring-[1.5px] ring-primary/40'
                      : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
              }`}
            >
              <span className="text-[9px] font-semibold uppercase leading-none tracking-wide">{chip.dayName}</span>
              <span className="text-base font-bold leading-snug">{chip.dayNum}</span>
              {chip.isToday && (
                <span className={`absolute -bottom-0.5 w-1.5 h-1.5 rounded-full ${
                  isSelected ? 'bg-primary-foreground' : 'bg-primary'
                }`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DateChipStrip;
