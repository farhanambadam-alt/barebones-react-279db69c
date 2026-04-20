import { useState } from 'react';
import { OWNER_PIN } from '@/data/partnerMockData';

interface AccessGateProps {
  children: React.ReactNode;
}

/** PIN-protected gate for owner section. PIN: 1234 */
const AccessGate = ({ children }: AccessGateProps) => {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (unlocked) return <>{children}</>;

  const submit = () => {
    if (pin === OWNER_PIN) {
      setUnlocked(true);
    } else {
      setError(true);
      setPin('');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <span className="text-3xl">🔒</span>
      </div>
      <h1 className="text-xl font-heading font-bold text-foreground mb-1">Owner Access</h1>
      <p className="text-sm text-muted-foreground mb-6">Enter PIN to continue</p>
      <input
        type="password"
        inputMode="numeric"
        maxLength={4}
        value={pin}
        onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setError(false); }}
        onKeyDown={e => e.key === 'Enter' && submit()}
        className="w-40 text-center text-2xl tracking-[0.5em] bg-card border border-border rounded-xl py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        placeholder="••••"
        autoFocus
      />
      {error && <p className="text-destructive text-xs mt-2">Incorrect PIN</p>}
      <button onClick={submit} className="mt-4 btn-themed px-8 py-2.5 rounded-xl text-sm font-semibold">
        Unlock
      </button>
    </div>
  );
};

export default AccessGate;
