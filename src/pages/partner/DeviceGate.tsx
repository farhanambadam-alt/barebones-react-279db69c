import { useNavigate } from 'react-router-dom';
import { Users, Crown } from 'lucide-react';

/** Entry point for the partner app — choose Staff or Owner */
const DeviceGate = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-background">
      <h1 className="text-2xl font-heading font-bold text-foreground mb-1">Salon Partner</h1>
      <p className="text-sm text-muted-foreground mb-8">Select your role to continue</p>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <button
          onClick={() => navigate('/staff')}
          className="flex items-center gap-4 bg-card rounded-2xl p-5 card-shadow hover:card-shadow-hover transition-all active:scale-[0.98]"
        >
          <div className="w-12 h-12 rounded-full bg-success/15 flex items-center justify-center">
            <Users className="w-6 h-6 text-success" />
          </div>
          <div className="text-left">
            <p className="text-base font-semibold text-foreground">Staff Mode</p>
            <p className="text-xs text-muted-foreground">Floor view, schedule, stats</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/owner')}
          className="flex items-center gap-4 bg-card rounded-2xl p-5 card-shadow hover:card-shadow-hover transition-all active:scale-[0.98]"
        >
          <div className="w-12 h-12 rounded-full bg-accent/15 flex items-center justify-center">
            <Crown className="w-6 h-6 text-accent" />
          </div>
          <div className="text-left">
            <p className="text-base font-semibold text-foreground">Owner Mode</p>
            <p className="text-xs text-muted-foreground">Dashboard, growth, management</p>
          </div>
        </button>
      </div>
    </div>
  );
};

export default DeviceGate;
