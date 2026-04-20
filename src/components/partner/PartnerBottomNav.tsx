import { useRef, useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

export type PartnerTab = {
  icon: LucideIcon;
  label: string;
  path: string;
};

interface Props {
  tabs: PartnerTab[];
  /** Paths that should hide the nav entirely (e.g. deep pages) */
  hiddenPrefixes?: string[];
}

const PartnerBottomNav = ({ tabs, hiddenPrefixes = [] }: Props) => {
  const location = useLocation();
  const navigate = useNavigate();
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const [spotlightX, setSpotlightX] = useState(0);
  const [spotlightW, setSpotlightW] = useState(0);

  const activeIndex = tabs.findIndex(t => t.path === location.pathname);
  const hidden = hiddenPrefixes.some(p => location.pathname.startsWith(p));

  const updateSpotlight = useCallback(() => {
    const btn = buttonsRef.current[activeIndex];
    if (!btn) return;
    const nav = btn.parentElement!;
    const navRect = nav.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    setSpotlightX(btnRect.left - navRect.left + btnRect.width / 2);
    setSpotlightW(btnRect.width);
  }, [activeIndex]);

  useEffect(() => {
    updateSpotlight();
    window.addEventListener('resize', updateSpotlight);
    return () => window.removeEventListener('resize', updateSpotlight);
  }, [updateSpotlight]);

  if (hidden) return null;

  return (
    <nav
      className="absolute bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none md:bottom-4"
      style={{ paddingBottom: 'var(--inset-bottom)' }}
    >
      <div
        className="pointer-events-auto relative flex items-center w-[calc(100%-24px)] max-w-sm md:max-w-none md:w-[calc(100%-48px)] lg:max-w-lg rounded-[36px] p-2.5 justify-around overflow-hidden backdrop-blur-2xl backdrop-saturate-150"
        style={{
          background: 'linear-gradient(180deg, rgba(62,66,76,0.68) 0%, rgba(48,52,60,0.70) 100%)',
          border: '1.5px solid rgba(255, 255, 255, 0.10)',
          boxShadow:
            'inset 0 1px 0 0 rgba(255,255,255,0.08), inset 0 -1px 2px 0 rgba(0,0,0,0.20), 0 0 0 0.5px rgba(0,0,0,0.30), 0 14px 36px -6px rgba(0,0,0,0.50), 0 4px 12px -2px rgba(0,0,0,0.25)',
          transform: 'translateZ(0)',
        }}
      >
        {/* Sliding spotlight */}
        {activeIndex >= 0 && (
          <div
            className="absolute pointer-events-none z-0 flex flex-col items-center"
            style={{
              left: 0,
              width: spotlightW * 1.2,
              transform: `translateX(${spotlightX - (spotlightW * 1.2) / 2}px)`,
              top: 0,
              bottom: 0,
              transition: 'transform 0.4s cubic-bezier(0.42, 0, 0.58, 1)',
              willChange: 'transform',
            }}
            aria-hidden="true"
          >
            <span
              className="shrink-0 rounded-full"
              style={{
                width: '30px',
                height: '5px',
                background: 'hsl(35, 92%, 58%)',
                boxShadow:
                  '0 0 18px 6px hsla(35, 92%, 58%, 0.6), 0 0 40px 12px hsla(35, 90%, 55%, 0.25)',
              }}
            />
            <span
              className="flex-1 w-full"
              style={{
                clipPath: 'polygon(25% 0%, 75% 0%, 110% 100%, -10% 100%)',
                background:
                  'linear-gradient(to bottom, hsla(35, 92%, 58%, 0.40) 0%, hsla(35, 88%, 52%, 0.18) 25%, hsla(35, 80%, 50%, 0.06) 55%, transparent 100%)',
              }}
            />
          </div>
        )}

        {tabs.map((tab, i) => {
          const isActive = i === activeIndex;
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              ref={el => { buttonsRef.current[i] = el; }}
              onClick={() => {
                if (location.pathname !== tab.path) navigate(tab.path, { replace: true });
              }}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              className="relative z-10 flex flex-col items-center justify-center min-w-[48px] min-h-[48px] px-1"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <span
                className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full"
                style={{
                  animation: isActive
                    ? 'icon-bump 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
                    : 'none',
                  transform: isActive ? 'scale(1.12)' : 'scale(1)',
                }}
              >
                <Icon
                  size={26}
                  strokeWidth={isActive ? 2.2 : 1.6}
                  style={{
                    color: isActive ? 'rgb(20, 20, 20)' : 'rgba(255,255,255,0.5)',
                  }}
                />
              </span>
              <span
                className="text-[10px] leading-tight mt-0.5 truncate max-w-[60px]"
                style={{
                  color: isActive ? 'rgb(20, 20, 20)' : 'rgba(255,255,255,0.5)',
                  fontWeight: isActive ? 600 : 500,
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default PartnerBottomNav;
