import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePartner } from '@/contexts/PartnerContext';
import { OWNER_PIN } from '@/data/partnerMockData';
import { Crown, Lock } from 'lucide-react';

const TopSwitcher = () => {
  const { staff, activeStaffId, setActiveStaff } = usePartner();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isOwner = pathname.startsWith('/owner');
  const [pinModal, setPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);

  const handleOwnerClick = () => {
    if (isOwner) return; // already owner
    setPinModal(true);
    setPin('');
    setPinError(false);
  };

  const handlePinSubmit = () => {
    if (pin === OWNER_PIN) {
      setPinModal(false);
      navigate('/owner');
    } else {
      setPinError(true);
    }
  };

  const handleStaffSelect = (id: string) => {
    setActiveStaff(id);
    if (isOwner || !pathname.startsWith('/staff')) {
      navigate('/staff');
    }
  };

  return (
    <>
      <div className="flex items-center gap-1.5 px-3 py-2 bg-card border-b border-border overflow-x-auto no-scrollbar">
        {staff.map(s => {
          const active = !isOwner && s.id === activeStaffId;
          return (
            <button
              key={s.id}
              onClick={() => handleStaffSelect(s.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
                active
                  ? 'bg-foreground text-background shadow-sm'
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
              }`}
            >
              <img src={s.image || '/placeholder.svg'} alt={s.name} className="w-5 h-5 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }} />
              <span>{s.name}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${s.status === 'free' ? 'bg-emerald-500' : 'bg-destructive'}`} />
            </button>
          );
        })}

        {/* Owner button */}
        <button
          onClick={handleOwnerClick}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all ${
            isOwner
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
          }`}
        >
          <Crown className="w-3.5 h-3.5" />
          <span>Owner</span>
        </button>
      </div>

      {/* PIN Modal */}
      {pinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setPinModal(false)}>
          <div className="bg-card rounded-2xl p-6 w-[280px] shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center">
                <Lock className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-sm font-semibold text-foreground">Owner Access</p>
              <p className="text-xs text-muted-foreground text-center">Enter PIN to access owner dashboard</p>
              <input
                type="password"
                maxLength={4}
                value={pin}
                onChange={e => { setPin(e.target.value); setPinError(false); }}
                onKeyDown={e => e.key === 'Enter' && handlePinSubmit()}
                placeholder="••••"
                className="w-full text-center text-2xl tracking-[0.5em] bg-secondary rounded-xl px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
              {pinError && <p className="text-xs text-destructive">Incorrect PIN</p>}
              <button
                onClick={handlePinSubmit}
                disabled={pin.length < 4}
                className="w-full bg-amber-500 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 active:scale-95 transition-transform"
              >
                Unlock
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TopSwitcher;
