import { useState, useRef, useMemo } from 'react';
import { usePartner } from '@/contexts/PartnerContext';
import { Plus, Camera, X, ChevronDown, ChevronUp, Calendar as CalendarIcon, AlertTriangle, Check, Users } from 'lucide-react';
import { z } from 'zod';
import ActionDrawer from '@/components/partner/ActionDrawer';
import CustomerTypeBadges from '@/components/partner/CustomerTypeBadges';
import StaffActionsMenu from '@/components/partner/StaffActionsMenu';
import { useToast } from '@/hooks/use-toast';
import PartnerPageState from '@/components/partner/PartnerPageState';
import EmptyState from '@/components/EmptyState';
import { parseLocalDate, formatLocalDate } from '@/lib/dateOnly';

// Validation schema for Add Staff - same rules as Edit Staff
const addStaffSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'Name must be at least 2 characters' })
    .max(50, { message: 'Name must be 50 characters or fewer' }),
  role: z.string().min(1, { message: 'Please select a role' }),
  phone: z
    .string()
    .trim()
    .refine(
      v => v === '' || /^\d{10}$/.test(v.replace(/\D/g, '')),
      { message: 'Enter a valid 10-digit phone number' }
    ),
  email: z
    .string()
    .trim()
    .refine(
      v => v === '' || z.string().email().safeParse(v).success,
      { message: 'Enter a valid email address' }
    )
    .refine(v => v.length <= 100, { message: 'Email must be 100 characters or fewer' }),
});

type AddFormErrors = Partial<Record<'name' | 'role' | 'phone' | 'email', string>>;

const OwnerStaff = () => {
  const {
    staff, appointments, addStaffMember, getStaffLeavesThisMonth,
    getPendingLeaveRequests, approveLeave, rejectLeave, getBookingsOnDate,
    getStaffPendingLeaves, getStaffLeaves,
  } = usePartner();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', role: 'Barber', phone: '', email: '', specialties: '',
  });
  const [addErrors, setAddErrors] = useState<AddFormErrors>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [requestsOpen, setRequestsOpen] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const pendingRequests = getPendingLeaveRequests();
  const reviewedHistory = useMemo(
    () => staff.flatMap(s => getStaffLeaves(s.id))
      .filter(l => l.status !== 'pending')
      .sort((a, b) => (b.reviewedAt ?? 0) - (a.reviewedAt ?? 0))
      .slice(0, 10),
    [staff, getStaffLeaves]
  );

  const staffById = useMemo(() => {
    const map: Record<string, typeof staff[number]> = {};
    staff.forEach(s => { map[s.id] = s; });
    return map;
  }, [staff]);

  const formatRelative = (iso: string) => {
    const target = parseLocalDate(iso);
    if (!target) return '';
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return 'today';
    if (diff === 1) return 'tomorrow';
    if (diff > 0) return `in ${diff} days`;
    return `${Math.abs(diff)}d ago`;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  };

  const clearImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validateAddField = (field: keyof AddFormErrors, value: string) => {
    const testForm = { ...form, [field]: value };
    const result = addStaffSchema.safeParse(testForm);
    if (!result.success) {
      const fieldError = result.error.errors.find(e => e.path[0] === field);
      setAddErrors(prev => ({ ...prev, [field]: fieldError?.message || '' }));
    } else {
      setAddErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleAdd = () => {
    const result = addStaffSchema.safeParse(form);
    if (!result.success) {
      const errors: AddFormErrors = {};
      result.error.errors.forEach(e => {
        const field = e.path[0] as keyof AddFormErrors;
        errors[field] = e.message;
      });
      setAddErrors(errors);
      toast({ title: 'Please fix the errors', variant: 'destructive' });
      return;
    }
    addStaffMember({
      name: result.data.name,
      role: result.data.role,
      avatar: '',
      image: imagePreview || '',
      phone: result.data.phone.replace(/\D/g, ''),
      email: result.data.email,
    });
    setForm({ name: '', role: 'Barber', phone: '', email: '', specialties: '' });
    setAddErrors({});
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setDrawerOpen(false);
    toast({ title: 'Staff member added' });
  };

  return (
    <PartnerPageState>
    <div className="flex flex-col gap-4 p-4 pb-safe">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Staff Directory</h1>
        <p className="text-sm font-body text-muted-foreground mt-1">Manage your team, track performance, and oversee availability.</p>
      </div>

      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        aria-label="Add staff member"
        className="w-full py-3 rounded-xl border-2 border-dashed border-primary/40 text-primary text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary/5 transition-colors"
      >
        <Plus className="w-4 h-4" aria-hidden="true" /> Add Staff Member
      </button>

      {/* Leave Requests Panel */}
      <div id="leave-requests" className="bg-card rounded-2xl card-shadow overflow-hidden">
        <button
          onClick={() => setRequestsOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-foreground">Leave Requests</span>
            {pendingRequests.length > 0 && (
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                {pendingRequests.length} pending
              </span>
            )}
          </div>
          {requestsOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {requestsOpen && (
          <div className="px-4 pb-4 flex flex-col gap-2 border-t border-border/40 pt-3">
            {pendingRequests.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">No pending requests.</p>
            ) : (
              pendingRequests.map(req => {
                const s = staffById[req.staffId];
                if (!s) return null;
                const conflicts = getBookingsOnDate(req.staffId, req.date);
                const isRejecting = rejectingId === req.id;
                return (
                  <div key={req.id} className="bg-secondary/50 rounded-xl p-3 flex flex-col gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-secondary border border-border shrink-0">
                        {s.image ? (
                          <img src={s.image} alt={s.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground">{s.initials}</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{s.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{s.role}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-foreground">
                          {formatLocalDate(req.date)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{formatRelative(req.date)}</p>
                      </div>
                    </div>

                    {req.reason && (
                      <p className="text-xs text-muted-foreground line-clamp-2 pl-0.5">"{req.reason}"</p>
                    )}

                    {conflicts > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-md px-2 py-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>{conflicts} booking{conflicts > 1 ? 's' : ''} on this date</span>
                      </div>
                    )}

                    {isRejecting ? (
                      <div className="flex flex-col gap-2">
                        <input
                          autoFocus
                          value={rejectNote}
                          onChange={e => setRejectNote(e.target.value.slice(0, 80))}
                          placeholder="Reason for rejection (optional)"
                          className="w-full bg-background rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary border border-border"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setRejectingId(null); setRejectNote(''); }}
                            className="flex-1 py-2 rounded-lg text-xs font-semibold text-foreground bg-secondary"
                          >Cancel</button>
                          <button
                            onClick={() => { rejectLeave(req.id, rejectNote); setRejectingId(null); setRejectNote(''); }}
                            className="flex-1 py-2 rounded-lg text-xs font-bold bg-destructive text-destructive-foreground"
                          >Confirm Reject</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => approveLeave(req.id)}
                          className="flex-1 py-2 rounded-lg text-xs font-bold bg-emerald-500 text-white active:scale-95 transition-transform flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => setRejectingId(req.id)}
                          className="flex-1 py-2 rounded-lg text-xs font-bold border border-destructive/40 text-destructive active:scale-95 transition-transform"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {reviewedHistory.length > 0 && (
              <button
                onClick={() => setHistoryOpen(o => !o)}
                className="text-[11px] font-semibold text-primary self-start mt-1"
              >
                {historyOpen ? 'Hide history' : `View history (${reviewedHistory.length})`}
              </button>
            )}

            {historyOpen && reviewedHistory.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-1">
                {reviewedHistory.map(l => {
                  const s = staffById[l.staffId];
                  if (!s) return null;
                  return (
                    <div key={l.id} className="flex items-center justify-between text-xs bg-secondary/30 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-foreground truncate">{s.name}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground">{formatLocalDate(l.date)}</span>
                      </div>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                        l.status === 'approved'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : 'bg-destructive/15 text-destructive border-destructive/30'
                      }`}>{l.status}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {staff.map(s => {
          const staffAppts = appointments.filter(a => a.staffId === s.id);
          const onlineCount = staffAppts.filter(a => a.type === 'online').length;
          const walkinCount = staffAppts.filter(a => a.type === 'walkin').length;
          const leavesThisMonth = getStaffLeavesThisMonth(s.id);
          const pendingForStaff = getStaffPendingLeaves(s.id);

          return (
            <div key={s.id} className="bg-card rounded-2xl p-4 card-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-14 h-14 rounded-full overflow-hidden bg-secondary border-2 ${
                  s.status === 'busy' ? 'border-amber-500' : 'border-emerald-500'
                }`}>
                  {s.image ? (
                    <img src={s.image} alt={s.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg font-bold text-muted-foreground">
                      {s.initials}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-base font-semibold text-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.role}</p>
                </div>
                <StaffActionsMenu staffId={s.id} staffName={s.name} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-secondary/50 rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">Today</p>
                  <p className="text-lg font-bold text-foreground">₹{s.earnings.today.toLocaleString('en-IN') || '—'}</p>
                </div>
                <div className="bg-secondary/50 rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">Leaves (Month)</p>
                  <p className="text-lg font-bold text-foreground">{leavesThisMonth}</p>
                  {pendingForStaff > 0 && (
                    <button
                      onClick={() => {
                        setRequestsOpen(true);
                        document.getElementById('leave-requests')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className="text-[10px] text-amber-500 font-semibold mt-0.5"
                    >
                      • {pendingForStaff} pending
                    </button>
                  )}
                </div>
                <div className="bg-secondary/50 rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">Month</p>
                  <p className="text-lg font-bold text-foreground">₹{(s.earnings.month / 1000).toFixed(1)}k</p>
                </div>
                <div className="bg-secondary/50 rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground uppercase font-medium">Customers</p>
                  <CustomerTypeBadges onlineCount={onlineCount} walkinCount={walkinCount} size="sm" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Staff Drawer */}
      <ActionDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Add Staff Member" description="Onboard a new team member">
        <div className="flex flex-col gap-4">
          {/* Photo upload */}
          <div className="flex flex-col items-center gap-2">
            <label className="text-xs text-muted-foreground font-medium">Profile Photo</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 rounded-full overflow-hidden bg-secondary border-2 border-dashed border-border hover:border-primary/50 transition-colors flex items-center justify-center group"
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground group-hover:text-primary transition-colors">
                    <Camera className="w-5 h-5" />
                    <span className="text-[9px] font-medium">Upload</span>
                  </div>
                )}
              </button>
              {imagePreview && (
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center shadow-sm"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1 block">Full Name *</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              onBlur={e => validateAddField('name', e.target.value)}
              placeholder="e.g. Arjun Sharma"
              aria-invalid={!!addErrors.name}
              className={`w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:ring-2 ${addErrors.name ? 'ring-2 ring-destructive focus:ring-destructive' : 'focus:ring-primary'}`}
            />
            {addErrors.name && (
              <p className="text-xs text-destructive mt-1">{addErrors.name}</p>
            )}
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1 block">Role</label>
            <select
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground"
            >
              <option>Barber</option>
              <option>Senior Stylist</option>
              <option>Master Stylist</option>
              <option>Junior Stylist</option>
              <option>Trainee</option>
              <option>Nail Technician</option>
              <option>Spa Therapist</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1 block">Phone Number</label>
            <input
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              onBlur={e => validateAddField('phone', e.target.value)}
              placeholder="9876543210"
              type="tel"
              aria-invalid={!!addErrors.phone}
              className={`w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:ring-2 ${addErrors.phone ? 'ring-2 ring-destructive focus:ring-destructive' : 'focus:ring-primary'}`}
            />
            {addErrors.phone ? (
              <p className="text-xs text-destructive mt-1">{addErrors.phone}</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">10-digit mobile number</p>
            )}
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1 block">Email (optional)</label>
            <input
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              onBlur={e => validateAddField('email', e.target.value)}
              placeholder="staff@salon.com"
              type="email"
              aria-invalid={!!addErrors.email}
              className={`w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:ring-2 ${addErrors.email ? 'ring-2 ring-destructive focus:ring-destructive' : 'focus:ring-primary'}`}
            />
            {addErrors.email ? (
              <p className="text-xs text-destructive mt-1">{addErrors.email}</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">Optional work email</p>
            )}
          </div>

          <button
            onClick={handleAdd}
            disabled={!form.name.trim() || Object.keys(addErrors).some(k => !!addErrors[k as keyof AddFormErrors])}
            className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-bold text-sm active:scale-95 transition-transform disabled:opacity-30"
          >
            Add to Team
          </button>
        </div>
      </ActionDrawer>
    </div>
    </PartnerPageState>
  );
};

export default OwnerStaff;
