import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { Loader2, AlertCircle } from 'lucide-react';

/**
 * Auth modal stub. Wired to CustomerAuthContext.
 * Real Google Auth swaps into `signIn()` — UI states already handle
 * loading / success / error.
 */
const AuthModal = () => {
  const { authModalOpen, closeAuthModal, signIn, status, error, authReason } =
    useCustomerAuth();

  return (
    <Drawer open={authModalOpen} onOpenChange={(o) => !o && closeAuthModal()}>
      <DrawerContent className="max-h-[70vh]">
        <DrawerHeader className="text-center pb-2">
          <DrawerTitle className="font-heading text-lg">Sign in to continue</DrawerTitle>
          {authReason && (
            <p className="text-[13px] font-body text-muted-foreground mt-1">{authReason}</p>
          )}
        </DrawerHeader>

        <div className="px-5 pb-4 space-y-4">
          <div className="rounded-2xl bg-secondary/60 p-4 text-center">
            <p className="font-heading font-medium text-[14px] text-foreground">
              Continue with Google
            </p>
            <p className="text-[12px] font-body text-muted-foreground mt-1">
              Your bookings, favorites and offers — all in one place.
            </p>
          </div>

          {status === 'error' && error && (
            <div className="flex items-start gap-2 rounded-xl bg-destructive/10 p-3">
              <AlertCircle size={16} className="text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-[12px] font-body text-destructive">{error}</p>
            </div>
          )}
        </div>

        <DrawerFooter className="pt-0">
          <Button
            onClick={() => signIn()}
            disabled={status === 'loading'}
            className="w-full rounded-xl h-12 font-heading font-semibold text-[15px]"
          >
            {status === 'loading' ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />
                Signing in…
              </>
            ) : (
              'Continue with Google'
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={closeAuthModal}
            disabled={status === 'loading'}
            className="w-full rounded-xl h-12 font-heading text-muted-foreground"
          >
            Maybe later
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default AuthModal;
