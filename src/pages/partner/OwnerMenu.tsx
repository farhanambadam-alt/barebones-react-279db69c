import { toLocalDateStr, todayLocalStr } from '@/lib/dateOnly';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Volume2, ChevronRight, ChevronDown, Bell, Clock, DollarSign, CreditCard, HelpCircle, Instagram, Youtube, Trash2, GripVertical, FileText, ShieldCheck, RotateCcw, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import PartnerPageState from '@/components/partner/PartnerPageState';

interface SocialItem {
  id: string;
  type: 'instagram' | 'youtube';
  url: string;
  addedDate: string;
}

const initialSocial: SocialItem[] = [
  { id: 'sm1', type: 'instagram', url: 'https://www.instagram.com/p/example1', addedDate: '2025-03-01' },
  { id: 'sm2', type: 'instagram', url: 'https://www.instagram.com/p/example2', addedDate: '2025-03-05' },
  { id: 'sm3', type: 'youtube', url: 'https://www.youtube.com/shorts/example1', addedDate: '2025-03-10' },
  { id: 'sm4', type: 'youtube', url: 'https://www.youtube.com/shorts/example2', addedDate: '2025-03-15' },
];

const OwnerMenu = () => {
  const [testPlayed, setTestPlayed] = useState(false);
  const [helpExpanded, setHelpExpanded] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [socialMedia, setSocialMedia] = useState<SocialItem[]>(initialSocial);
  const [newInstaUrl, setNewInstaUrl] = useState('');
  const [newYtUrl, setNewYtUrl] = useState('');

  const playSignature = () => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain).connect(ctx.destination);
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15);
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
    setTestPlayed(true);
  };

  const addSocial = (type: 'instagram' | 'youtube') => {
    const url = type === 'instagram' ? newInstaUrl : newYtUrl;
    if (!url.trim()) return;
    setSocialMedia(prev => [...prev, { id: `sm${Date.now()}`, type, url: url.trim(), addedDate: todayLocalStr() }]);
    if (type === 'instagram') setNewInstaUrl('');
    else setNewYtUrl('');
  };

  const removeSocial = (id: string) => setSocialMedia(prev => prev.filter(s => s.id !== id));

  const instaPosts = socialMedia.filter(s => s.type === 'instagram');
  const ytVideos = socialMedia.filter(s => s.type === 'youtube');

  /** Stub for menu items that have no backend yet — keeps the UI honest. */
  const handleComingSoon = (label: string) =>
    toast({
      title: `${label} — coming soon`,
      description: 'This setting will be available once the backend is connected.',
    });

  const menuItems = [
    { label: 'Notifications', desc: 'Push, sound & alert preferences', icon: Bell, color: 'text-amber-500' },
    { label: 'Business Hours', desc: 'Set operating hours for each day', icon: Clock, color: 'text-emerald-500' },
    { label: 'Pricing & Packages', desc: 'Manage combo deals & pricing', icon: DollarSign, color: 'text-blue-500' },
    { label: 'Payment Settings', desc: 'UPI, card & cash preferences', icon: CreditCard, color: 'text-purple-500' },
  ];

  const helpLinks = [
    { label: 'Terms & Conditions', icon: FileText, path: '/terms' },
    { label: 'Privacy Policy', icon: ShieldCheck, path: '/privacy' },
    { label: 'Refund Policy', icon: RotateCcw, path: '/refund-policy' },
    { label: 'Contact Us', icon: MessageSquare, path: '/contact' },
  ];

  return (
    <PartnerPageState>
    <div className="flex flex-col gap-5 p-4 pb-safe">
      <h1 className="text-xl font-heading font-bold text-foreground">Settings</h1>

      {/* Audio Signature */}
      <section className="bg-card rounded-2xl p-4 card-shadow" aria-labelledby="audio-sig-heading">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p id="audio-sig-heading" className="text-sm font-semibold text-foreground">Audio Signature</p>
            <p className="text-xs text-muted-foreground">Plays on check-in events</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center" aria-hidden="true">
            <Volume2 className="w-4 h-4 text-emerald-500" />
          </div>
        </div>
        <button
          type="button"
          onClick={playSignature}
          aria-label="Test audio signature"
          className="w-full btn-themed py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1"
        >
          <Volume2 className="w-3 h-3" aria-hidden="true" /> Test Audio Signature
        </button>
        {testPlayed && <p className="text-[10px] text-emerald-500 mt-1 text-center" role="status">✓ Audio played successfully</p>}
      </section>

      {/* Social Media Gallery */}
      <section className="bg-card rounded-2xl p-4 card-shadow" aria-labelledby="social-heading">
        <h2 id="social-heading" className="sr-only">Social Media Gallery</h2>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Instagram className="w-4 h-4 text-pink-500" aria-hidden="true" />
              <p className="text-sm font-semibold text-foreground">Instagram Posts ({instaPosts.length})</p>
            </div>
          </div>
          <div className="flex gap-2 mb-2">
            <input
              value={newInstaUrl}
              onChange={e => setNewInstaUrl(e.target.value)}
              placeholder="Paste Instagram URL..."
              aria-label="New Instagram URL"
              className="flex-1 bg-secondary rounded-lg px-3 py-2 text-xs text-foreground outline-none"
            />
            <button
              type="button"
              onClick={() => addSocial('instagram')}
              aria-label="Add Instagram post"
              className="bg-gradient-to-r from-pink-500 to-rose-400 text-white px-3 py-2 rounded-lg text-xs font-bold"
            >
              Add
            </button>
          </div>
          {instaPosts.length === 0 ? (
            <p className="text-[11px] text-muted-foreground text-center py-2">No Instagram posts yet.</p>
          ) : (
            instaPosts.map(post => (
              <div key={post.id} className="flex items-center gap-2 py-2 border-b border-border last:border-0">
                <GripVertical className="w-3 h-3 text-muted-foreground shrink-0" aria-hidden="true" />
                <Instagram className="w-3.5 h-3.5 text-pink-500 shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground truncate">{post.url}</p>
                  <p className="text-[10px] text-muted-foreground">Added {post.addedDate}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeSocial(post.id)}
                  aria-label={`Remove Instagram post added ${post.addedDate}`}
                  className="p-1 text-destructive shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            ))
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Youtube className="w-4 h-4 text-red-500" aria-hidden="true" />
              <p className="text-sm font-semibold text-foreground">YouTube Videos ({ytVideos.length})</p>
            </div>
          </div>
          <div className="flex gap-2 mb-2">
            <input
              value={newYtUrl}
              onChange={e => setNewYtUrl(e.target.value)}
              placeholder="Paste YouTube URL..."
              aria-label="New YouTube URL"
              className="flex-1 bg-secondary rounded-lg px-3 py-2 text-xs text-foreground outline-none"
            />
            <button
              type="button"
              onClick={() => addSocial('youtube')}
              aria-label="Add YouTube video"
              className="bg-red-500 text-white px-3 py-2 rounded-lg text-xs font-bold"
            >
              Add
            </button>
          </div>
          {ytVideos.length === 0 ? (
            <p className="text-[11px] text-muted-foreground text-center py-2">No YouTube videos yet.</p>
          ) : (
            ytVideos.map(video => (
              <div key={video.id} className="flex items-center gap-2 py-2 border-b border-border last:border-0">
                <GripVertical className="w-3 h-3 text-muted-foreground shrink-0" aria-hidden="true" />
                <Youtube className="w-3.5 h-3.5 text-red-500 shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground truncate">{video.url}</p>
                  <p className="text-[10px] text-muted-foreground">Added {video.addedDate}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeSocial(video.id)}
                  aria-label={`Remove YouTube video added ${video.addedDate}`}
                  className="p-1 text-destructive shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Menu items */}
      <nav className="flex flex-col gap-1" aria-label="Settings menu">
        {menuItems.map(item => (
          <button
            key={item.label}
            type="button"
            onClick={() => handleComingSoon(item.label)}
            aria-label={`${item.label} (coming soon)`}
            className="flex items-center gap-3 bg-card rounded-xl p-4 card-shadow text-left active:scale-[0.99] transition-transform"
          >
            <item.icon className={`w-5 h-5 ${item.color} shrink-0`} aria-hidden="true" />
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  Soon
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
          </button>
        ))}

        {/* Help & Support expandable */}
        <button
          type="button"
          onClick={() => setHelpExpanded(!helpExpanded)}
          aria-expanded={helpExpanded}
          aria-controls="help-support-panel"
          className="flex items-center gap-3 bg-card rounded-xl p-4 card-shadow text-left"
        >
          <HelpCircle className="w-5 h-5 text-teal-500 shrink-0" aria-hidden="true" />
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-foreground">Help & Support</p>
            <p className="text-xs text-muted-foreground">Policies & contact</p>
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${helpExpanded ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>

        {helpExpanded && (
          <div id="help-support-panel" className="flex flex-col gap-1 ml-4">
            {helpLinks.map(link => (
              <button
                key={link.path}
                type="button"
                onClick={() => navigate(link.path)}
                aria-label={link.label}
                className="flex items-center gap-3 bg-card/60 rounded-xl p-3 card-shadow text-left"
              >
                <link.icon className="w-4 h-4 text-teal-500 shrink-0" aria-hidden="true" />
                <p className="text-sm font-medium text-foreground flex-1 text-left">{link.label}</p>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
      </nav>
    </div>
    </PartnerPageState>
  );
};

export default OwnerMenu;
