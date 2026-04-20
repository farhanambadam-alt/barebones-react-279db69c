import { toLocalDateStr, todayLocalStr, formatLocalDate } from '@/lib/dateOnly';
import { useState, useMemo, useEffect, useRef } from 'react';
import { usePartner } from '@/contexts/PartnerContext';
import ReviewsSection, { type ReviewWithPhotos } from '@/components/ReviewsSection';
import CustomerTypeBadges from '@/components/partner/CustomerTypeBadges';
import ActionDrawer from '@/components/partner/ActionDrawer';
import PartnerPageState from '@/components/partner/PartnerPageState';
import EmptyState from '@/components/EmptyState';
import { useToast } from '@/hooks/use-toast';
import {
  Star, Check, Camera, Image as ImageIcon, Trash2, History, Users,
  Calendar, ChevronLeft, ChevronRight, Filter, Clock, Smartphone, User,
  CalendarOff, Plus, X,
} from 'lucide-react';

type Tab = 'overview' | 'reviews' | 'logs' | 'leaves';

const StaffProfile = () => {
  const {
    activeStaff, staffAppointments, getStaffLogs,
    requestLeave, cancelLeaveRequest, getBookingsOnDate,
    getStaffLeavesThisMonth, getStaffLeavesThisYear, getStaffLeaves, getStaffPendingLeaves,
    services: mockServices,
  } = usePartner();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('overview');
  const [logDate, setLogDate] = useState<string>(''); // '' = today/all
  const [leaveDrawerOpen, setLeaveDrawerOpen] = useState(false);
  const [leaveDate, setLeaveDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  // Map partner reviews to the customer Review format for the reusable ReviewsSection
  const mappedReviews = useMemo<ReviewWithPhotos[]>(() => {
    if (!activeStaff) return [];
    // Defensive: backend may return staff records before reviews are hydrated
    return (activeStaff.reviews ?? []).map(r => ({
      id: r.id,
      userName: r.clientName,
      userAvatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(r.clientName)}&background=random&size=64`,
      rating: r.rating,
      text: r.comment,
      service: r.serviceTags?.[0] || 'Service',
      date: r.date,
      artistId: activeStaff.id,
      helpful: Math.floor(Math.random() * 12),
      hasPhoto: !!(r.beforeImage || r.afterImage),
      beforeImage: r.beforeImage,
      afterImage: r.afterImage,
    }));
  }, [activeStaff]);

  const [staffReviews, setStaffReviews] = useState<ReviewWithPhotos[]>([]);

  // Sync staffReviews when activeStaff changes (side-effect must be useEffect, not useMemo)
  useEffect(() => {
    setStaffReviews(mappedReviews);
  }, [mappedReviews]);

  const todayStr = todayLocalStr();
  const allLogs = activeStaff ? getStaffLogs(activeStaff.id) : [];
  const filteredLogs = useMemo(() => {
    if (!logDate) return allLogs;
    return allLogs.filter(l => l.date === logDate);
  }, [allLogs, logDate]);

  if (!activeStaff) {
    return (
      <PartnerPageState>
        <EmptyState
          icon={Users}
          title="No staff selected"
          message="Pick a staff member from the switcher above to view their profile."
        />
      </PartnerPageState>
    );
  }

  // Date-scope today's stats so stale appointments from other dates don't leak in
  const todaysAppts = staffAppointments.filter(a => a.date === todayStr);
  const completed = todaysAppts.filter(a => a.status === 'completed').length;
  const remaining = todaysAppts.filter(a => a.status === 'waiting' || a.status === 'serving').length;
  const reliability = activeStaff.bookingsCompleted > 0
    ? Math.round(((activeStaff.bookingsCompleted - activeStaff.noShows) / activeStaff.bookingsCompleted) * 100)
    : 100;

  const ratingCounts = [5, 4, 3, 2, 1].map(r => ({
    stars: r,
    count: (activeStaff.reviews ?? []).filter(rev => rev.rating === r).length,
  }));
  const totalReviews = (activeStaff.reviews ?? []).length;

  const today = todayStr;
  const totalEarned = filteredLogs.reduce((s, l) => s + l.price, 0);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <Users className="w-3.5 h-3.5" /> },
    { key: 'reviews', label: 'Reviews', icon: <Star className="w-3.5 h-3.5" /> },
    { key: 'logs', label: 'Logs', icon: <History className="w-3.5 h-3.5" /> },
    { key: 'leaves', label: 'Leaves', icon: <CalendarOff className="w-3.5 h-3.5" /> },
  ];

  return (
    <PartnerPageState>
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Profile card */}
      <div className="flex items-center gap-3 bg-card px-4 py-3 border-b border-border">
        <img
          src={activeStaff.image}
          alt={activeStaff.name}
          className="w-11 h-11 rounded-full object-cover shrink-0"
          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-heading font-bold text-foreground leading-tight">{activeStaff.name}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {(activeStaff.skills ?? []).map(skill => (
              <span key={skill} className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex bg-secondary/50 p-1 mx-4 mt-3 rounded-xl gap-0.5">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${
              tab === t.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 p-4 pb-24 flex flex-col gap-3">
        {tab === 'overview' && (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-card rounded-xl p-3 card-shadow">
                <p className="text-[10px] text-muted-foreground uppercase">Rating</p>
                <div className="flex items-center gap-1 mt-1">
                  <p className="text-xl font-bold text-foreground">{activeStaff.rating}</p>
                  <Star className="w-4 h-4 text-amber-500 fill-current" />
                </div>
              </div>
              <div className="bg-card rounded-xl p-3 card-shadow">
                <p className="text-[10px] text-muted-foreground uppercase">Cancelled Today</p>
                <p className="text-xl font-bold text-slate-500 dark:text-slate-400 mt-1">{todaysAppts.filter(a => a.status === 'cancelled').length}<span className="text-[10px] font-normal text-muted-foreground ml-1">/ {todaysAppts.length}</span></p>
              </div>
              <div className="bg-card rounded-xl p-3 card-shadow">
                <p className="text-[10px] text-muted-foreground uppercase">All-time No-Shows</p>
                <p className="text-xl font-bold text-destructive mt-1">{activeStaff.noShows}</p>
              </div>
              <div className="bg-card rounded-xl p-3 card-shadow">
                <p className="text-[10px] text-muted-foreground uppercase">Today's Bookings</p>
                <div className="mt-1">
                  <CustomerTypeBadges
                    onlineCount={todaysAppts.filter(a => a.type === 'online').length}
                    walkinCount={todaysAppts.filter(a => a.type === 'walkin').length}
                    size="sm"
                  />
                </div>
              </div>
            </div>

            {/* Monthly clients chart */}
            <div className="bg-card rounded-xl p-4 card-shadow">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Monthly Clients</p>
              </div>
              <div className="flex items-end gap-1.5 h-24">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((m, i) => {
                  const val = [28, 35, 32, 40, 38, activeStaff.bookingsCompleted][i];
                  const max = 80;
                  const pct = (val / max) * 100;
                  return (
                    <div key={m} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[8px] text-muted-foreground font-medium">{val}</span>
                      <div className="w-full rounded-t-md bg-primary/15 relative" style={{ height: `${pct}%` }}>
                        <div className="absolute inset-0 bg-primary/60 rounded-t-md" />
                      </div>
                      <span className="text-[9px] text-muted-foreground">{m}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rating breakdown */}
            <div className="bg-card rounded-xl p-4 card-shadow">
              <p className="text-sm font-semibold text-foreground mb-3">Rating Breakdown</p>
              {ratingCounts.map(r => (
                <div key={r.stars} className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs text-foreground w-8 flex items-center gap-0.5">{r.stars}<Star className="w-2.5 h-2.5 text-amber-500 fill-current" /></span>
                  <div className="flex-1 h-2.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: totalReviews > 0 ? `${(r.count / totalReviews) * 100}%` : '0%' }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground w-6 text-right">{r.count}</span>
                </div>
              ))}
            </div>

            {/* Today summary */}
            <div className="bg-card rounded-xl p-4 card-shadow">
              <p className="text-sm font-semibold text-foreground mb-1">Today's Progress</p>
              <p className="text-xs text-muted-foreground mb-2">{completed} completed · {remaining} remaining</p>
              <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(completed + remaining) > 0 ? (completed / (completed + remaining)) * 100 : 0}%` }} />
              </div>
            </div>
          </>
        )}

        {tab === 'reviews' && (
          <ReviewsSection
            artists={[]}
            reviews={staffReviews}
            selectedArtist={null}
            onSelectArtist={() => {}}
            hideArtistSelector
            title="Client Reviews"
            onDeletePhoto={(reviewId) => {
              setStaffReviews(prev =>
                prev.map(r =>
                  r.id === reviewId
                    ? { ...r, beforeImage: undefined, afterImage: undefined, hasPhoto: false }
                    : r
                )
              );
            }}
          />
        )}

        {tab === 'logs' && (
          <div className="flex flex-col gap-3">
            {/* Quick filters */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLogDate('')}
                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
                  !logDate ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setLogDate(today)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors flex items-center gap-1 ${
                  logDate === today ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                }`}
              >
                <Clock className="w-3 h-3" /> Today
              </button>
              <div className="ml-auto flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="date"
                  value={logDate}
                  onChange={e => setLogDate(e.target.value)}
                  className="bg-secondary rounded-lg px-2 py-1.5 text-[11px] text-foreground w-28"
                />
              </div>
            </div>

            {/* Summary bar */}
            <div className="flex items-center justify-between bg-card rounded-xl p-3 card-shadow">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">{filteredLogs.length} services</span>
              </div>
              <span className="text-sm font-bold text-foreground">₹{totalEarned.toLocaleString('en-IN')}</span>
            </div>

            {/* Log list */}
            {filteredLogs.length === 0 ? (
              <div className="bg-card rounded-xl p-6 card-shadow text-center">
                <History className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No logs {logDate ? `for ${logDate}` : 'yet'}</p>
              </div>
            ) : (
              filteredLogs.slice().reverse().map(log => {
                const serviceNames = log.serviceIds.map(sid => mockServices.find(s => s.id === sid)?.name).filter(Boolean);
                return (
                  <div key={log.id} className="bg-card rounded-xl p-3 card-shadow">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-foreground">
                          {log.clientName.charAt(0)}
                        </div>
                        <p className="text-sm font-medium text-foreground">{log.clientName}</p>
                      </div>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${
                        log.type === 'online' ? 'bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}>
                        {log.type === 'online' ? <Smartphone className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5" />}
                        {log.type === 'online' ? 'Online' : 'Walk-in'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {serviceNames.map((n, i) => (
                        <span key={i} className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded">{n}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> {log.duration}min</span>
                      <span className="font-semibold text-foreground">₹{log.price}</span>
                      <span>{new Date(log.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="text-[9px]">{log.date}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === 'leaves' && activeStaff && (() => {
          const allRequests = getStaffLeaves(activeStaff.id).slice().sort((a, b) => b.requestedAt - a.requestedAt);
          const pendingCount = getStaffPendingLeaves(activeStaff.id);
          const todayIso = todayLocalStr();
          const conflictCount = leaveDate ? getBookingsOnDate(activeStaff.id, leaveDate) : 0;
          const hasConflict = conflictCount > 0;
          const submitRequest = async () => {
            if (!leaveDate) return;
            const res = await requestLeave(activeStaff.id, leaveDate, leaveReason);
            if (!res.ok) {
              toast({ title: 'Could not submit', description: res.error, variant: 'destructive' });
              return;
            }
            toast({ title: 'Leave requested', description: 'Owner will review your request.' });
            setLeaveDate('');
            setLeaveReason('');
            setLeaveDrawerOpen(false);
          };

          const StatusPill = ({ status }: { status: 'pending' | 'approved' | 'rejected' }) => {
            const map = {
              pending: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
              approved: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
              rejected: 'bg-destructive/15 text-destructive border-destructive/30',
            } as const;
            return (
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${map[status]}`}>
                {status}
              </span>
            );
          };

          return (
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setLeaveDrawerOpen(true)}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Request Leave
              </button>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-card rounded-xl p-4 card-shadow text-center">
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">Approved (Month)</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{getStaffLeavesThisMonth(activeStaff.id)}</p>
                  {pendingCount > 0 && (
                    <p className="text-[10px] text-amber-500 font-semibold mt-1">{pendingCount} pending</p>
                  )}
                </div>
                <div className="bg-card rounded-xl p-4 card-shadow text-center">
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">Approved (Year)</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{getStaffLeavesThisYear(activeStaff.id)}</p>
                </div>
              </div>

              <div className="bg-card rounded-xl p-4 card-shadow">
                <p className="text-sm font-semibold text-foreground mb-3">Leave Requests</p>
                {allRequests.length === 0 ? (
                  <div className="text-center py-4">
                    <CalendarOff className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No leave requests yet</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {allRequests.map(l => (
                      <div key={l.id} className="bg-secondary/50 rounded-lg px-3 py-2.5 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="text-sm text-foreground font-medium truncate">
                              {formatLocalDate(l.date, { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                          <StatusPill status={l.status} />
                        </div>
                        {l.reason && <p className="text-xs text-muted-foreground line-clamp-2">{l.reason}</p>}
                        {l.status === 'rejected' && l.reviewerNote && (
                          <p className="text-xs text-destructive">Note: {l.reviewerNote}</p>
                        )}
                        {l.status === 'pending' && (
                          <button
                            onClick={() => cancelLeaveRequest(l.id)}
                            className="text-[11px] text-muted-foreground hover:text-destructive font-semibold self-start mt-0.5"
                          >
                            Withdraw request
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <ActionDrawer
                open={leaveDrawerOpen}
                onClose={() => setLeaveDrawerOpen(false)}
                title="Request Leave"
                description="Pick a date and add an optional reason"
              >
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground font-medium mb-1 block">Date *</label>
                    <input
                      type="date"
                      min={todayIso}
                      value={leaveDate}
                      onChange={e => setLeaveDate(e.target.value)}
                      className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
                    />
                    {leaveDate && hasConflict && (
                      <div className="mt-2 flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
                        <CalendarOff className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                        <p className="text-[11px] text-destructive leading-snug">
                          You have <strong>{conflictCount} active booking{conflictCount === 1 ? '' : 's'}</strong> on this date. Reschedule or cancel them before requesting leave.
                        </p>
                      </div>
                    )}
                    {leaveDate && !hasConflict && (
                      <p className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        ✓ Schedule is clear on this date
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-medium mb-1 block">
                      Reason (optional) <span className="text-muted-foreground/60">{leaveReason.length}/120</span>
                    </label>
                    <textarea
                      value={leaveReason}
                      onChange={e => setLeaveReason(e.target.value.slice(0, 120))}
                      placeholder="e.g. Family event, medical appointment…"
                      rows={3}
                      className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                  </div>
                  <button
                    onClick={submitRequest}
                    disabled={!leaveDate || hasConflict}
                    className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-bold text-sm active:scale-95 transition-transform disabled:opacity-30"
                  >
                    {hasConflict ? 'Resolve conflicts to continue' : 'Submit Request'}
                  </button>
                </div>
              </ActionDrawer>
            </div>
          );
        })()}
      </div>
    </div>
    </PartnerPageState>
  );
};

export default StaffProfile;
