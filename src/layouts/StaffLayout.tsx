import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePartner } from '@/contexts/PartnerContext';
import StaffFloor from '@/pages/partner/StaffFloor';
import StaffProfile from '@/pages/partner/StaffProfile';
import PartnerBottomNav from '@/components/partner/PartnerBottomNav';
import { CalendarDays, User, Crown, Lock } from 'lucide-react';
import { OWNER_PIN } from '@/data/partnerMockData';
import type { PartnerTab } from '@/components/partner/PartnerBottomNav';

const STAFF_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-pink-500', 'bg-teal-500',
];

const staffTabs: PartnerTab[] = [
  { icon: CalendarDays, label: 'Schedule', path: '/staff' },
  { icon: User, label: 'Profile', path: '/staff/profile' },
];

const StaffLayout = () => {
  const { staff, activeStaffId, setActiveStaff } = usePartner();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [pinModal, setPinModal] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);

  const isProfile = pathname === '/staff/profile';

  const handleOwnerAccess = useCallback(() => {
    setPinModal(true);
    setPin('');
    setPinError(false);
  }, []);

  const handlePinSubmit = () => {
    if (pin === OWNER_PIN) {
      setPinModal(false);
      navigate('/owner');
    } else {
      setPinError(true);
    }
  };

  return (
    <div className="relative flex flex-col h-full dark bg-background text-foreground">
      {/* ── Header: Staff Switcher ── */}
      <div className="bg-card border-b border-border px-3 pt-[max(var(--inset-top,0px),8px)] pb-2">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {staff.map((s, idx) => {
            const isActive = s.id === activeStaffId;
            const colorClass = STAFF_COLORS[idx % STAFF_COLORS.length];
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveStaff(s.id)}
                aria-label={`Switch to ${s.name}`}
                aria-pressed={isActive}
                className={`flex flex-col items-center gap-1 min-w-[56px] transition-all ${
                  isActive ? 'scale-105' : 'opacity-60'
                }`}
              >
                <div className="relative">
                  <img
                    src={s.image || '/placeholder.svg'}
                    alt={s.name}
                    className={`w-10 h-10 rounded-full object-cover ${
                      isActive ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : ''
                    }`}
                    onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                  />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${
                      s.status === 'free' ? 'bg-emerald-500' : 'bg-destructive'
                    }`}
                  />
                </div>
                <span className={`text-[10px] font-medium truncate max-w-[56px] ${
                  isActive ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {s.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content ── */}
      <main className="flex-1 overflow-hidden" aria-label={isProfile ? 'Staff profile' : 'Staff floor'}>
        {isProfile ? <StaffProfile /> : <StaffFloor />}
      </main>

      {/* ── Floating Owner Button ── */}
      <button
        onClick={handleOwnerAccess}
        className="absolute bottom-[88px] right-4 z-40 w-12 h-12 rounded-full flex items-center justify-center active:scale-90 transition-transform"
        style={{
          background: 'linear-gradient(135deg, hsl(35, 92%, 58%) 0%, hsl(30, 85%, 50%) 100%)',
          boxShadow: '0 4px 20px -2px hsla(35, 92%, 58%, 0.5), 0 2px 8px -1px hsla(35, 90%, 50%, 0.3)',
        }}
        aria-label="Owner Dashboard"
      >
        <Crown className="w-5 h-5 text-white" />
      </button>

      {/* ── Bottom Nav (same glassmorphic style as customer app) ── */}
      <PartnerBottomNav tabs={staffTabs} />

      {/* ── Owner PIN Modal ── */}
      {pinModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setPinModal(false)}>
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
    </div>
  );
};

export default StaffLayout;
