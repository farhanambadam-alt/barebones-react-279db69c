import { usePartner } from '@/contexts/PartnerContext';

/** "Who is on the floor?" — staff selection screen */
const StaffSwitcher = () => {
  const { staff, setActiveStaff } = usePartner();

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">
      <h1 className="text-2xl font-heading font-bold text-foreground mb-2">Who's on the floor?</h1>
      <p className="text-muted-foreground text-sm mb-8">Tap your profile to start</p>
      <div className="grid grid-cols-2 gap-6 w-full max-w-xs">
        {staff.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveStaff(s.id)}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card card-shadow hover:card-shadow-hover transition-all active:scale-95"
          >
            <img
              src={s.image || '/placeholder.svg'}
              alt={s.name}
              className="w-16 h-16 rounded-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
            />
            <span className="text-sm font-medium text-foreground">{s.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'free' ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}`}>
              {s.status === 'free' ? 'Free' : 'Busy'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default StaffSwitcher;
