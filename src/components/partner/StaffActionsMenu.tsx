import { useState, useMemo, useRef, useEffect } from 'react';
import { MoreVertical, Scissors, Trash2, Check, Search, Pencil, Camera, X } from 'lucide-react';
import { z } from 'zod';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import ActionDrawer from '@/components/partner/ActionDrawer';
import ConfirmActionDialog from '@/components/partner/ConfirmActionDialog';
import { usePartner } from '@/contexts/PartnerContext';
import { useToast } from '@/hooks/use-toast';

interface Props {
  staffId: string;
  staffName: string;
}

const ROLES = ['Owner', 'Senior Stylist', 'Stylist', 'Barber', 'Junior Barber', 'Apprentice'];

// Validation schema. Phone must be exactly 10 digits (after stripping non-digits).
// Email is optional but must be a valid format if provided.
const editStaffSchema = z.object({
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

type EditFormErrors = Partial<Record<'name' | 'role' | 'phone' | 'email', string>>;

const StaffActionsMenu = ({ staffId, staffName }: Props) => {
  const { staff, removeStaffMember, setStaffServices, updateStaffMember, services: mockServices } = usePartner();
  const { toast } = useToast();
  const member = staff.find(s => s.id === staffId);

  const [menuOpen, setMenuOpen] = useState(false);
  const [servicesDrawerOpen, setServicesDrawerOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [confirm1Open, setConfirm1Open] = useState(false);
  const [confirm2Open, setConfirm2Open] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>(member?.assignedServiceIds ?? []);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: member?.name ?? '',
    role: member?.role ?? 'Barber',
    phone: member?.phone ?? '',
    email: member?.email ?? '',
  });
  const [editImage, setEditImage] = useState<string>(member?.image ?? '');
  const editFileRef = useRef<HTMLInputElement>(null);
  const [editErrors, setEditErrors] = useState<EditFormErrors>({});

  useEffect(() => {
    if (editDrawerOpen && member) {
      setEditForm({
        name: member.name,
        role: member.role,
        phone: member.phone ?? '',
        email: member.email ?? '',
      });
      setEditImage(member.image ?? '');
      setEditErrors({});
    }
  }, [editDrawerOpen, member]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mockServices.filter(s => !q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
  }, [search]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof mockServices>();
    filtered.forEach(s => {
      if (!map.has(s.category)) map.set(s.category, []);
      map.get(s.category)!.push(s);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const openServices = () => {
    setSelected(member?.assignedServiceIds ?? []);
    setSearch('');
    setMenuOpen(false);
    setServicesDrawerOpen(true);
  };

  const openDelete = () => {
    setMenuOpen(false);
    setConfirm1Open(true);
  };

  const openEdit = () => {
    setMenuOpen(false);
    setEditDrawerOpen(true);
  };

  const handleEditImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditImage(URL.createObjectURL(file));
  };

  const validateEditField = (field: 'name' | 'phone' | 'email', value: string) => {
    const result = editStaffSchema.shape[field].safeParse(value);
    setEditErrors(prev => ({
      ...prev,
      [field]: result.success ? undefined : result.error.issues[0]?.message,
    }));
  };

  const saveEdit = () => {
    const result = editStaffSchema.safeParse(editForm);
    if (!result.success) {
      const fieldErrors: EditFormErrors = {};
      result.error.issues.forEach(issue => {
        const key = issue.path[0] as keyof EditFormErrors;
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      });
      setEditErrors(fieldErrors);
      toast({
        title: 'Please fix the errors',
        description: 'Some fields need your attention.',
        variant: 'destructive',
      });
      return;
    }
    const data = result.data;
    updateStaffMember(staffId, {
      name: data.name,
      role: data.role,
      phone: data.phone ? data.phone.replace(/\D/g, '') : undefined,
      email: data.email || undefined,
      image: editImage,
    });
    setEditErrors({});
    setEditDrawerOpen(false);
    toast({ title: 'Staff updated', description: `${data.name}'s details were saved.` });
  };

  const toggleService = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const saveServices = () => {
    setStaffServices(staffId, selected);
    setServicesDrawerOpen(false);
    toast({ title: 'Services updated', description: `${selected.length} service${selected.length === 1 ? '' : 's'} assigned to ${staffName}.` });
  };

  const handleFinalDelete = () => {
    removeStaffMember(staffId);
    setConfirm2Open(false);
    toast({ title: 'Staff removed', description: `${staffName} has been removed from the team.` });
  };

  return (
    <>
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <button
            onClick={(e) => { e.stopPropagation(); }}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Staff actions"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={6}
          className="w-52 p-1 rounded-xl border border-border bg-popover shadow-xl"
        >
          <button
            onClick={openEdit}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent transition-colors text-left"
          >
            <Pencil className="w-4 h-4 text-primary" />
            <span className="font-medium">Edit Staff</span>
          </button>
          <button
            onClick={openServices}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-foreground hover:bg-accent transition-colors text-left"
          >
            <Scissors className="w-4 h-4 text-primary" />
            <span className="font-medium">Select Services</span>
          </button>
          <div className="h-px bg-border/60 my-1" />
          <button
            onClick={openDelete}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors text-left"
          >
            <Trash2 className="w-4 h-4" />
            <span className="font-medium">Delete Staff</span>
          </button>
        </PopoverContent>
      </Popover>

      {/* Edit drawer */}
      <ActionDrawer
        open={editDrawerOpen}
        onClose={() => setEditDrawerOpen(false)}
        title="Edit Staff"
        description={`Update ${staffName}'s profile`}
      >
        <div className="flex flex-col gap-4">
          {/* Photo */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-secondary border-2 border-border">
                {editImage ? (
                  <img src={editImage} alt={editForm.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-muted-foreground">
                    {editForm.name ? editForm.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?'}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => editFileRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-primary text-primary-foreground border-2 border-background flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                aria-label="Change photo"
              >
                <Camera className="w-4 h-4" />
              </button>
              {editImage && (
                <button
                  type="button"
                  onClick={() => { setEditImage(''); if (editFileRef.current) editFileRef.current.value = ''; }}
                  className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground border-2 border-background flex items-center justify-center shadow-lg"
                  aria-label="Remove photo"
                >
                  <X className="w-3 h-3" strokeWidth={3} />
                </button>
              )}
            </div>
            <input
              ref={editFileRef}
              type="file"
              accept="image/*"
              onChange={handleEditImage}
              className="hidden"
            />
            <p className="text-[11px] text-muted-foreground">Tap camera to change photo</p>
          </div>

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</label>
            <input
              value={editForm.name}
              onChange={e => {
                const v = e.target.value.slice(0, 50);
                setEditForm(f => ({ ...f, name: v }));
                if (editErrors.name) validateEditField('name', v);
              }}
              onBlur={e => validateEditField('name', e.target.value)}
              placeholder="Full name"
              aria-invalid={!!editErrors.name}
              className={`w-full bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 ${
                editErrors.name ? 'ring-2 ring-destructive focus:ring-destructive' : 'focus:ring-primary'
              }`}
            />
            {editErrors.name && (
              <p className="text-[11px] font-medium px-1 text-[#e83030]">{editErrors.name}</p>
            )}
          </div>

          {/* Role */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</label>
            <div className="flex flex-wrap gap-1.5">
              {ROLES.map(r => {
                const isOn = editForm.role === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setEditForm(f => ({ ...f, role: r }))}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      isOn ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary/60 text-foreground border-border'
                    }`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone</label>
            <input
              value={editForm.phone}
              onChange={e => {
                const v = e.target.value.replace(/[^\d+\s-]/g, '').slice(0, 15);
                setEditForm(f => ({ ...f, phone: v }));
                if (editErrors.phone) validateEditField('phone', v);
              }}
              onBlur={e => validateEditField('phone', e.target.value)}
              placeholder="e.g. 9876543210"
              inputMode="tel"
              aria-invalid={!!editErrors.phone}
              className={`w-full bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 ${
                editErrors.phone ? 'ring-2 ring-destructive focus:ring-destructive' : 'focus:ring-primary'
              }`}
            />
            {editErrors.phone ? (
              <p className="text-[11px] font-medium px-1 text-[#e83030]">{editErrors.phone}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground px-1">Optional. Must be 10 digits if provided.</p>
            )}
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</label>
            <input
              value={editForm.email}
              onChange={e => {
                const v = e.target.value.slice(0, 100);
                setEditForm(f => ({ ...f, email: v }));
                if (editErrors.email) validateEditField('email', v);
              }}
              onBlur={e => validateEditField('email', e.target.value)}
              placeholder="name@example.com"
              inputMode="email"
              type="email"
              aria-invalid={!!editErrors.email}
              className={`w-full bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 ${
                editErrors.email ? 'ring-2 ring-destructive focus:ring-destructive' : 'focus:ring-primary'
              }`}
            />
            {editErrors.email ? (
              <p className="text-[11px] font-medium px-1 text-[#e83030]">{editErrors.email}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground px-1">Optional. Must be a valid email if provided.</p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setEditDrawerOpen(false)}
              className="flex-1 py-3 rounded-xl bg-secondary text-foreground font-semibold text-sm"
            >Cancel</button>
            <button
              onClick={saveEdit}
              className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm active:scale-95 transition-transform"
            >Save Changes</button>
          </div>
        </div>
      </ActionDrawer>

      {/* Services drawer */}
      <ActionDrawer
        open={servicesDrawerOpen}
        onClose={() => setServicesDrawerOpen(false)}
        title="Select Services"
        description={`Choose services ${staffName} can perform`}
      >
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search services..."
              className="w-full bg-secondary rounded-xl pl-9 pr-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {selected.length} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setSelected(mockServices.map(s => s.id))}
                className="text-primary font-semibold"
              >Select all</button>
              <span className="text-border">|</span>
              <button
                onClick={() => setSelected([])}
                className="text-muted-foreground font-semibold"
              >Clear</button>
            </div>
          </div>

          <div className="max-h-[50vh] overflow-y-auto flex flex-col gap-3 -mx-1 px-1">
            {grouped.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No services found.</p>
            ) : grouped.map(([cat, items]) => (
              <div key={cat}>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1.5 px-1">{cat}</p>
                <div className="flex flex-col gap-1.5">
                  {items.map(svc => {
                    const isOn = selected.includes(svc.id);
                    return (
                      <button
                        key={svc.id}
                        onClick={() => toggleService(svc.id)}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors text-left ${
                          isOn ? 'bg-primary/10 border-primary/40' : 'bg-secondary/50 border-transparent'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 shrink-0 ${
                          isOn ? 'bg-primary border-primary' : 'border-border bg-background'
                        }`}>
                          {isOn && <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{svc.name}</p>
                          <p className="text-[11px] text-muted-foreground">{svc.duration} min · ₹{svc.price}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setServicesDrawerOpen(false)}
              className="flex-1 py-3 rounded-xl bg-secondary text-foreground font-semibold text-sm"
            >Cancel</button>
            <button
              onClick={saveServices}
              className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm active:scale-95 transition-transform"
            >Save ({selected.length})</button>
          </div>
        </div>
      </ActionDrawer>

      {/* Step 1: initial confirmation */}
      <ConfirmActionDialog
        open={confirm1Open}
        onOpenChange={setConfirm1Open}
        title={`Delete ${staffName}?`}
        description="This will remove the staff member, their bookings and leave history. You'll be asked to confirm once more."
        confirmLabel="Continue"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => {
          setConfirm1Open(false);
          // tiny delay so the first dialog can close cleanly
          setTimeout(() => setConfirm2Open(true), 150);
        }}
      />

      {/* Step 2: final confirmation */}
      <ConfirmActionDialog
        open={confirm2Open}
        onOpenChange={setConfirm2Open}
        title="This action is permanent"
        description={`Are you absolutely sure you want to delete ${staffName}? This cannot be undone.`}
        confirmLabel="Yes, delete permanently"
        cancelLabel="Keep staff"
        destructive
        onConfirm={handleFinalDelete}
      />
    </>
  );
};

export default StaffActionsMenu;
