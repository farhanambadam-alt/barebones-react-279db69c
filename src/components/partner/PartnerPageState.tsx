import { ReactNode } from 'react';
import { usePartner } from '@/contexts/PartnerContext';
import ErrorState from '@/components/ErrorState';
import { Loader2 } from 'lucide-react';

interface PartnerPageStateProps {
  children: ReactNode;
  /** Optional override; defaults to context.loading */
  loading?: boolean;
  /** Optional override; defaults to context.error */
  error?: string | null;
  /** Optional retry override; defaults to context.refetch */
  onRetry?: () => void;
}

/**
 * Lifecycle wrapper for every partner page.
 *
 * Today: in-memory mocks → loading is always false, error always null,
 * so this just renders `children`.
 * Tomorrow: wired to Supabase → flips to skeleton / ErrorState automatically
 * without touching individual pages.
 */
const PartnerPageState = ({ children, loading, error, onRetry }: PartnerPageStateProps) => {
  const ctx = usePartner();
  const isLoading = loading ?? ctx.loading;
  const errorMsg = error ?? ctx.error;
  const retry = onRetry ?? (() => { ctx.refetch(); });

  if (isLoading) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-muted-foreground"
        role="status"
        aria-live="polite"
        aria-label="Loading"
      >
        <Loader2 className="w-6 h-6 animate-spin text-primary" aria-hidden="true" />
        <p className="text-xs font-medium">Loading…</p>
      </div>
    );
  }

  if (errorMsg) {
    return <ErrorState title="Couldn't load" message={errorMsg} onRetry={retry} />;
  }

  return <>{children}</>;
};

export default PartnerPageState;
