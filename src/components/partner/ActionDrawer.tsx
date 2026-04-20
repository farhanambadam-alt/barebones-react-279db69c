import React, { ReactNode } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { X } from 'lucide-react';

interface ActionDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

const ActionDrawer = React.forwardRef<HTMLDivElement, ActionDrawerProps>(
  ({ open, onClose, title, description, children, footer }, ref) => (
    <Drawer open={open} onOpenChange={v => !v && onClose()} dismissible={false} handleOnly>
      <DrawerContent
        ref={ref}
        className="max-h-[92vh] flex flex-col dark"
        onPointerDownOutside={e => e.preventDefault()}
        data-vaul-no-drag
      >
        {/* Sticky header */}
        <DrawerHeader className="relative flex-shrink-0 border-b border-border/60 pb-3">
          <DrawerTitle className="text-foreground font-bold">{title}</DrawerTitle>
          {description && <DrawerDescription className="text-muted-foreground/80">{description}</DrawerDescription>}
          <button
            onClick={onClose}
            className="absolute right-4 top-3 h-9 w-9 rounded-full border-2 border-background bg-destructive text-destructive-foreground shadow-lg ring-2 ring-destructive/25 flex items-center justify-center hover:scale-105 hover:opacity-95 active:scale-95 transition-all"
            aria-label="Close"
          >
            <X className="h-4.5 w-4.5" strokeWidth={2.5} />
          </button>
        </DrawerHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
          {children}
        </div>

        {/* Optional sticky footer */}
        {footer && (
          <div className="flex-shrink-0 border-t border-border/40 px-4 py-3">
            {footer}
          </div>
        )}
      </DrawerContent>
    </Drawer>
  )
);

ActionDrawer.displayName = 'ActionDrawer';

export default ActionDrawer;
