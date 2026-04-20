import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowUp } from 'lucide-react';

const ScrollToTop = () => {
  const [visible, setVisible] = useState(false);
  const lastY = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const el = document.getElementById('scroll-container');
    const target = el || window;

    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const y = el ? el.scrollTop : window.scrollY;
        const vh = window.innerHeight;
        const isMobile = window.innerWidth < 768;
        const threshold = isMobile ? vh * 4 : vh * 2;
        const scrollingUp = y < lastY.current;
        setVisible(y > threshold && scrollingUp);
        lastY.current = y;
      });
    };
    target.addEventListener('scroll', onScroll, { passive: true });
    return () => target.removeEventListener('scroll', onScroll);
  }, []);

  const handleClick = useCallback(() => {
    const el = document.getElementById('scroll-container');
    (el || window).scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <button
      onClick={handleClick}
      className={`fixed bottom-24 right-4 z-40 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-90 transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
      style={{ transform: 'translateZ(0)', willChange: 'transform, opacity' }}
      aria-label="Scroll to top"
    >
      <ArrowUp size={18} />
    </button>
  );
};

export default ScrollToTop;
