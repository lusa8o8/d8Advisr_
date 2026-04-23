import { useState, useEffect } from 'react';
import { useLocation } from "wouter";
import {
  ArrowLeft, ChevronRight, X, Check,
  User, Phone, Calendar, AtSign, Mail,
  MapPin, Heart, Wallet, Bell,
  Lock, Palette, LogOut, Trash2,
  Eye, Sun, Moon, Monitor, CreditCard,
} from 'lucide-react';
import { TopBar, BottomNav, cn } from "@/components/SharedUI";
import { useIsDesktop } from "@/hooks/useIsDesktop";

// ─── Types ───────────────────────────────────────────────────────────────────
interface PaymentMethod {
  type: 'card' | 'bank';
  last4: string;
  label: string; // e.g. "Visa" or "GTBank"
}
interface NotifSettings {
  planReminders: boolean;
  venueAlerts: boolean;
  groupInvites: boolean;
  stashReminders: boolean;
  promos: boolean;
}
interface PrivacySettings {
  visibility: 'private' | 'friends' | 'public';
  sharePlans: boolean;
  onlineStatus: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const NEIGHBORHOODS_BY_CITY: Record<string, string[]> = {
  lagos:  ['Victoria Island', 'Lekki Phase 1', 'Ikoyi', 'Surulere', 'Yaba', 'Ikeja', 'Ajah', 'Gbagada'],
  lusaka: ['Kabulonga', 'Woodlands', 'Showgrounds', 'Rhodes Park', 'Northmead', 'Chelston', 'Emmasdale', 'Ibex Hill'],
};
const CITIES = [
  { id: 'lagos',  name: 'Lagos',  flag: '🇳🇬', live: true  },
  { id: 'lusaka', name: 'Lusaka', flag: '🇿🇲', live: true  },
  { id: 'london', name: 'London', flag: '🇬🇧', live: false },
  { id: 'dubai',  name: 'Dubai',  flag: '🇦🇪', live: false },
];

const CURRENCY_BY_CITY: Record<string, { symbol: string; name: string; market: string }> = {
  lagos:  { symbol: '₦', name: 'Nigerian Naira (₦)',  market: 'Lagos market' },
  lusaka: { symbol: 'K',  name: 'Zambian Kwacha (K)', market: 'Lusaka market' },
};

// ─── Small Toggle ─────────────────────────────────────────────────────────────
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={cn(
        'relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0',
        on ? 'bg-primary' : 'bg-gray-200',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200',
          on ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────
function Row({
  icon, label, value, onClick, right, border = true,
}: {
  icon?: React.ReactNode;
  label: string;
  value?: string;
  onClick?: () => void;
  right?: React.ReactNode;
  border?: boolean;
}) {
  const inner = (
    <>
      {icon && (
        <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground text-[14px]">{label}</p>
        {value && <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{value}</p>}
      </div>
      {right ?? (onClick ? <ChevronRight size={16} className="text-gray-300 shrink-0" /> : null)}
    </>
  );

  const cls = cn(
    'w-full flex items-center gap-4 px-5 py-4 text-left transition-colors',
    border && 'border-b border-gray-100 last:border-0',
    right ? 'cursor-default' : onClick ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default',
  );

  // When right is a toggle (interactive element), use div to avoid nested buttons
  if (right) {
    return <div className={cls}>{inner}</div>;
  }
  return (
    <button onClick={onClick} disabled={!onClick} className={cls}>
      {inner}
    </button>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1 mb-2">
        {title}
      </p>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {children}
      </div>
    </div>
  );
}

// ─── Edit Sheet ───────────────────────────────────────────────────────────────
function EditSheet({
  title, value, placeholder, type = 'text', onSave, onClose,
}: {
  title: string;
  value: string;
  placeholder: string;
  type?: string;
  onSave: (v: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl px-6 pt-6 pb-10 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[18px] font-bold text-foreground">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <X size={16} className="text-foreground" />
          </button>
        </div>
        <input
          autoFocus
          type={type}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-medium mb-5"
        />
        <button
          onClick={() => { onSave(draft); onClose(); }}
          className="w-full bg-primary text-white py-4 rounded-xl font-bold text-[15px] shadow-lg shadow-primary/30"
        >
          Save
        </button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function Settings() {
  const [, setLocation] = useLocation();
  const isDesktop = useIsDesktop();

  // Personal info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [handle, setHandle]       = useState('');
  const [email, setEmail]         = useState('');
  const [phone, setPhone]         = useState('');
  const [dob, setDob]             = useState('');
  const [city, setCity]           = useState('lagos');
  const [neighborhood, setNeighborhood] = useState('');

  // Notifications
  const [notif, setNotif] = useState<NotifSettings>({
    planReminders: true,
    venueAlerts:   true,
    groupInvites:  true,
    stashReminders: false,
    promos:         false,
  });

  // Privacy
  const [privacy, setPrivacy] = useState<PrivacySettings>({
    visibility:  'friends',
    sharePlans:  true,
    onlineStatus: true,
  });

  // App prefs
  const [theme, setTheme]     = useState<'light' | 'dark' | 'system'>('system');
  const [distUnit, setDistUnit] = useState<'km' | 'mi'>('km');

  // Payment
  const [payment, setPayment] = useState<PaymentMethod | null>(null);
  const [showPaySheet, setShowPaySheet] = useState(false);

  // Edit sheet state
  const [editing, setEditing] = useState<null | {
    field: string;
    title: string;
    value: string;
    placeholder: string;
    type?: string;
    onSave: (v: string) => void;
  }>(null);

  // Load from localStorage
  useEffect(() => {
    const load = (k: string, fallback = '') => localStorage.getItem(k) ?? fallback;
    const name = load('d8advisr_name', 'Alex Johnson');
    const parts = name.split(' ');
    setFirstName(parts[0] ?? '');
    setLastName(parts.slice(1).join(' '));
    setHandle(load('d8advisr_handle', 'alexj'));
    setEmail(load('d8advisr_email'));
    setPhone(load('d8advisr_phone'));
    setDob(load('d8advisr_dob'));
    setCity(load('d8advisr_city', 'lagos'));
    setNeighborhood(load('d8advisr_neighborhood'));
    setTheme((load('d8advisr_theme', 'system') as 'light' | 'dark' | 'system'));
    setDistUnit((load('d8advisr_dist', 'km') as 'km' | 'mi'));

    try {
      const n = JSON.parse(load('d8advisr_notifications', '{}'));
      setNotif(prev => ({ ...prev, ...n }));
      const p = JSON.parse(load('d8advisr_privacy', '{}'));
      setPrivacy(prev => ({ ...prev, ...p }));
      const pm = localStorage.getItem('d8advisr_payment');
      if (pm) setPayment(JSON.parse(pm));
    } catch { /* ignore */ }
  }, []);

  function saveName(first: string, last: string) {
    const full = [first, last].filter(Boolean).join(' ');
    localStorage.setItem('d8advisr_name', full || 'Alex Johnson');
  }

  function saveNotif(updates: Partial<NotifSettings>) {
    const next = { ...notif, ...updates };
    setNotif(next);
    localStorage.setItem('d8advisr_notifications', JSON.stringify(next));
  }

  function savePrivacy(updates: Partial<PrivacySettings>) {
    const next = { ...privacy, ...updates };
    setPrivacy(next);
    localStorage.setItem('d8advisr_privacy', JSON.stringify(next));
  }

  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Alex Johnson';
  const displayDob = dob
    ? new Date(dob).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  const THEMES: { id: 'light' | 'dark' | 'system'; label: string; icon: React.ReactNode }[] = [
    { id: 'light',  label: 'Light',  icon: <Sun size={14} />    },
    { id: 'dark',   label: 'Dark',   icon: <Moon size={14} />   },
    { id: 'system', label: 'Auto',   icon: <Monitor size={14} /> },
  ];

  const VISIBILITY: { id: PrivacySettings['visibility']; label: string }[] = [
    { id: 'private', label: 'Private'  },
    { id: 'friends', label: 'Friends'  },
    { id: 'public',  label: 'Public'   },
  ];

  const content = (
    <div className={cn(
      'flex flex-col gap-5',
      isDesktop ? 'max-w-2xl mx-auto px-10 py-8' : 'px-5 py-6',
    )}>

      {/* ── Personal Info ─────────────────────────────────────── */}
      <Section title="Personal Info">
        <Row
          icon={<User size={16} />}
          label="First Name"
          value={firstName || 'Add your first name'}
          onClick={() => setEditing({
            field: 'firstName', title: 'First Name', value: firstName,
            placeholder: 'e.g. Alex',
            onSave: v => {
              setFirstName(v);
              saveName(v, lastName);
            },
          })}
        />
        <Row
          icon={<User size={16} />}
          label="Last Name"
          value={lastName || 'Add your last name'}
          onClick={() => setEditing({
            field: 'lastName', title: 'Last Name', value: lastName,
            placeholder: 'e.g. Johnson',
            onSave: v => {
              setLastName(v);
              saveName(firstName, v);
            },
          })}
        />
        <Row
          icon={<AtSign size={16} />}
          label="Display Name"
          value={handle ? `@${handle}` : 'Choose a handle'}
          onClick={() => setEditing({
            field: 'handle', title: 'Display Name', value: handle,
            placeholder: 'e.g. alexj',
            onSave: v => {
              const clean = v.replace(/^@/, '').replace(/\s+/g, '').toLowerCase();
              setHandle(clean);
              localStorage.setItem('d8advisr_handle', clean);
            },
          })}
        />
        <Row
          icon={<Phone size={16} />}
          label="Phone Number"
          value={phone || 'Add a phone number'}
          onClick={() => setEditing({
            field: 'phone', title: 'Phone Number', value: phone,
            placeholder: '+234 801 234 5678',
            type: 'tel',
            onSave: v => {
              setPhone(v);
              localStorage.setItem('d8advisr_phone', v);
            },
          })}
        />
        <Row
          icon={<Mail size={16} />}
          label="Email Address"
          value={email || 'Add your email'}
          onClick={() => setEditing({
            field: 'email', title: 'Email Address', value: email,
            placeholder: 'e.g. alex@example.com',
            type: 'email',
            onSave: v => {
              setEmail(v.trim().toLowerCase());
              localStorage.setItem('d8advisr_email', v.trim().toLowerCase());
            },
          })}
        />
        <Row
          icon={<Calendar size={16} />}
          label="Date of Birth"
          value={displayDob || 'Add your birthday'}
          onClick={() => setEditing({
            field: 'dob', title: 'Date of Birth', value: dob,
            placeholder: '',
            type: 'date',
            onSave: v => {
              setDob(v);
              localStorage.setItem('d8advisr_dob', v);
            },
          })}
          border={false}
        />
      </Section>

      {/* ── Location ──────────────────────────────────────────── */}
      <Section title="Location">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="font-semibold text-foreground text-[14px] mb-3">City</p>
          <div className="flex gap-2 flex-wrap">
            {CITIES.map(c => (
              <button
                key={c.id}
                disabled={!c.live}
                onClick={() => {
                  if (c.live) {
                    setCity(c.id);
                    localStorage.setItem('d8advisr_city', c.id);
                    setNeighborhood('');
                    localStorage.removeItem('d8advisr_neighborhood');
                  }
                }}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 rounded-full font-semibold text-[13px] border transition-all',
                  !c.live && 'opacity-40 cursor-not-allowed',
                  city === c.id
                    ? 'bg-primary text-white border-primary'
                    : 'bg-gray-100 text-gray-600 border-gray-100 hover:border-gray-300',
                )}
              >
                <span>{c.flag}</span> {c.name}
                {!c.live && <span className="text-[10px] font-medium opacity-70">Soon</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="px-5 py-4">
          <p className="font-semibold text-foreground text-[14px] mb-3 flex items-center gap-1.5">
            <MapPin size={13} className="text-muted-foreground" /> Neighbourhood
          </p>
          <div className="flex gap-2 flex-wrap">
            {(NEIGHBORHOODS_BY_CITY[city] ?? NEIGHBORHOODS_BY_CITY.lagos).map(n => (
              <button
                key={n}
                onClick={() => {
                  const next = neighborhood === n ? '' : n;
                  setNeighborhood(next);
                  localStorage.setItem('d8advisr_neighborhood', next);
                }}
                className={cn(
                  'px-3.5 py-2 rounded-full font-semibold text-[12px] border transition-all',
                  neighborhood === n
                    ? 'bg-primary text-white border-primary'
                    : 'bg-gray-100 text-gray-600 border-gray-100 hover:border-gray-300',
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Preferences & Stash ───────────────────────────────── */}
      <Section title="Planning">
        <Row
          icon={<Heart size={16} className="text-primary" />}
          label="My Preferences"
          value="Vibes, plan types & more"
          onClick={() => setLocation('/profile/preferences')}
        />
        <Row
          icon={<Wallet size={16} className="text-[#00C851]" />}
          label="Stash & Budget"
          value="Sinking fund & spending goals"
          onClick={() => setLocation('/profile/budget')}
        />
      </Section>

      {/* ── Payment Method ────────────────────────────────────── */}
      <Section title="Payment Method">
        {payment ? (
          <>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-4">
              <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                <span className="text-base">💳</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-[14px]">{payment.label} •••• {payment.last4}</p>
                <p className="text-[12px] text-[#00C851] font-bold mt-0.5">✓ Stash linked — Hidden Gems unlocked</p>
              </div>
            </div>
            <button
              onClick={() => {
                setPayment(null);
                localStorage.removeItem('d8advisr_payment');
                localStorage.removeItem('d8advisr_payment_linked');
              }}
              className="w-full px-5 py-3.5 text-left text-[13px] font-semibold text-red-500 hover:bg-red-50 transition-colors"
            >
              Remove payment method
            </button>
          </>
        ) : (
          <div className="px-5 py-5">
            <div className="bg-gradient-to-br from-purple-50 to-purple-100/60 border border-purple-200 rounded-2xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">💎</span>
                <div>
                  <p className="font-bold text-purple-900 text-[14px] leading-tight">Unlock Hidden Gems</p>
                  <p className="text-[12px] text-purple-700 mt-1 leading-relaxed">
                    Link a payment method to your Stash and we'll reveal exclusive, off-the-radar venues — personally verified and not listed anywhere else.
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowPaySheet(true)}
              className="w-full bg-primary text-white py-3.5 rounded-xl font-bold text-[14px] shadow-md shadow-primary/25 hover:bg-primary/90 transition-colors"
            >
              Link card or bank account
            </button>
          </div>
        )}
      </Section>

      {/* ── Notifications ─────────────────────────────────────── */}
      <Section title="Notifications">
        <Row
          icon={<Bell size={16} />}
          label="Plan Reminders"
          value="Get reminded before a saved plan"
          right={<Toggle on={notif.planReminders} onChange={v => saveNotif({ planReminders: v })} />}
        />
        <Row
          icon={<MapPin size={16} />}
          label="New Venues Near Me"
          value="When a new verified spot opens"
          right={<Toggle on={notif.venueAlerts} onChange={v => saveNotif({ venueAlerts: v })} />}
        />
        <Row
          icon={<User size={16} />}
          label="Group Invites"
          value="When someone adds you to a plan"
          right={<Toggle on={notif.groupInvites} onChange={v => saveNotif({ groupInvites: v })} />}
        />
        <Row
          icon={<Wallet size={16} />}
          label="Stash Reminders"
          value="Monthly saving nudges"
          right={<Toggle on={notif.stashReminders} onChange={v => saveNotif({ stashReminders: v })} />}
        />
        <Row
          icon={<Bell size={16} />}
          label="News & Promotions"
          value="Deals from our venue partners"
          right={<Toggle on={notif.promos} onChange={v => saveNotif({ promos: v })} />}
        />
      </Section>

      {/* ── Privacy ───────────────────────────────────────────── */}
      <Section title="Privacy">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="font-semibold text-foreground text-[14px] mb-1">Profile Visibility</p>
          <p className="text-[12px] text-muted-foreground mb-3">Who can search for and view your profile</p>
          <div className="flex gap-2">
            {VISIBILITY.map(v => (
              <button
                key={v.id}
                onClick={() => savePrivacy({ visibility: v.id })}
                className={cn(
                  'flex-1 py-2.5 rounded-xl font-semibold text-[13px] border transition-all',
                  privacy.visibility === v.id
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-gray-100 text-gray-600 border-gray-100 hover:border-gray-300',
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
        <Row
          icon={<Eye size={16} />}
          label="Share Plan History"
          value="Show completed plans on your profile"
          right={<Toggle on={privacy.sharePlans} onChange={v => savePrivacy({ sharePlans: v })} />}
        />
        <Row
          icon={<Eye size={16} />}
          label="Online Status"
          value="Let plan partners see when you're active"
          right={<Toggle on={privacy.onlineStatus} onChange={v => savePrivacy({ onlineStatus: v })} />}
        />
      </Section>

      {/* ── App ───────────────────────────────────────────────── */}
      <Section title="App">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="font-semibold text-foreground text-[14px] mb-3 flex items-center gap-1.5">
            <Palette size={13} className="text-muted-foreground" /> Theme
          </p>
          <div className="flex gap-2">
            {THEMES.map(t => (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id);
                  localStorage.setItem('d8advisr_theme', t.id);
                }}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-semibold text-[13px] border transition-all',
                  theme === t.id
                    ? 'bg-foreground text-white border-foreground shadow-sm'
                    : 'bg-gray-100 text-gray-600 border-gray-100 hover:border-gray-300',
                )}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="font-semibold text-foreground text-[14px] mb-3">Distance Unit</p>
          <div className="flex gap-2 w-40">
            {(['km', 'mi'] as const).map(u => (
              <button
                key={u}
                onClick={() => {
                  setDistUnit(u);
                  localStorage.setItem('d8advisr_dist', u);
                }}
                className={cn(
                  'flex-1 py-2.5 rounded-xl font-bold text-[13px] border transition-all uppercase',
                  distUnit === u
                    ? 'bg-foreground text-white border-foreground'
                    : 'bg-gray-100 text-gray-600 border-gray-100',
                )}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
        {(() => {
          const curr = CURRENCY_BY_CITY[city] ?? CURRENCY_BY_CITY.lagos;
          return (
            <div className="px-5 py-4 flex items-center gap-4">
              <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                <span className="font-bold text-sm">{curr.symbol}</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground text-[14px]">Currency</p>
                <p className="text-[12px] text-muted-foreground mt-0.5">{curr.name} — {curr.market}</p>
              </div>
              <span className="text-[12px] font-bold text-muted-foreground bg-gray-100 px-2.5 py-1 rounded-full">Auto</span>
            </div>
          );
        })()}
      </Section>

      {/* ── Account ───────────────────────────────────────────── */}
      <Section title="Account">
        <Row
          icon={<Lock size={16} />}
          label="Change Password"
          onClick={() => {}}
        />
        <Row
          icon={<LogOut size={16} className="text-primary" />}
          label="Sign Out"
          onClick={() => setLocation('/')}
        />
        <Row
          icon={<Trash2 size={16} className="text-red-500" />}
          label="Delete Account"
          value="This action is permanent and cannot be undone"
          onClick={() => {}}
          border={false}
        />
      </Section>

      <p className="text-center text-[11px] text-muted-foreground font-medium pb-2">
        D8Advisr · v1.0
      </p>
    </div>
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col relative bg-[#F7F7F7]">
      {/* Header */}
      {isDesktop ? (
        <div className="bg-white border-b border-gray-100 px-10 py-5 sticky top-0 z-10 shadow-sm">
          <h1 className="text-[22px] font-bold text-foreground">Settings</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {fullName} {handle && <span className="text-primary">@{handle}</span>}
          </p>
        </div>
      ) : (
        <div className="bg-white px-5 pt-14 pb-4 sticky top-0 z-10 shadow-sm border-b border-gray-100 flex items-center gap-4">
          <button
            onClick={() => setLocation('/profile')}
            className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-foreground"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-[18px] font-bold text-foreground leading-tight">Settings</h1>
            <p className="text-[12px] text-muted-foreground">
              {fullName} {handle && <span className="text-primary">@{handle}</span>}
            </p>
          </div>
        </div>
      )}

      {/* Scrollable body */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
        {content}
      </div>

      {!isDesktop && <BottomNav active="profile" />}

      {/* Edit sheet */}
      {editing && (
        <EditSheet
          title={editing.title}
          value={editing.value}
          placeholder={editing.placeholder}
          type={editing.type}
          onSave={editing.onSave}
          onClose={() => setEditing(null)}
        />
      )}

      {/* Payment link sheet */}
      {showPaySheet && (
        <PaymentSheet
          onSave={pm => {
            setPayment(pm);
            localStorage.setItem('d8advisr_payment', JSON.stringify(pm));
            localStorage.setItem('d8advisr_payment_linked', 'true');
            setShowPaySheet(false);
          }}
          onClose={() => setShowPaySheet(false)}
        />
      )}
    </div>
  );
}

// ─── Payment Sheet ─────────────────────────────────────────────────────────────
function PaymentSheet({ onSave, onClose }: {
  onSave: (pm: PaymentMethod) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'card' | 'bank'>('card');
  const [cardNum, setCardNum]   = useState('');
  const [expiry, setExpiry]     = useState('');
  const [name, setName]         = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNum, setAccountNum] = useState('');

  function formatCard(v: string) {
    return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  }
  function formatExpiry(v: string) {
    const d = v.replace(/\D/g, '').slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  }

  const canSave = tab === 'card'
    ? cardNum.replace(/\s/g, '').length === 16 && expiry.length === 5 && name.trim()
    : bankName.trim() && accountNum.replace(/\D/g, '').length >= 10;

  function handleSave() {
    if (tab === 'card') {
      onSave({ type: 'card', last4: cardNum.replace(/\s/g, '').slice(-4), label: 'Visa' });
    } else {
      onSave({ type: 'bank', last4: accountNum.replace(/\D/g, '').slice(-4), label: bankName });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl px-6 pt-6 pb-10 shadow-2xl animate-in slide-in-from-bottom-full duration-300 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[20px] font-bold text-foreground">Link Payment Method</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X size={16} />
          </button>
        </div>

        {/* Gem unlock message */}
        <div className="flex items-center gap-2 mb-5 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
          <span className="text-lg">💎</span>
          <p className="text-[12px] text-purple-700 font-semibold leading-snug">
            Your Stash enables auto-saving — and unlocks Hidden Gem venues only visible to linked members.
          </p>
        </div>

        {/* Tab toggle */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
          <button
            onClick={() => setTab('card')}
            className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-[13px] transition-all',
              tab === 'card' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground')}
          >
            <CreditCard size={14} /> Card
          </button>
          <button
            onClick={() => setTab('bank')}
            className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-[13px] transition-all',
              tab === 'bank' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground')}
          >
            🏦 Bank Account
          </button>
        </div>

        {tab === 'card' ? (
          <div className="flex flex-col gap-4 mb-6">
            <div>
              <label className="text-[12px] font-bold text-muted-foreground mb-1.5 block">CARD NUMBER</label>
              <input
                type="text" inputMode="numeric" placeholder="0000 0000 0000 0000"
                value={cardNum}
                onChange={e => setCardNum(formatCard(e.target.value))}
                className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-foreground font-mono text-[15px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[12px] font-bold text-muted-foreground mb-1.5 block">EXPIRY</label>
                <input
                  type="text" inputMode="numeric" placeholder="MM/YY"
                  value={expiry}
                  onChange={e => setExpiry(formatExpiry(e.target.value))}
                  className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-foreground font-mono text-[15px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            <div>
              <label className="text-[12px] font-bold text-muted-foreground mb-1.5 block">NAME ON CARD</label>
              <input
                type="text" placeholder="Alex Johnson"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-foreground text-[15px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 mb-6">
            <div>
              <label className="text-[12px] font-bold text-muted-foreground mb-1.5 block">BANK NAME</label>
              <input
                type="text" placeholder="e.g. GTBank, First Bank, Zanaco..."
                value={bankName}
                onChange={e => setBankName(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-foreground text-[15px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="text-[12px] font-bold text-muted-foreground mb-1.5 block">ACCOUNT NUMBER</label>
              <input
                type="text" inputMode="numeric" placeholder="10-digit account number"
                value={accountNum}
                onChange={e => setAccountNum(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-foreground font-mono text-[15px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={!canSave}
          className={cn(
            'w-full py-4 rounded-xl font-bold text-[15px] transition-all',
            canSave
              ? 'bg-primary text-white shadow-lg shadow-primary/30'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed',
          )}
        >
          Link & Unlock Hidden Gems 💎
        </button>
        <p className="text-center text-[11px] text-muted-foreground mt-3">
          Your payment details are encrypted and never stored on our servers.
        </p>
      </div>
    </div>
  );
}
