import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type { AppUser } from '@/types/salon';

type AuthStatus = 'idle' | 'loading' | 'success' | 'error';

interface CustomerAuthContextType {
  user: AppUser | null;
  isGuest: boolean;
  status: AuthStatus;
  error: string | null;
  /** Open the auth modal. `reason` is shown in the modal header. */
  requestAuth: (reason?: string) => void;
  closeAuthModal: () => void;
  authModalOpen: boolean;
  authReason: string | null;
  /** Stub sign-in — Google Auth swaps in here. */
  signIn: () => Promise<void>;
  signOut: () => void;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

const STORAGE_KEY = 'customer_user';

export const CustomerAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AppUser) : null;
    } catch {
      return null;
    }
  });
  const [status, setStatus] = useState<AuthStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authReason, setAuthReason] = useState<string | null>(null);

  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  }, [user]);

  const requestAuth = useCallback((reason?: string) => {
    setAuthReason(reason ?? null);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
    setAuthReason(null);
    if (status === 'error') {
      setStatus('idle');
      setError(null);
    }
  }, [status]);

  const signIn = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      // Stub: replace with `lovable.auth.signInWithOAuth("google", ...)` when wiring.
      await new Promise((r) => setTimeout(r, 700));
      const stub: AppUser = {
        id: 'guest_' + Math.random().toString(36).slice(2, 8),
        role: 'customer',
        name: 'Aarav Sharma',
        phone: '+91 98765 43210',
      };
      setUser(stub);
      setStatus('success');
      setAuthModalOpen(false);
      setAuthReason(null);
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Sign in failed');
    }
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    setStatus('idle');
    setError(null);
  }, []);

  return (
    <CustomerAuthContext.Provider
      value={{
        user,
        isGuest: !user,
        status,
        error,
        requestAuth,
        closeAuthModal,
        authModalOpen,
        authReason,
        signIn,
        signOut,
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
};

export const useCustomerAuth = () => {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error('useCustomerAuth must be used within CustomerAuthProvider');
  return ctx;
};
