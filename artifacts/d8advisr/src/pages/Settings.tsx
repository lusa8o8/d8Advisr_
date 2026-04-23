import { useState, useEffect } from 'react';
import { useLocation } from "wouter";
import {
  ArrowLeft, ChevronRight, X, Check,
  User, Phone, Calendar, AtSign,
  MapPin, Heart, Wallet, Bell,
  Lock, Palette, LogOut, Trash2,
  Eye, Sun, Moon, Monitor,
} from 'lucide-react';
import { TopBar, BottomNav, cn } from "@/components/SharedUI";
import { useIsDesktop } from "@/hooks/useIsDesktop";

// ─── Types ───────────────────────────────────────────────────────────────────
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
const NEIGHBORHOODS = [
  'Victoria Island', 'Lekki Phase 1', 'Ikoyi', 'Surulere',
  'Yaba', 'Ikeja', 'Ajah', 'Gbagada',
];
const CITIES = [
  { id: 'lagos',  name: 'Lagos',  flag: '🇳🇬', live: true  },
  { id: 'london', name: 'London', flag: '🇬🇧', live: false },
  { id: 'dubai',  name: 'Dubai',  flag: '🇦🇪', live: false },
];

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
            {NEIGHBORHOODS.map(n => (
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
        <div className="px-5 py-4 flex items-center gap-4">
          <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
            <span className="font-bold text-sm">₦</span>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground text-[14px]">Currency</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">Nigerian Naira (₦) — Lagos market</p>
          </div>
          <span className="text-[12px] font-bold text-muted-foreground bg-gray-100 px-2.5 py-1 rounded-full">Fixed</span>
        </div>
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
        D8Advisr · v1.0 · Made for Lagos
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
    </div>
  );
}
