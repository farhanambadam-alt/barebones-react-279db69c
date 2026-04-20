import { Smartphone, User } from 'lucide-react';

interface CustomerTypeBadgesProps {
  onlineCount: number;
  walkinCount: number;
  size?: 'sm' | 'md';
}

/** Reusable Online / Walk-in customer count badges */
const CustomerTypeBadges = ({ onlineCount, walkinCount, size = 'md' }: CustomerTypeBadgesProps) => {
  const textSize = size === 'sm' ? 'text-lg' : 'text-xl';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1">
        <Smartphone className={`${iconSize} text-blue-400`} />
        <span className={`${textSize} font-bold text-foreground`}>{onlineCount}</span>
      </div>
      <div className="w-px h-5 bg-border" />
      <div className="flex items-center gap-1">
        <User className={`${iconSize} text-emerald-400`} />
        <span className={`${textSize} font-bold text-foreground`}>{walkinCount}</span>
      </div>
    </div>
  );
};

export default CustomerTypeBadges;
