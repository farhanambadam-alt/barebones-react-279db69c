import { useState } from 'react';
import { usePartner } from '@/contexts/PartnerContext';
import { ServicePackage } from '@/data/partnerMockData';
import ActionDrawer from '@/components/partner/ActionDrawer';
import PartnerPageState from '@/components/partner/PartnerPageState';
import EmptyState from '@/components/EmptyState';
import { Plus, Package, ChevronRight, Check, Trash2, FolderPlus, Clock, Sparkles, Users, Scissors } from 'lucide-react';

const OwnerGrowth = () => {
  const { services, categories, packages, addCategory, addService, addPackage, removePackage } = usePartner();
  const [genderFilter, setGenderFilter] = useState<'male' | 'female'>('male');
  const [activeTab, setActiveTab] = useState<'services' | 'packages'>('services');

  // Package builder
  const [building, setBuilding] = useState(false);
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [form, setForm] = useState({ name: '', price: '', validity: '30', weekdaysOnly: false, commission: '10' });

  // Category/service creation
  const [catDrawer, setCatDrawer] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [svcDrawer, setSvcDrawer] = useState(false);
  const [svcForm, setSvcForm] = useState({ name: '', categoryId: '', duration: '30', price: '', gender: 'unisex' as 'male' | 'female' | 'unisex' });

  const totalValue = selected.reduce((sum, id) => sum + (services.find(s => s.id === id)?.price ?? 0), 0);

  const handleCreatePackage = () => {
    addPackage({
      name: form.name,
      serviceIds: selected,
      totalValue,
      bundlePrice: Number(form.price) || totalValue,
      validityDays: Number(form.validity),
      weekdaysOnly: form.weekdaysOnly,
      commissionPercent: Number(form.commission),
    });
    setBuilding(false);
    setStep(0);
    setSelected([]);
    setForm({ name: '', price: '', validity: '30', weekdaysOnly: false, commission: '10' });
  };

  const handleAddCategory = () => {
    const created = addCategory(newCatName);
    if (!created) return;
    setNewCatName('');
    setCatDrawer(false);
  };

  const handleAddService = () => {
    const created = addService({
      name: svcForm.name,
      categoryId: svcForm.categoryId,
      duration: Number(svcForm.duration) || 30,
      price: Number(svcForm.price),
      gender: svcForm.gender,
    });
    if (!created) return;
    setSvcForm({ name: '', categoryId: '', duration: '30', price: '', gender: 'unisex' });
    setSvcDrawer(false);
  };

  const deletePackage = (id: string) => removePackage(id);

  // Filter services by gender
  const filteredServices = services.filter(s => s.gender === genderFilter || s.gender === 'unisex');

  // Group filtered services by category
  const groupedServices = categories.map(cat => ({
    ...cat,
    services: filteredServices.filter(s => s.categoryId === cat.id),
  }));

  // Filter packages — include if any of its services match the filter
  const filteredPackages = packages.filter(p =>
    p.serviceIds.some(sid => {
      const svc = services.find(s => s.id === sid);
      return svc && (svc.gender === genderFilter || svc.gender === 'unisex');
    })
  );

  const genderIcon = (g: string) => {
    if (g === 'male') return '♂';
    if (g === 'female') return '♀';
    return '⚥';
  };

  return (
    <PartnerPageState>
    <div className="flex flex-col gap-4 p-4 pb-safe">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-heading font-bold text-foreground">Growth Center</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{services.length} services · {packages.length} packages</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
      </div>

      {/* Tabs */}
      <div
        className="inline-flex self-center rounded-[22px] p-1.5 md:rounded-[26px] md:p-2 bg-card/80 border border-border/60 backdrop-blur-xl"
      >
        <button
          onClick={() => setActiveTab('services')}
          className="flex items-center justify-center gap-2 py-2.5 px-7 rounded-[18px] font-heading font-bold text-[13px] transition-all duration-300 active:scale-95 min-h-[40px] md:py-3.5 md:px-10 md:text-base md:min-h-[48px] md:rounded-[22px] md:gap-2.5 lg:px-14 lg:text-[17px] lg:min-h-[52px]"
          style={{
            background: activeTab === 'services' ? 'hsl(var(--primary))' : 'transparent',
            color: activeTab === 'services' ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))',
            boxShadow: activeTab === 'services' ? '0 4px 14px -3px hsl(var(--primary) / 0.45)' : 'none',
          }}
          aria-pressed={activeTab === 'services'}
        >
          <Scissors className="w-3.5 h-3.5 md:w-[18px] md:h-[18px]" />
          Services
        </button>
        <button
          onClick={() => setActiveTab('packages')}
          className="flex items-center justify-center gap-2 py-2.5 px-7 rounded-[18px] font-heading font-bold text-[13px] transition-all duration-300 active:scale-95 min-h-[40px] md:py-3.5 md:px-10 md:text-base md:min-h-[48px] md:rounded-[22px] md:gap-2.5 lg:px-14 lg:text-[17px] lg:min-h-[52px]"
          style={{
            background: activeTab === 'packages' ? 'hsl(var(--primary))' : 'transparent',
            color: activeTab === 'packages' ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))',
            boxShadow: activeTab === 'packages' ? '0 4px 14px -3px hsl(var(--primary) / 0.45)' : 'none',
          }}
          aria-pressed={activeTab === 'packages'}
        >
          <Package className="w-3.5 h-3.5 md:w-[18px] md:h-[18px]" />
          Packages
        </button>
      </div>

      {/* Gender Toggle — slightly smaller than tabs on desktop */}
      <div
        className="inline-flex self-center rounded-[20px] p-1.5 md:rounded-[22px] bg-card/80 border border-border/60 backdrop-blur-xl"
      >
        <button
          onClick={() => setGenderFilter('male')}
          className="flex items-center justify-center gap-2 py-2.5 px-7 rounded-[16px] font-heading font-bold text-[13px] transition-all duration-300 active:scale-95 min-h-[40px] md:py-3 md:px-8 md:text-sm md:min-h-[44px] md:rounded-[18px] lg:px-12 lg:text-[15px] lg:min-h-[46px]"
          style={{
            background: genderFilter === 'male' ? '#3b82f6' : 'transparent',
            color: genderFilter === 'male' ? '#fff' : 'hsl(var(--muted-foreground))',
            boxShadow: genderFilter === 'male' ? '0 4px 14px -3px rgba(59,130,246,0.45)' : 'none',
          }}
          aria-pressed={genderFilter === 'male'}
        >
          <Scissors className="w-3.5 h-3.5 md:w-4 md:h-4" />
          Men
        </button>
        <button
          onClick={() => setGenderFilter('female')}
          className="flex items-center justify-center gap-2 py-2.5 px-7 rounded-[16px] font-heading font-bold text-[13px] transition-all duration-300 active:scale-95 min-h-[40px] md:py-3 md:px-8 md:text-sm md:min-h-[44px] md:rounded-[18px] lg:px-12 lg:text-[15px] lg:min-h-[46px]"
          style={{
            background: genderFilter === 'female' ? '#ec4899' : 'transparent',
            color: genderFilter === 'female' ? '#fff' : 'hsl(var(--muted-foreground))',
            boxShadow: genderFilter === 'female' ? '0 4px 14px -3px rgba(236,72,153,0.45)' : 'none',
          }}
          aria-pressed={genderFilter === 'female'}
        >
          <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4" />
          Women
        </button>
      </div>

      {activeTab === 'services' ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">All Services ({filteredServices.length})</h2>
            <div className="flex gap-1.5">
              <button onClick={() => setCatDrawer(true)} className="flex items-center gap-1 bg-secondary text-foreground px-3 py-1.5 rounded-lg text-xs font-semibold border border-border/40 hover:bg-secondary/80 transition-colors">
                <FolderPlus className="w-3 h-3" /> Category
              </button>
              <button onClick={() => setSvcDrawer(true)} className="flex items-center gap-1 btn-themed px-3 py-1.5 rounded-lg text-xs font-semibold">
                <Plus className="w-3 h-3" /> Service
              </button>
            </div>
          </div>

          {groupedServices.map(group => (
            <div key={group.id} className="mb-5">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-1 h-4 rounded-full bg-primary" />
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{group.name}</p>
                <span className="text-[10px] text-muted-foreground/60 bg-secondary px-1.5 py-0.5 rounded-full">{group.services.length}</span>
              </div>
              {group.services.length === 0 ? (
                <button onClick={() => { setSvcForm(f => ({ ...f, categoryId: group.id })); setSvcDrawer(true); }} className="w-full py-4 border-2 border-dashed border-border/60 rounded-2xl text-xs text-muted-foreground hover:bg-secondary/50 hover:border-primary/30 transition-all">
                  + Add first service
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  {group.services.map(s => (
                    <div key={s.id} className="bg-card rounded-2xl card-shadow border border-border/30 hover:border-border/60 transition-colors">
                      <div className="flex items-center gap-3 p-3 md:p-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate md:text-base">{s.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground md:text-xs">
                              <Clock className="w-3 h-3" /> {s.duration}min
                            </span>
                            <span className="text-border">·</span>
                            <span className="text-[11px] text-muted-foreground md:text-xs">{genderIcon(s.gender)} {s.gender}</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-base font-bold text-foreground md:text-lg">₹{s.price.toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Packages ({filteredPackages.length})</h2>
            <button onClick={() => { setBuilding(true); setStep(0); }} className="flex items-center gap-1 btn-themed px-3 py-1.5 rounded-lg text-xs font-semibold">
              <Plus className="w-3 h-3" /> Create
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {filteredPackages.map(p => {
              const discount = Math.round((1 - p.bundlePrice / p.totalValue) * 100);
              const serviceNames = p.serviceIds.map(sid => services.find(sv => sv.id === sid)?.name).filter(Boolean);
              return (
                <div key={p.id} className="bg-card rounded-2xl card-shadow border border-border/30">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Package className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{p.name}</p>
                          <p className="text-[11px] text-muted-foreground">{p.serviceIds.length} services · {p.validityDays} days validity</p>
                        </div>
                      </div>
                      <button onClick={() => deletePackage(p.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>

                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-xl font-bold text-foreground">₹{p.bundlePrice.toLocaleString('en-IN')}</span>
                      <span className="text-sm text-muted-foreground line-through">₹{p.totalValue.toLocaleString('en-IN')}</span>
                      <span className="text-xs font-bold bg-emerald-500/15 text-emerald-600 px-2 py-0.5 rounded-full">{discount}% off</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {serviceNames.map((name, i) => (
                        <span key={i} className="text-[10px] bg-secondary/80 text-muted-foreground px-2 py-1 rounded-lg border border-border/30">{name}</span>
                      ))}
                    </div>

                    {p.weekdaysOnly && (
                      <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Weekdays only
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredPackages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-secondary/60 flex items-center justify-center mb-3">
                  <Package className="w-7 h-7 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No packages yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Bundle services to offer great deals</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Package Builder Drawer */}
      <ActionDrawer open={building} onClose={() => setBuilding(false)} title="Create Package">
        <div className="flex items-center gap-2 mb-4">
          {['Select', 'Configure'].map((label, i) => (
            <div key={label} className="flex-1 flex flex-col items-center gap-1">
              <div className={`w-full h-1.5 rounded-full transition-all ${i <= step ? 'bg-primary' : 'bg-secondary'}`} />
              <span className={`text-[10px] font-medium ${i <= step ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
            </div>
          ))}
        </div>

        {step === 0 ? (
          <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
            {services.map(s => (
              <button key={s.id} onClick={() => setSelected(prev => prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id])} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${selected.includes(s.id) ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border bg-card'}`}>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.category} · {s.duration}min · ₹{s.price}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${selected.includes(s.id) ? 'border-primary bg-primary' : 'border-border'}`}>
                  {selected.includes(s.id) && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
              </button>
            ))}
            {selected.length > 0 && (
              <div className="sticky bottom-0 pt-2 bg-background">
                <button disabled={selected.length < 2} onClick={() => setStep(1)} className="w-full btn-themed py-3 rounded-xl text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-1">
                  Next — {selected.length} selected <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Package Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full mt-1 bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40 border border-border/40" placeholder="e.g. Summer Special" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Bundle Price (Value: ₹{totalValue})</label>
              <input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} type="number" className="w-full mt-1 bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40 border border-border/40" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Validity (days)</label>
                <input value={form.validity} onChange={e => setForm(f => ({ ...f, validity: e.target.value }))} type="number" className="w-full mt-1 bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40 border border-border/40" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Commission %</label>
                <input value={form.commission} onChange={e => setForm(f => ({ ...f, commission: e.target.value }))} type="number" className="w-full mt-1 bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40 border border-border/40" />
              </div>
            </div>
            <label className="flex items-center gap-2.5 text-sm text-foreground bg-secondary/50 rounded-xl px-3 py-3 border border-border/30">
              <input type="checkbox" checked={form.weekdaysOnly} onChange={e => setForm(f => ({ ...f, weekdaysOnly: e.target.checked }))} className="rounded" />
              Weekdays only
            </label>
            <div className="flex gap-2 mt-2">
              <button onClick={() => setStep(0)} className="flex-1 py-3 rounded-xl text-sm font-semibold bg-secondary text-foreground border border-border/40">Back</button>
              <button onClick={handleCreatePackage} disabled={!form.name} className="flex-1 btn-themed py-3 rounded-xl text-sm font-semibold disabled:opacity-40">Create</button>
            </div>
          </div>
        )}
      </ActionDrawer>

      {/* Add Category Drawer */}
      <ActionDrawer open={catDrawer} onClose={() => setCatDrawer(false)} title="New Category">
        <div className="flex flex-col gap-3">
          <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Category name (e.g. Spa)" className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40 border border-border/40" />
          <button onClick={handleAddCategory} disabled={!newCatName.trim()} className="btn-themed py-3 rounded-xl text-sm font-semibold disabled:opacity-40">Create Category</button>
        </div>
      </ActionDrawer>

      {/* Add Service Drawer */}
      <ActionDrawer open={svcDrawer} onClose={() => setSvcDrawer(false)} title="New Service">
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Service Name</label>
            <input value={svcForm.name} onChange={e => setSvcForm(f => ({ ...f, name: e.target.value }))} className="w-full mt-1 bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40 border border-border/40" placeholder="e.g. Hot Towel Shave" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Category</label>
            <select value={svcForm.categoryId} onChange={e => setSvcForm(f => ({ ...f, categoryId: e.target.value }))} className="w-full mt-1 bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40 border border-border/40">
              <option value="">Select category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Duration (min)</label>
              <input value={svcForm.duration} onChange={e => setSvcForm(f => ({ ...f, duration: e.target.value }))} type="number" className="w-full mt-1 bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40 border border-border/40" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Price (₹)</label>
              <input value={svcForm.price} onChange={e => setSvcForm(f => ({ ...f, price: e.target.value }))} type="number" className="w-full mt-1 bg-secondary rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40 border border-border/40" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Gender</label>
            <div className="flex gap-2 mt-1">
              {(['unisex', 'male', 'female'] as const).map(g => (
                <button key={g} onClick={() => setSvcForm(f => ({ ...f, gender: g }))} className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all ${svcForm.gender === g ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/20' : 'border-border text-muted-foreground'}`}>
                  {genderIcon(g)} {g.charAt(0).toUpperCase() + g.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleAddService} disabled={!svcForm.name || !svcForm.categoryId || !svcForm.price} className="btn-themed py-3 rounded-xl text-sm font-semibold disabled:opacity-40 mt-2">Add Service</button>
        </div>
      </ActionDrawer>
    </div>
    </PartnerPageState>
  );
};

export default OwnerGrowth;
