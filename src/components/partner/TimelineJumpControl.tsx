import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineJumpControlProps {
  visible: boolean;
  onClick: () => void;
  className?: string;
}

const TimelineJumpControl = ({ visible, onClick, className }: TimelineJumpControlProps) => {
  if (!visible) return null;

  return (
    <div className={cn('pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4', className)}>
      <button
        type="button"
        onClick={onClick}
        className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-card/95 text-foreground shadow-lg backdrop-blur-xl transition-all duration-200 animate-in fade-in zoom-in-75 active:scale-95"
        aria-label="Jump to current time"
      >
        <Clock className="h-4 w-4 text-primary" />
      </button>
    </div>
  );
};

export default TimelineJumpControl;