import { toLocalDateStr, todayLocalStr } from '@/lib/dateOnly';
import { usePartner } from '@/contexts/PartnerContext';
import { TrendingUp, Wallet, Clock } from 'lucide-react';
import PartnerPageState from '@/components/partner/PartnerPageState';

const OwnerDashboard = () => {
  const { staff, appointments, financials } = usePartner();

  const todayStr = todayLocalStr();
  const todaysAppts = appointments.filter(a => a.date === todayStr);
  const todaysActiveAppts = todaysAppts.filter(a => a.status !== 'cancelled');

  const activeCount = staff.filter(s => s.status === 'busy').length;
  const todayCompleted = todaysActiveAppts.filter(a => a.status === 'completed').length;
  const todayTotal = todaysActiveAppts.length;

  return (
    <PartnerPageState>
    <div className="flex flex-col gap-4 p-4 pb-safe">
      <h1 className="text-xl font-heading font-bold text-foreground">Dashboard</h1>

      {/* Floor status */}
      <div className="bg-card rounded-2xl p-4 card-shadow">
        <p className="text-xs text-muted-foreground mb-2">Floor Status</p>
        {staff.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3">No staff yet — add team members from the Staff tab.</p>
        ) : (
          <>
            <div className="flex items-center gap-3 overflow-x-auto">
              {staff.map(s => (
                <div key={s.id} className="flex flex-col items-center gap-1 shrink-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden border-2 bg-secondary ${
                    s.status === 'busy' ? 'border-amber-500' : 'border-emerald-500'
                  }`}>
                    {s.image ? (
                      <img src={s.image} alt={s.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg">{s.avatar}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{s.name}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">{activeCount} busy · {staff.length - activeCount} free</p>
          </>
        )}
      </div>

      {/* Financial cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-xl p-4 card-shadow">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] text-muted-foreground">Today</span>
          </div>
          <p className="text-xl font-bold text-foreground">₹{financials.todayRevenue.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-card rounded-xl p-4 card-shadow">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-[10px] text-muted-foreground">This Month</span>
          </div>
          <p className="text-xl font-bold text-foreground">₹{financials.monthRevenue.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-card rounded-xl p-4 card-shadow">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] text-muted-foreground">Available</span>
          </div>
          <p className="text-xl font-bold text-foreground">₹{financials.fundsAvailable.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-card rounded-xl p-4 card-shadow">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Next Payout</span>
          </div>
          <p className="text-sm font-bold text-foreground">{financials.nextPayoutDate}</p>
        </div>
      </div>

      {/* Bookings summary */}
      <div className="bg-card rounded-xl p-4 card-shadow">
        <p className="text-sm font-semibold text-foreground mb-1">Today's Bookings</p>
        {todayTotal === 0 ? (
          <p className="text-xs text-muted-foreground mt-1">No bookings scheduled for today.</p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">{todayCompleted} completed of {todayTotal} total</p>
            <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(todayCompleted / todayTotal) * 100}%` }} />
            </div>
          </>
        )}
      </div>

    </div>
    </PartnerPageState>
  );
};

export default OwnerDashboard;
