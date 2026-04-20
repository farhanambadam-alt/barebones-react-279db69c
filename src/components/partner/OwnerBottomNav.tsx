import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, TrendingUp, Users, Menu } from 'lucide-react';

const tabs = [
  { path: '/owner', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/owner/bookings', icon: CalendarDays, label: 'Bookings' },
  { path: '/owner/growth', icon: TrendingUp, label: 'Growth' },
  { path: '/owner/staff', icon: Users, label: 'Staff' },
  { path: '/owner/menu', icon: Menu, label: 'Menu' },
];

const OwnerBottomNav = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="flex items-center justify-around bg-card/90 backdrop-blur-md border-t border-border px-1 pb-[max(var(--inset-bottom),8px)] pt-2">
      {tabs.map(t => {
        const active = pathname === t.path;
        return (
          <button
            key={t.path}
            onClick={() => navigate(t.path)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <t.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default OwnerBottomNav;
