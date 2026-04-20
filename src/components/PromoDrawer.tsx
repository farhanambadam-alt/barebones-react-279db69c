import { useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { pushOverlay, removeOverlay } from '@/hooks/useFlutterBridge';

interface PromoDrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const PromoDrawer = ({ open, onClose, children }: PromoDrawerProps) => {
  const [visible, setVisible] = useState(false);
  const [entering, setEntering] = useState(false);
  const [exiting, setExiting] = useState(false);

  const handleClose = useCallback(() => {
    if (exiting) return;
    setExiting(true);
    setTimeout(() => {
      setExiting(false);
      setVisible(false);
      onClose();
    }, 300);
  }, [onClose, exiting]);

  // Open/close lifecycle
  useEffect(() => {
    if (open) {
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setEntering(true));
      });
    } else if (visible && !exiting) {
      handleClose();
    }
  }, [open]);

  // Remove entering class after animation
  useEffect(() => {
    if (entering) {
      const t = setTimeout(() => setEntering(false), 350);
      return () => clearTimeout(t);
    }
  }, [entering]);

  // Body scroll lock
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [visible]);

  // Flutter overlay registration
  useEffect(() => {
    if (!visible) return;
    const closeFn = () => handleClose();
    pushOverlay(closeFn);
    return () => removeOverlay(closeFn);
  }, [visible, handleClose]);

  // Escape key
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, handleClose]);

  if (!visible) return null;

  const isAnimating = entering || exiting;
  const showState = entering && !exiting;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        style={{ opacity: showState || (!entering && !exiting) ? 1 : 0, ...(exiting ? { opacity: 0 } : {}) }}
        onClick={handleClose}
      />

      {/* Close button - outside the drawer */}
      <button
        onClick={handleClose}
        className="relative z-[101] mb-3 w-10 h-10 rounded-full bg-card/90 backdrop-blur-md border border-border shadow-lg flex items-center justify-center active:scale-90 transition-all duration-200"
        style={{
          transform: `translateY(${showState || (!entering && !exiting && !exiting) ? '0' : '80px'})`,
          opacity: showState || (!entering && !exiting) ? 1 : 0,
          transition: 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1), opacity 300ms ease',
          ...(exiting ? { transform: 'translateY(80px)', opacity: 0 } : {}),
        }}
        aria-label="Close"
      >
        <X size={18} className="text-muted-foreground" />
      </button>

      {/* Drawer content */}
      <div
        className="relative z-[101] w-full max-w-lg bg-background rounded-t-3xl border-t border-border shadow-2xl overflow-hidden"
        style={{
          maxHeight: '80vh',
          transform: `translateY(${showState || (!entering && !exiting) ? '0' : '100%'})`,
          transition: 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)',
          willChange: 'transform',
          ...(exiting ? { transform: 'translateY(100%)' } : {}),
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted" />
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 20px)' }}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PromoDrawer;
