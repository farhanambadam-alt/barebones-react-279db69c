import { useState, useRef } from 'react';
import { CalendarDays, Clock, MapPin, ChevronRight, Scissors, ArrowLeft, Camera, Lock, Star, ChevronDown, ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useBookings } from '@/services/hooks';
import AppHeader from '@/components/AppHeader';
import ScrollToTop from '@/components/ScrollToTop';

type BookingMedia = {
  beforeUrl?: string;
  afterUrl?: string;
  rating?: number;
  reviewText?: string;
  submitted?: boolean;
};
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const BookingsPage = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');
  const { bookings: bookingsList, cancelBooking } = useBookings();
  const [media, setMedia] = useState<Record<string, BookingMedia>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const filtered = bookingsList.filter((b) => b.status === tab);

  const handleCancel = (id: string) => cancelBooking(id);

  const handleFile = (bookingId: string, kind: 'beforeUrl' | 'afterUrl', file: File | null) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setMedia((prev) => ({ ...prev, [bookingId]: { ...prev[bookingId], [kind]: url } }));
    toast.success(kind === 'beforeUrl' ? 'Before photo added' : 'After photo added');
  };

  const handleSubmitReview = (bookingId: string) => {
    const m = media[bookingId];
    if (!m?.rating) {
      toast.error('Please select a rating');
      return;
    }
    setMedia((prev) => ({ ...prev, [bookingId]: { ...prev[bookingId], submitted: true } }));
    toast.success('Thanks for your feedback!');
  };

  const setRating = (bookingId: string, rating: number) => {
    setMedia((prev) => ({ ...prev, [bookingId]: { ...prev[bookingId], rating } }));
  };

  const setReviewText = (bookingId: string, reviewText: string) => {
    setMedia((prev) => ({ ...prev, [bookingId]: { ...prev[bookingId], reviewText } }));
  };

  const tabs = [
    { key: 'upcoming' as const, label: 'Upcoming', count: bookingsList.filter(b => b.status === 'upcoming').length },
    { key: 'completed' as const, label: 'Completed', count: bookingsList.filter(b => b.status === 'completed').length },
    { key: 'cancelled' as const, label: 'Cancelled', count: bookingsList.filter(b => b.status === 'cancelled').length },
  ];

  const headerLeft = (
    <div className="flex items-center gap-3">
      <button
        onClick={() => window.appBack?.()}
        className="min-w-[48px] min-h-[48px] rounded-full bg-secondary flex items-center justify-center"
        aria-label="Go back"
      >
        <ArrowLeft size={18} className="text-foreground" />
      </button>
      <div>
        <h1 className="font-heading font-bold text-xl text-foreground">My Bookings</h1>
        <p className="text-xs font-body text-muted-foreground mt-0.5">Manage your appointments</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-safe">
      <AppHeader leftSlot={headerLeft} showLocation={false} />

      {/* Tab bar */}
      <div className="flex gap-2 px-4 py-3 max-w-7xl mx-auto w-full">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-full text-xs font-heading font-medium capitalize transition-colors duration-200 min-h-[40px] ${
              tab === t.key
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center ${
                tab === t.key ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Booking cards — grid on desktop */}
      <div className="px-5 space-y-4 mt-1 max-w-7xl mx-auto md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 md:space-y-0">
        {filtered.map((booking) => (
          <div
            key={booking.id}
            className="bg-card rounded-2xl overflow-hidden border border-border animate-fade-in-up"
            style={{ boxShadow: '0 2px 12px -2px hsl(var(--foreground) / 0.06)' }}
          >
            <div className="relative h-28 overflow-hidden">
              <img
                src={booking.salonImage}
                alt={booking.salonName}
                className="w-full h-full object-cover"
                decoding="async"
                onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                <div>
                  <h3 className="font-heading font-semibold text-sm text-white">{booking.salonName}</h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin size={10} className="text-white/70" />
                    <span className="text-[10px] font-body text-white/70">Bangalore</span>
                  </div>
                </div>
                <span className={`text-[10px] font-heading font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm ${
                  booking.status === 'upcoming'
                    ? 'bg-primary/90 text-primary-foreground'
                    : booking.status === 'completed'
                    ? 'bg-emerald-500/90 text-white'
                    : 'bg-destructive/90 text-white'
                }`}>
                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                </span>
              </div>
            </div>

            <div className="p-3.5">
              <div className="flex items-start gap-2 mb-2.5">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Scissors size={13} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-heading font-medium text-muted-foreground uppercase tracking-wide">Services</p>
                  <p className="text-[13px] font-body text-foreground mt-0.5 leading-snug">{booking.services.join(' • ')}</p>
                </div>
              </div>

              <div className="flex gap-3 mb-3">
                <div className="flex items-center gap-1.5 flex-1">
                  <div className="w-7 h-7 rounded-lg bg-accent/60 flex items-center justify-center flex-shrink-0">
                    <CalendarDays size={13} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[10px] font-heading text-muted-foreground uppercase tracking-wide">Date</p>
                    <p className="text-[12px] font-body font-medium text-foreground">{booking.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-1">
                  <div className="w-7 h-7 rounded-lg bg-accent/60 flex items-center justify-center flex-shrink-0">
                    <Clock size={13} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[10px] font-heading text-muted-foreground uppercase tracking-wide">Time</p>
                    <p className="text-[12px] font-body font-medium text-foreground">{booking.time}</p>
                  </div>
                </div>
              </div>

              <div className="h-px bg-border/60 mb-3" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-heading text-muted-foreground uppercase tracking-wide">Total</p>
                  <span className="font-heading font-bold text-base text-foreground">₹{booking.totalPrice}</span>
                </div>

                {booking.status === 'upcoming' && (
                  <div className="flex gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="px-4 py-2 rounded-xl text-[11px] font-heading font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors min-h-[44px]">
                          Cancel
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-2xl max-w-[320px]">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="font-heading text-base">Cancel Booking?</AlertDialogTitle>
                          <AlertDialogDescription className="font-body text-[13px]">
                            Are you sure you want to cancel your appointment at <strong>{booking.salonName}</strong> on {booking.date}? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-row gap-2">
                          <AlertDialogCancel className="rounded-xl flex-1 mt-0 font-heading text-xs min-h-[44px]">Keep</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleCancel(booking.id)}
                            className="rounded-xl flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90 font-heading text-xs min-h-[44px]"
                          >
                            Yes, Cancel
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Backend-ready: real bookings will always carry salonId.
                        // Fallback to booking.id only for mock data; warn loudly
                        // so the missing FK surfaces during integration testing.
                        const salonId = booking.salonId ?? booking.id;
                        if (!booking.salonId && import.meta.env.DEV) {
                          // eslint-disable-next-line no-console
                          console.warn('[reschedule] booking.salonId missing — using booking.id as fallback', booking.id);
                        }
                        navigate(`/booking/${salonId}`, {
                          state: { reschedule: true, bookingId: booking.id },
                        });
                      }}
                      className="px-4 py-2 rounded-xl text-[11px] font-heading font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors min-h-[44px] flex items-center gap-1"
                    >
                      Reschedule <ChevronRight size={12} />
                    </button>
                  </div>
                )}

                {booking.status === 'completed' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/salon/${booking.id}`); }}
                    className="px-4 py-2 rounded-xl text-[11px] font-heading font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors min-h-[44px] flex items-center gap-1"
                  >
                    Rebook <ChevronRight size={12} />
                  </button>
                )}
              </div>

              {booking.status !== 'cancelled' && (() => {
                const isCompleted = booking.status === 'completed';
                const m = media[booking.id] || {};
                const isOpen = expanded[booking.id];
                return (
                  <div className="mt-3.5 pt-3.5 border-t border-dashed border-border">
                    <button
                      onClick={() => setExpanded((p) => ({ ...p, [booking.id]: !p[booking.id] }))}
                      className="w-full flex items-center justify-center gap-1.5 min-h-[36px] text-muted-foreground hover:text-foreground transition-colors"
                      aria-expanded={isOpen}
                    >
                      <Camera size={13} />
                      <span className="text-[12px] font-heading font-medium">
                        {isOpen ? 'Hide' : 'Add Photos & Review'}
                      </span>
                      <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isOpen && (
                      <div className="mt-3 space-y-3 animate-fade-in">
                        {/* Before / After grid */}
                        <div className="grid grid-cols-2 gap-2.5">
                          {/* Before */}
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-heading font-semibold text-muted-foreground uppercase tracking-[0.08em] px-0.5">Before</p>
                            <input
                              ref={(el) => (fileInputs.current[`${booking.id}-before`] = el)}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleFile(booking.id, 'beforeUrl', e.target.files?.[0] || null)}
                            />
                            {m.beforeUrl ? (
                              <div className="relative rounded-2xl overflow-hidden aspect-square border border-border">
                                <img src={m.beforeUrl} alt="Before" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                <span className="absolute bottom-2 left-2 text-[9px] font-heading font-bold tracking-wider text-white bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full">BEFORE</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => fileInputs.current[`${booking.id}-before`]?.click()}
                                className="w-full aspect-square rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary/60 transition-all flex flex-col items-center justify-center gap-2"
                              >
                                <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center shadow-sm ring-1 ring-primary/20">
                                  <Camera size={17} className="text-primary" />
                                </div>
                                <span className="text-[11px] font-heading font-semibold text-primary">Upload Before</span>
                              </button>
                            )}
                          </div>

                          {/* After */}
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-heading font-semibold text-muted-foreground uppercase tracking-[0.08em] px-0.5">After</p>
                            {isCompleted ? (
                              <>
                                <input
                                  ref={(el) => (fileInputs.current[`${booking.id}-after`] = el)}
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleFile(booking.id, 'afterUrl', e.target.files?.[0] || null)}
                                />
                                {m.afterUrl ? (
                                  <div className="relative rounded-2xl overflow-hidden aspect-square border border-border">
                                    <img src={m.afterUrl} alt="After" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                    <span className="absolute bottom-2 left-2 text-[9px] font-heading font-bold tracking-wider text-white bg-primary/80 backdrop-blur-sm px-2 py-0.5 rounded-full">AFTER</span>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => fileInputs.current[`${booking.id}-after`]?.click()}
                                    className="w-full aspect-square rounded-2xl border-[1.5px] border-dashed border-primary/50 bg-primary/10 hover:bg-primary/15 transition-all flex flex-col items-center justify-center gap-2"
                                  >
                                    <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center shadow-md ring-1 ring-primary/20">
                                      <Camera size={17} className="text-primary" />
                                    </div>
                                    <span className="text-[11px] font-heading font-semibold text-primary">Upload After</span>
                                  </button>
                                )}
                              </>
                            ) : (
                              <div className="w-full aspect-square rounded-2xl bg-secondary border border-border flex flex-col items-center justify-center gap-2 px-3 text-center">
                                <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center shadow-sm ring-1 ring-border">
                                  <Lock size={15} className="text-muted-foreground" />
                                </div>
                                <span className="text-[10px] font-heading font-medium text-muted-foreground leading-tight">Available after service</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Review */}
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-heading font-semibold text-muted-foreground uppercase tracking-[0.08em] px-0.5">Review</p>
                          {isCompleted ? (
                            m.submitted ? (
                              <div className="rounded-2xl bg-primary/5 border border-primary/20 p-3.5">
                                <div className="flex items-center gap-1 mb-2">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <Star key={s} size={14} className={s <= (m.rating || 0) ? 'fill-primary text-primary' : 'text-muted-foreground/30'} />
                                  ))}
                                </div>
                                {m.reviewText && <p className="text-[12px] font-body text-foreground leading-snug">{m.reviewText}</p>}
                                <p className="text-[10px] font-heading font-medium text-primary mt-2">✓ Thanks for your feedback!</p>
                              </div>
                            ) : (
                              <div className="rounded-2xl bg-muted/30 border border-border p-3.5 space-y-3">
                                <div className="flex items-center justify-center gap-2 py-1">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <button
                                      key={s}
                                      onClick={() => setRating(booking.id, s)}
                                      className="min-w-[36px] min-h-[36px] flex items-center justify-center transition-transform active:scale-90"
                                      aria-label={`Rate ${s} stars`}
                                    >
                                      <Star size={26} className={s <= (m.rating || 0) ? 'fill-primary text-primary' : 'text-muted-foreground/30'} />
                                    </button>
                                  ))}
                                </div>
                                <textarea
                                  value={m.reviewText || ''}
                                  onChange={(e) => setReviewText(booking.id, e.target.value)}
                                  placeholder="Share your experience..."
                                  rows={3}
                                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[12px] font-body text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                                />
                                <button
                                  onClick={() => handleSubmitReview(booking.id)}
                                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-[12px] font-heading font-semibold hover:bg-primary/90 transition-colors min-h-[44px]"
                                >
                                  Submit Review
                                </button>
                              </div>
                            )
                          ) : (
                            <div className="rounded-2xl bg-muted/40 border border-border px-3.5 py-3 flex items-center gap-2.5">
                              <Lock size={13} className="text-muted-foreground/70 flex-shrink-0" />
                              <span className="text-[11px] font-body text-muted-foreground/80">Review unlocks after service is completed</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-20 col-span-full">
            <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-3">
              <CalendarDays size={28} className="text-muted-foreground/40" />
            </div>
            <p className="font-heading font-semibold text-sm text-foreground">No {tab} bookings</p>
            <p className="text-xs font-body text-muted-foreground/60 mt-1">Your bookings will appear here</p>
          </div>
        )}
      </div>

      <ScrollToTop />
    </div>
  );
};

export default BookingsPage;
