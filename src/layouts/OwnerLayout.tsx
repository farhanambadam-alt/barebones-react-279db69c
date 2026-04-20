import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import PartnerBottomNav from '@/components/partner/PartnerBottomNav';
import { LayoutDashboard, CalendarDays, TrendingUp, Users, Menu } from 'lucide-react';
import type { PartnerTab } from '@/components/partner/PartnerBottomNav';

const ownerTabs: PartnerTab[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/owner' },
  { icon: CalendarDays, label: 'Bookings', path: '/owner/bookings' },
  { icon: TrendingUp, label: 'Growth', path: '/owner/growth' },
  { icon: Users, label: 'Staff', path: '/owner/staff' },
  { icon: Menu, label: 'Menu', path: '/owner/menu' },
];

const SELF_SCROLLING_PAGES = ['/owner/bookings'];
const OWNER_CONTENT_MAX = 'max-w-[1400px]';

const OwnerLayout = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isSelfScrolling = SELF_SCROLLING_PAGES.includes(pathname);

  return (
    <div className="relative flex h-full flex-col dark bg-background text-foreground">
      <main className={`mx-auto flex h-full w-full flex-1 min-w-0 ${OWNER_CONTENT_MAX} px-0 sm:px-4 lg:px-6 xl:px-8`} aria-label="Owner workspace">
        {isSelfScrolling ? (
          <div className="flex min-h-0 flex-1 flex-col w-full">
            <Outlet />
          </div>
        ) : (
          <div className="flex-1 min-w-0 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="w-full pb-24">
              <Outlet />
            </div>
          </div>
        )}
      </main>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40">
        <div className={`mx-auto w-full ${OWNER_CONTENT_MAX} px-3 sm:px-4 lg:px-6 xl:px-8`}>
          <div className="relative">
            <button
              onClick={() => navigate('/staff')}
              className="pointer-events-auto absolute bottom-[88px] right-0 z-40 flex h-12 w-12 items-center justify-center rounded-full transition-transform active:scale-90 md:bottom-[104px]"
              style={{
                background: 'linear-gradient(135deg, hsl(152, 60%, 45%) 0%, hsl(160, 55%, 38%) 100%)',
                boxShadow: '0 4px 20px -2px hsla(152, 60%, 45%, 0.5), 0 2px 8px -1px hsla(152, 55%, 38%, 0.3)',
              }}
              aria-label="Switch to Staff Mode"
            >
              <Users className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      <PartnerBottomNav tabs={ownerTabs} />
    </div>
  );
};

export default OwnerLayout;
