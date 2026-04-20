import { useCart } from '@/contexts/CartContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const ROOT_VISIBLE_PATHS = ['/', '/at-home', '/explore'];
const HIDDEN_PATHS = ['/bookings', '/profile'];
const NAV_GAP_PX = 16;

const CartPill = () => {
  const { salon, cartCount, cartTotal } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  if (!salon || cartCount === 0) return null;

  const path = location.pathname;
  const isBookingFlow = path.startsWith('/booking/') || path.startsWith('/at-home-booking/');
  const isHiddenSection = HIDDEN_PATHS.includes(path);
  const isOnCartSalon = path === `/salon/${salon.id}`;

  if (isBookingFlow || isHiddenSection || isOnCartSalon) return null;

  const isSalonDetail = path.startsWith('/salon/');
  const isArtistDetail = path.startsWith('/artist/');
  const isVisibleScreen = ROOT_VISIBLE_PATHS.includes(path) || isSalonDetail || isArtistDetail;
  if (!isVisibleScreen) return null;

  const hasBottomNav = !isSalonDetail && !isArtistDetail;

  return (
    <div
      className="absolute left-0 right-0 z-[45] flex justify-center pointer-events-none"
      style={{
        bottom: hasBottomNav
          ? `calc(var(--bottom-nav-clearance, 76px) + ${NAV_GAP_PX}px)`
          : 'calc(var(--inset-bottom, 0px) + 24px)',
      }}
    >
      <button
        onClick={() => navigate(`/salon/${salon.id}`)}
        className="pointer-events-auto group flex items-center gap-2.5 active:scale-[0.97] transition-all duration-200 ease-out"
        style={{
          borderRadius: '100px',
          padding: '5px 6px 5px 5px',
          maxWidth: 'min(90%, 300px)',
          minWidth: '180px',
          background: 'var(--btn-gradient)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.10)',
        }}
      >
        {/* Left: Salon avatar */}
        <span className="w-[34px] h-[34px] rounded-full overflow-hidden border-2 border-white/25 flex-shrink-0 inline-flex">
          <img
            src={salon.image}
            alt={salon.name}
            className="w-full h-full object-cover"
            decoding="async"
            width={34}
            height={34}
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder.svg';
            }}
          />
        </span>

        {/* Center: Stacked text */}
        <span className="flex flex-col items-start flex-1 min-w-0 gap-0.5">
          <span className="text-[11px] font-heading font-semibold text-white leading-none truncate max-w-full">
            {salon.name}
          </span>
          <span className="text-[10px] font-heading font-medium text-white/75 leading-none whitespace-nowrap">
            {cartCount} {cartCount === 1 ? 'service' : 'services'} · ₹{cartTotal}
          </span>
        </span>

        {/* Right: CTA arrow */}
        <span className="flex items-center justify-center w-[30px] h-[30px] rounded-full bg-white/25 group-hover:bg-white/35 transition-colors duration-150 flex-shrink-0">
          <ArrowRight size={14} className="text-white" />
        </span>
      </button>
    </div>
  );
};

export default CartPill;
