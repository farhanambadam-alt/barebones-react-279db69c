import { LucideIcon, Inbox } from 'lucide-react';
import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  message?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Generic empty-state block used inside cards or page sections.
 * Keeps visual language consistent across partner pages.
 */
const EmptyState = ({
  icon: Icon = Inbox,
  title,
  message,
  action,
  className = '',
}: EmptyStateProps) => (
  <div className={`flex flex-col items-center justify-center text-center py-10 px-4 ${className}`}>
    <div className="w-14 h-14 rounded-2xl bg-secondary/60 flex items-center justify-center mb-3">
      <Icon className="w-6 h-6 text-muted-foreground/50" aria-hidden="true" />
    </div>
    <p className="text-sm font-semibold text-foreground">{title}</p>
    {message && <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">{message}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export default EmptyState;
