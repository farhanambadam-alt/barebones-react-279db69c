import { useLocation, useNavigate } from 'react-router-dom';
import { List, User } from 'lucide-react';

const tabs = [
  { path: '/staff', icon: List, label: 'Queue' },
  { path: '/staff/profile', icon: User, label: 'Profile' },
];

const StaffBottomNav = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="flex items-center justify-around bg-card/90 backdrop-blur-md border-t border-border px-2 pb-[max(var(--inset-bottom),8px)] pt-2">
      {tabs.map(t => {
        const active = pathname === t.path;
        return (
          <button
            key={t.path}
            onClick={() => navigate(t.path)}
            className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <t.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default StaffBottomNav;
