import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
  // Waiting (urgent) → Red
  waiting: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
  // Pending treated as waiting fallback
  pending: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
  // Confirmed = future scheduled → Sky
  confirmed: 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300',
  // Serving / in-progress → Amber
  serving: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  'in-progress': 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  // Completed → Green
  completed: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
  // Cancelled → Slate (muted)
  cancelled: 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
};

const StatusBadge = ({ status }: { status: string }) => (
  <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize', statusStyles[status] ?? statusStyles.pending)}>
    {status.replace('-', ' ')}
  </span>
);

export default StatusBadge;
