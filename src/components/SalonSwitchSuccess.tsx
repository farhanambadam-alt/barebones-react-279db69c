import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

interface SalonSwitchSuccessProps {
  salonName: string;
  onComplete: () => void;
}

const SalonSwitchSuccess = ({ salonName, onComplete }: SalonSwitchSuccessProps) => {
  const [phase, setPhase] = useState<'enter' | 'show' | 'exit'>('enter');

  useEffect(() => {
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(80);

    const t1 = setTimeout(() => setPhase('show'), 50);
    const t2 = setTimeout(() => setPhase('exit'), 900);
    const t3 = setTimeout(onComplete, 1150);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(8px)',
        opacity: phase === 'enter' ? 0 : phase === 'exit' ? 0 : 1,
        transition: 'opacity 0.25s ease-out',
      }}
    >
      <div
        className="flex flex-col items-center gap-4"
        style={{
          transform: phase === 'show' ? 'scale(1)' : 'scale(0.7)',
          opacity: phase === 'show' ? 1 : 0,
          transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease-out',
        }}
      >
        {/* Checkmark circle */}
        <div className="relative w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-lg">
          {/* Ring animation */}
          <div
            className="absolute inset-0 rounded-full border-4 border-primary/40"
            style={{
              animation: phase === 'show' ? 'switch-ring 0.6s ease-out forwards' : 'none',
            }}
          />
          <Check size={40} strokeWidth={3} className="text-primary-foreground" />
        </div>

        {/* Message */}
        <div className="text-center px-8">
          <p className="text-[15px] font-heading font-bold text-white leading-snug">
            Cart Cleared!
          </p>
          <p className="text-[13px] font-body text-white/80 mt-1 leading-snug">
            Starting fresh at <strong className="text-white">{salonName}</strong>
          </p>
        </div>
      </div>

      {/* Keyframes injected inline */}
      <style>{`
        @keyframes switch-ring {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default SalonSwitchSuccess;
