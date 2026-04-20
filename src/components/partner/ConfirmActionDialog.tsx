import React from 'react';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, CheckCircle2, PlayCircle } from 'lucide-react';

interface ConfirmActionDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** Visual tone for the header icon */
  tone?: 'start' | 'complete' | 'destructive' | 'neutral';
  onConfirm: () => void;
}

const toneStyles: Record<NonNullable<ConfirmActionDialogProps['tone']>, { bg: string; ring: string; text: string; Icon: React.ComponentType<{ className?: string }> }> = {
  start:       { bg: 'bg-blue-500/15',    ring: 'ring-blue-500/30',    text: 'text-blue-500',    Icon: PlayCircle },
  complete:    { bg: 'bg-emerald-500/15', ring: 'ring-emerald-500/30', text: 'text-emerald-500', Icon: CheckCircle2 },
  destructive: { bg: 'bg-destructive/15', ring: 'ring-destructive/30', text: 'text-destructive', Icon: AlertTriangle },
  neutral:     { bg: 'bg-muted',          ring: 'ring-border',         text: 'text-foreground',  Icon: AlertTriangle },
};

const ConfirmActionDialog: React.FC<ConfirmActionDialogProps> = ({
  open, onOpenChange, title, description,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  destructive = false, tone, onConfirm,
}) => {
  const resolvedTone: NonNullable<ConfirmActionDialogProps['tone']> =
    tone ?? (destructive ? 'destructive' : 'neutral');
  const t = toneStyles[resolvedTone];
  const Icon = t.Icon;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="dark max-w-sm rounded-2xl p-0 overflow-hidden border border-border/60 shadow-2xl">
        <div className="px-6 pt-6 pb-4">
          <div className="flex flex-col items-center text-center">
            <div className={`w-14 h-14 rounded-full ${t.bg} ring-4 ${t.ring} flex items-center justify-center mb-4`}>
              <Icon className={`w-7 h-7 ${t.text}`} />
            </div>
            <AlertDialogHeader className="space-y-2">
              <AlertDialogTitle className="text-lg font-semibold text-foreground text-center">
                {title}
              </AlertDialogTitle>
              {description && (
                <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed text-center px-1">
                  {description}
                </AlertDialogDescription>
              )}
            </AlertDialogHeader>
          </div>
        </div>
        <AlertDialogFooter className="flex-row gap-2 px-4 py-3 bg-muted/30 border-t border-border/40 sm:justify-stretch">
          <AlertDialogCancel className="flex-1 mt-0 rounded-xl h-11 font-medium bg-secondary text-secondary-foreground border-border hover:bg-secondary/80 hover:text-secondary-foreground">
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={`flex-1 rounded-xl h-11 font-semibold ${
              resolvedTone === 'destructive'
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : resolvedTone === 'complete'
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : resolvedTone === 'start'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmActionDialog;
