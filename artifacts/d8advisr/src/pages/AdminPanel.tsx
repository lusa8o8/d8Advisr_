import { useState } from 'react';
import { useLocation } from 'wouter';
import {
  ArrowLeft, ChevronRight, CheckCircle, AlertCircle, XCircle,
  ClipboardList, Search, Shield, Star, Eye, Edit3, Save,
  ChevronDown, Clock, RotateCcw, Plus, Lock
} from 'lucide-react';
import { cn } from '@/components/SharedUI';

// ─── Types ────────────────────────────────────────────────────────────────────

type FieldMeta = { value: string; source: string; verifiedAt: string; confidence: 'high' | 'medium' | 'low' | 'live' };
type Tier = 'Verified' | 'D8 Approved' | 'Hidden Gem';
type Health = 'green' | 'amber' | 'red';

interface ChangeEntry {
  date: string; field: string; oldValue: string; newValue: string; by: string; reason: string;
}

interface Venue {
  id: string;
  name: string;
  category: string;
  city: string;
  tier: Tier;
  health: Health;
  nextInspectionDue: string;
  listing: Record<string, FieldMeta>;
  experience: Record<string, FieldMeta>;
  changeLog: ChangeEntry[];
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const SEED: Venue[] = [
  {
    id: 'v1',
    name: 'Lumina Restaurant & Bar',
    category: 'Romantic Dining',
    city: 'Lagos',
    tier: 'D8 Approved',
    health: 'green',
    nextInspectionDue: '2025-05-01',
    listing: {
      'Address':      { value: '123 Main St, Downtown', source: 'Manual — D8 Team', verifiedAt: '2024-11-01', confidence: 'high' },
      'Hours':        { value: 'Mon–Sat 6 PM – 11 PM',  source: 'Manual — D8 Team', verifiedAt: '2024-11-01', confidence: 'high' },
      'Price Range':  { value: '$65/pp',                source: 'Manual — D8 Team', verifiedAt: '2024-11-01', confidence: 'high' },
      'Phone':        { value: '+234 801 234 5678',     source: 'Manual — D8 Team', verifiedAt: '2024-11-01', confidence: 'high' },
      'Website':      { value: 'luminarestaurant.com',  source: 'Manual — D8 Team', verifiedAt: '2024-11-01', confidence: 'high' },
      'Booking Link': { value: 'luminarestaurant.com/book', source: 'Manual — D8 Team', verifiedAt: '2024-11-01', confidence: 'high' },
    },
    experience: {
      'Atmosphere Score':    { value: '4.9 / 5', source: 'Inspection', verifiedAt: '2024-11-01', confidence: 'high' },
      'Lighting Score':      { value: '4.9 / 5', source: 'Inspection', verifiedAt: '2024-11-01', confidence: 'high' },
      'Noise Level':         { value: 'Low–Moderate', source: 'Inspection', verifiedAt: '2024-11-01', confidence: 'high' },
      'Occasion Fit':        { value: 'First Date, Anniversary, Special Occasion', source: 'Inspection', verifiedAt: '2024-11-01', confidence: 'high' },
      'Inspector Notes':     { value: 'Candlelit, rooftop view, staff discreet. Optimal on weeknights.', source: 'Inspection', verifiedAt: '2024-11-01', confidence: 'high' },
    },
    changeLog: [
      { date: '2024-11-01', field: 'Price Range', oldValue: '$55/pp', newValue: '$65/pp', by: 'D8 Team', reason: 'Updated after in-person inspection' },
      { date: '2024-11-01', field: 'Tier', oldValue: 'Verified', newValue: 'D8 Approved', by: 'D8 Team', reason: 'Passed full inspection — all scores ≥ 4.5' },
    ],
  },
  {
    id: 'v2',
    name: 'The Velvet Lounge',
    category: 'Cocktail Bar',
    city: 'Lagos',
    tier: 'Verified',
    health: 'amber',
    nextInspectionDue: '2025-02-15',
    listing: {
      'Address':      { value: '7 Harbour Rd, Victoria Island', source: 'Manual — D8 Team', verifiedAt: '2024-08-15', confidence: 'high' },
      'Hours':        { value: 'Wed–Sun 7 PM – 1 AM',           source: 'Manual — D8 Team', verifiedAt: '2024-08-15', confidence: 'medium' },
      'Price Range':  { value: '$30/pp',                        source: 'Manual — D8 Team', verifiedAt: '2024-08-15', confidence: 'medium' },
      'Phone':        { value: '+234 802 345 6789',             source: 'Manual — D8 Team', verifiedAt: '2024-08-15', confidence: 'high' },
      'Website':      { value: 'velvetlLagos.com',              source: 'Manual — D8 Team', verifiedAt: '2024-08-15', confidence: 'high' },
      'Booking Link': { value: '—',                             source: 'Manual — D8 Team', verifiedAt: '2024-08-15', confidence: 'low' },
    },
    experience: {
      'Atmosphere Score':    { value: '4.3 / 5', source: 'Inspection', verifiedAt: '2024-08-15', confidence: 'medium' },
      'Lighting Score':      { value: '4.5 / 5', source: 'Inspection', verifiedAt: '2024-08-15', confidence: 'medium' },
      'Noise Level':         { value: 'Moderate', source: 'Inspection', verifiedAt: '2024-08-15', confidence: 'medium' },
      'Occasion Fit':        { value: 'Date Night, Group Pre-Dinner', source: 'Inspection', verifiedAt: '2024-08-15', confidence: 'medium' },
      'Inspector Notes':     { value: 'Great cocktails. Music gets loud after 10 PM — better earlier.', source: 'Inspection', verifiedAt: '2024-08-15', confidence: 'medium' },
    },
    changeLog: [
      { date: '2024-08-15', field: 'Venue Added', oldValue: '—', newValue: 'Verified', by: 'D8 Team', reason: 'Initial listing after site visit' },
    ],
  },
  {
    id: 'v3',
    name: 'Skyline Rooftop',
    category: 'Rooftop Bar',
    city: 'Lagos',
    tier: 'Hidden Gem',
    health: 'green',
    nextInspectionDue: '2025-10-20',
    listing: {
      'Address':      { value: '14th Floor, Eko Tower, VI', source: 'Manual — D8 Team', verifiedAt: '2024-10-20', confidence: 'high' },
      'Hours':        { value: 'Fri–Sun 6 PM – 12 AM',       source: 'Manual — D8 Team', verifiedAt: '2024-10-20', confidence: 'high' },
      'Price Range':  { value: '$45/pp',                     source: 'Manual — D8 Team', verifiedAt: '2024-10-20', confidence: 'high' },
      'Phone':        { value: 'By referral only',           source: 'Manual — D8 Team', verifiedAt: '2024-10-20', confidence: 'high' },
      'Website':      { value: 'Not public',                 source: 'Manual — D8 Team', verifiedAt: '2024-10-20', confidence: 'high' },
      'Booking Link': { value: 'Private — D8 referral',      source: 'Manual — D8 Team', verifiedAt: '2024-10-20', confidence: 'high' },
    },
    experience: {
      'Atmosphere Score':    { value: '5.0 / 5', source: 'Inspection', verifiedAt: '2024-10-20', confidence: 'high' },
      'Lighting Score':      { value: '4.9 / 5', source: 'Inspection', verifiedAt: '2024-10-20', confidence: 'high' },
      'Noise Level':         { value: 'Low',     source: 'Inspection', verifiedAt: '2024-10-20', confidence: 'high' },
      'Occasion Fit':        { value: 'Anniversary, Proposal, Special Milestone', source: 'Inspection', verifiedAt: '2024-10-20', confidence: 'high' },
      'Inspector Notes':     { value: '360° Lagos skyline. No street presence. Operator briefed on D8 referral process.', source: 'Inspection', verifiedAt: '2024-10-20', confidence: 'high' },
    },
    changeLog: [
      { date: '2024-10-20', field: 'Tier', oldValue: 'D8 Approved', newValue: 'Hidden Gem', by: 'D8 Team', reason: 'Passed Hidden Gem criteria — operator consented to soft exclusivity' },
    ],
  },
  {
    id: 'v4',
    name: 'Cinemax Boutique',
    category: 'Cinema',
    city: 'Lagos',
    tier: 'Verified',
    health: 'red',
    nextInspectionDue: '2024-09-10',
    listing: {
      'Address':      { value: 'Plot 5 Admiralty Way, Lekki', source: 'Manual — D8 Team', verifiedAt: '2024-03-10', confidence: 'low' },
      'Hours':        { value: 'Daily 2 PM – 10 PM',           source: 'Manual — D8 Team', verifiedAt: '2024-03-10', confidence: 'low' },
      'Price Range':  { value: '$20/pp',                       source: 'Manual — D8 Team', verifiedAt: '2024-03-10', confidence: 'low' },
      'Phone':        { value: '+234 803 456 7890',            source: 'Manual — D8 Team', verifiedAt: '2024-03-10', confidence: 'low' },
      'Website':      { value: 'cinemaxlekki.com',             source: 'Manual — D8 Team', verifiedAt: '2024-03-10', confidence: 'low' },
      'Booking Link': { value: 'cinemaxlekki.com/tickets',     source: 'Manual — D8 Team', verifiedAt: '2024-03-10', confidence: 'low' },
    },
    experience: {
      'Atmosphere Score':    { value: '4.0 / 5', source: 'Inspection', verifiedAt: '2024-03-10', confidence: 'low' },
      'Lighting Score':      { value: '—',       source: 'Inspection', verifiedAt: '2024-03-10', confidence: 'low' },
      'Noise Level':         { value: 'Controlled', source: 'Inspection', verifiedAt: '2024-03-10', confidence: 'low' },
      'Occasion Fit':        { value: 'Date Night, Casual', source: 'Inspection', verifiedAt: '2024-03-10', confidence: 'low' },
      'Inspector Notes':     { value: 'Overdue for re-inspection. Ownership may have changed.', source: 'Inspection', verifiedAt: '2024-03-10', confidence: 'low' },
    },
    changeLog: [
      { date: '2024-03-10', field: 'Venue Added', oldValue: '—', newValue: 'Verified', by: 'D8 Team', reason: 'Initial listing' },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIER_STYLE: Record<Tier, string> = {
  'Verified':   'bg-blue-50 text-blue-700 border-blue-200',
  'D8 Approved':'bg-amber-50 text-amber-700 border-amber-200',
  'Hidden Gem': 'bg-purple-50 text-purple-700 border-purple-200',
};

const TIER_DOT: Record<Tier, string> = {
  'Verified':   'bg-blue-500',
  'D8 Approved':'bg-amber-500',
  'Hidden Gem': 'bg-purple-500',
};

const HEALTH_ICON = {
  green: <CheckCircle size={16} className="text-[#00C851]" />,
  amber: <AlertCircle size={16} className="text-[#FF9500]" />,
  red:   <XCircle size={16} className="text-[#FF5A5F]" />,
};

const HEALTH_LABEL: Record<Health, string> = {
  green: 'Data current',
  amber: 'Re-verify soon',
  red:   'Overdue — action required',
};

const CONFIDENCE_STYLE: Record<string, string> = {
  high:   'bg-[#E8FFF0] text-[#00C851]',
  medium: 'bg-amber-50 text-amber-600',
  low:    'bg-red-50 text-[#FF5A5F]',
  live:   'bg-blue-50 text-blue-600',
};

const TIERS: Tier[] = ['Verified', 'D8 Approved', 'Hidden Gem'];

type AdminView = 'list' | 'detail' | 'tracker';

// ─── Main component ───────────────────────────────────────────────────────────

export function AdminPanel() {
  const [, setLocation] = useLocation();
  const [view, setView]       = useState<AdminView>('list');
  const [venues, setVenues]   = useState<Venue[]>(SEED);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [navTab, setNavTab]   = useState<'venues' | 'tracker'>('venues');

  // Filter state
  const [filterTier, setFilterTier]     = useState<string>('All');
  const [filterHealth, setFilterHealth] = useState<string>('All');
  const [search, setSearch]             = useState('');

  // Detail view state
  const [editField, setEditField]   = useState<string | null>(null);
  const [editValue, setEditValue]   = useState('');
  const [showTierMenu, setShowTierMenu] = useState(false);
  const [tierReason, setTierReason] = useState('');
  const [pendingTier, setPendingTier] = useState<Tier | null>(null);
  const [activeSection, setActiveSection] = useState<'listing' | 'experience' | 'log'>('listing');

  const selectedVenue = venues.find(v => v.id === selectedId) ?? null;

  // ── Filtered list ──────────────────────────────────────────────────────────

  const filtered = venues.filter(v => {
    if (filterTier !== 'All' && v.tier !== filterTier) return false;
    if (filterHealth !== 'All' && v.health !== filterHealth) return false;
    if (search && !v.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // ── Actions ───────────────────────────────────────────────────────────────

  const openDetail = (id: string) => { setSelectedId(id); setView('detail'); setActiveSection('listing'); };

  const saveField = (section: 'listing' | 'experience', key: string) => {
    if (!selectedVenue || !editValue.trim()) return;
    const old = selectedVenue[section][key]?.value ?? '';
    const entry: ChangeEntry = {
      date: new Date().toISOString().split('T')[0],
      field: key, oldValue: old, newValue: editValue,
      by: 'D8 Team', reason: 'Manual update via Admin Panel',
    };
    setVenues(vs => vs.map(v => v.id === selectedVenue.id ? {
      ...v,
      [section]: { ...v[section], [key]: { ...v[section][key], value: editValue, verifiedAt: new Date().toISOString().split('T')[0] } },
      changeLog: [entry, ...v.changeLog],
    } : v));
    setEditField(null); setEditValue('');
  };

  const confirmTierChange = () => {
    if (!selectedVenue || !pendingTier || !tierReason.trim()) return;
    const entry: ChangeEntry = {
      date: new Date().toISOString().split('T')[0],
      field: 'Tier', oldValue: selectedVenue.tier, newValue: pendingTier,
      by: 'D8 Team', reason: tierReason,
    };
    setVenues(vs => vs.map(v => v.id === selectedVenue.id ? { ...v, tier: pendingTier!, changeLog: [entry, ...v.changeLog] } : v));
    setPendingTier(null); setTierReason(''); setShowTierMenu(false);
  };

  const markVerified = (id: string) => {
    const today = new Date().toISOString().split('T')[0];
    const due   = new Date(); due.setMonth(due.getMonth() + 6);
    const dueStr = due.toISOString().split('T')[0];
    const entry: ChangeEntry = {
      date: today, field: 'Verification', oldValue: 'Overdue', newValue: 'Current',
      by: 'D8 Team', reason: 'Re-inspection completed',
    };
    setVenues(vs => vs.map(v => v.id === id ? { ...v, health: 'green', nextInspectionDue: dueStr, changeLog: [entry, ...v.changeLog] } : v));
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#F7F7F7]">

      {/* TOP BAR */}
      <div className="bg-[#141414] px-5 pt-12 pb-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => view === 'list' || view === 'tracker' ? setLocation('/home') : setView('list')}
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-95 transition-transform">
            <ArrowLeft size={18} />
          </button>
          <div>
            <p className="text-white font-black text-[15px] leading-tight tracking-tight">
              <span className="text-[#FF5A5F]">D8</span>Advisr Admin
            </p>
            <p className="text-white/40 text-[11px] font-medium">
              {view === 'detail' && selectedVenue ? selectedVenue.name : 'Internal — Team Only'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#00C851] animate-pulse" />
          <span className="text-white/50 text-[11px] font-semibold">Live</span>
        </div>
      </div>

      {/* NAV TABS — only on list/tracker */}
      {view !== 'detail' && (
        <div className="bg-[#141414] px-5 pb-4 flex gap-1 shrink-0">
          {(['venues', 'tracker'] as const).map(t => (
            <button key={t} onClick={() => { setNavTab(t); setView(t === 'venues' ? 'list' : 'tracker'); }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-bold transition-all",
                navTab === t ? "bg-[#FF5A5F] text-white" : "text-white/50 hover:text-white/80"
              )}>
              {t === 'venues' ? <><ClipboardList size={13} /> Venues ({venues.length})</> : <><Clock size={13} /> Inspections</>}
            </button>
          ))}
        </div>
      )}

      {/* ── LIST VIEW ───────────────────────────────────────────────────────── */}
      {view === 'list' && (
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">

          {/* Search + filters */}
          <div className="px-4 pt-4 pb-3 flex flex-col gap-2.5 sticky top-0 bg-[#F7F7F7] z-10">
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search venues…"
                className="w-full pl-9 pr-4 py-3 rounded-xl bg-white border border-gray-200 text-[14px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#FF5A5F] focus:ring-1 focus:ring-[#FF5A5F] transition-all"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
              {['All', ...TIERS].map(t => (
                <button key={t} onClick={() => setFilterTier(t)}
                  className={cn("shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-bold border transition-all",
                    filterTier === t ? "bg-[#FF5A5F] text-white border-[#FF5A5F]" : "bg-white text-gray-600 border-gray-200")}>
                  {t}
                </button>
              ))}
              {(['All', 'green', 'amber', 'red'] as const).map(h => (
                <button key={h} onClick={() => setFilterHealth(h)}
                  className={cn("shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-bold border transition-all",
                    filterHealth === h ? "bg-[#141414] text-white border-[#141414]" : "bg-white text-gray-600 border-gray-200")}>
                  {h === 'All' ? '● All health' : h === 'green' ? '🟢' : h === 'amber' ? '🟡' : '🔴'}
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 pb-6 flex flex-col gap-3">
            {filtered.length === 0 && (
              <div className="text-center text-muted-foreground text-[14px] py-12">No venues match your filters.</div>
            )}
            {filtered.map(v => (
              <button key={v.id} onClick={() => openDetail(v.id)}
                className="w-full bg-white rounded-2xl border border-gray-200 p-4 text-left active:scale-[0.98] transition-transform shadow-sm">
                <div className="flex items-start justify-between mb-2.5">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-bold text-gray-900 text-[15px] leading-tight truncate">{v.name}</p>
                    <p className="text-[12px] text-gray-500 mt-0.5">{v.category} · {v.city}</p>
                  </div>
                  <div className={cn("shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold", TIER_STYLE[v.tier])}>
                    <div className={cn("w-1.5 h-1.5 rounded-full", TIER_DOT[v.tier])} />
                    {v.tier}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {HEALTH_ICON[v.health]}
                    <span className={cn("text-[11px] font-semibold",
                      v.health === 'green' ? 'text-[#00C851]' : v.health === 'amber' ? 'text-[#FF9500]' : 'text-[#FF5A5F]')}>
                      {HEALTH_LABEL[v.health]}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-400">
                    <Clock size={11} />
                    <span className="text-[10px] font-medium">Due {v.nextInspectionDue}</span>
                    <ChevronRight size={14} className="ml-1" />
                  </div>
                </div>
              </button>
            ))}

            {/* Add venue stub */}
            <button className="w-full bg-white rounded-2xl border-2 border-dashed border-gray-200 p-5 flex items-center justify-center gap-2 text-gray-400 font-bold text-[14px] active:scale-[0.98] transition-transform hover:border-[#FF5A5F] hover:text-[#FF5A5F]">
              <Plus size={17} /> Add New Venue
            </button>
          </div>
        </div>
      )}

      {/* ── DETAIL VIEW ─────────────────────────────────────────────────────── */}
      {view === 'detail' && selectedVenue && (
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">

          {/* Venue header */}
          <div className="bg-white border-b border-gray-100 px-5 py-4">
            <div className="flex items-center justify-between mb-1">
              <span className={cn("text-[11px] font-bold px-3 py-1 rounded-full border", TIER_STYLE[selectedVenue.tier])}>
                {selectedVenue.tier}
              </span>
              <div className="flex items-center gap-1.5">
                {HEALTH_ICON[selectedVenue.health]}
                <span className={cn("text-[11px] font-semibold",
                  selectedVenue.health === 'green' ? 'text-[#00C851]' : selectedVenue.health === 'amber' ? 'text-[#FF9500]' : 'text-[#FF5A5F]')}>
                  {HEALTH_LABEL[selectedVenue.health]}
                </span>
              </div>
            </div>
            <h2 className="font-black text-gray-900 text-[18px] leading-tight mt-2">{selectedVenue.name}</h2>
            <p className="text-[13px] text-gray-500 mt-0.5">{selectedVenue.category} · {selectedVenue.city}</p>
          </div>

          {/* Tier control */}
          <div className="mx-4 mt-4 bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shield size={15} className="text-[#FF5A5F]" />
                <span className="font-bold text-gray-900 text-[13px]">Tier Assignment</span>
              </div>
              <button onClick={() => setShowTierMenu(v => !v)}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-500 hover:text-gray-800 transition-colors">
                Change <ChevronDown size={14} className={cn("transition-transform", showTierMenu && "rotate-180")} />
              </button>
            </div>

            {showTierMenu ? (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex flex-col gap-2 mb-3">
                  {TIERS.map(t => (
                    <button key={t} onClick={() => setPendingTier(t)}
                      className={cn("flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all",
                        pendingTier === t ? "border-[#FF5A5F] bg-[#FFF0F1]" : "border-gray-200 hover:border-gray-300")}>
                      <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", TIER_DOT[t])} />
                      <span className={cn("text-[13px] font-bold", pendingTier === t ? "text-[#FF5A5F]" : "text-gray-700")}>{t}</span>
                    </button>
                  ))}
                </div>
                {pendingTier && (
                  <>
                    <textarea value={tierReason} onChange={e => setTierReason(e.target.value)}
                      placeholder="Reason for tier change (required)…"
                      rows={2}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[13px] text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#FF5A5F] resize-none mb-2.5" />
                    <button onClick={confirmTierChange} disabled={!tierReason.trim()}
                      className={cn("w-full py-2.5 rounded-xl font-bold text-[13px] transition-all",
                        tierReason.trim() ? "bg-[#FF5A5F] text-white active:scale-[0.98]" : "bg-gray-100 text-gray-400 cursor-not-allowed")}>
                      Confirm Tier Change
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className={cn("flex items-center gap-2.5 p-3 rounded-xl border", TIER_STYLE[selectedVenue.tier])}>
                <div className={cn("w-3 h-3 rounded-full shrink-0", TIER_DOT[selectedVenue.tier])} />
                <span className="font-bold text-[14px]">{selectedVenue.tier}</span>
              </div>
            )}
          </div>

          {/* Section tabs */}
          <div className="flex mx-4 mt-4 bg-white rounded-2xl border border-gray-200 p-1 shadow-sm">
            {(['listing', 'experience', 'log'] as const).map(s => (
              <button key={s} onClick={() => setActiveSection(s)}
                className={cn("flex-1 py-2 rounded-xl text-[12px] font-bold transition-all capitalize",
                  activeSection === s ? "bg-[#141414] text-white" : "text-gray-500 hover:text-gray-800")}>
                {s === 'listing' ? 'Listing' : s === 'experience' ? 'Experience' : 'Log'}
              </button>
            ))}
          </div>

          <div className="px-4 pt-3 pb-6">

            {/* LISTING DATA */}
            {activeSection === 'listing' && (
              <div className="flex flex-col gap-2.5 animate-in fade-in duration-200">
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <Edit3 size={13} className="text-gray-400" />
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Listing Data — Editable</p>
                </div>
                {Object.entries(selectedVenue.listing).map(([key, meta]) => (
                  <div key={key} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-3.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{key}</span>
                        <div className="flex items-center gap-2">
                          <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full capitalize", CONFIDENCE_STYLE[meta.confidence])}>
                            {meta.confidence}
                          </span>
                          <button onClick={() => { setEditField(editField === key ? null : key); setEditValue(meta.value); }}
                            className="text-[11px] font-bold text-[#FF5A5F] active:scale-95 transition-transform">
                            {editField === key ? 'Cancel' : 'Edit'}
                          </button>
                        </div>
                      </div>

                      {editField === key ? (
                        <div className="flex gap-2 mt-1">
                          <input value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus
                            className="flex-1 px-3 py-2 rounded-xl border border-[#FF5A5F] text-[13px] focus:outline-none focus:ring-1 focus:ring-[#FF5A5F]" />
                          <button onClick={() => saveField('listing', key)}
                            className="px-3 py-2 bg-[#FF5A5F] text-white rounded-xl active:scale-95 transition-transform">
                            <Save size={14} />
                          </button>
                        </div>
                      ) : (
                        <p className="text-[14px] font-semibold text-gray-900">{meta.value}</p>
                      )}

                      <p className="text-[10px] text-gray-400 mt-1.5">{meta.source} · Verified {meta.verifiedAt}</p>
                    </div>
                  </div>
                ))}

                <button onClick={() => markVerified(selectedVenue.id)}
                  className="w-full mt-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#E8FFF0] text-[#00C851] font-bold text-[13px] border border-[#00C851]/20 active:scale-[0.98] transition-transform">
                  <RotateCcw size={14} /> Mark All Listing Data as Re-Verified
                </button>
              </div>
            )}

            {/* EXPERIENCE DATA */}
            {activeSection === 'experience' && (
              <div className="flex flex-col gap-2.5 animate-in fade-in duration-200">
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <Lock size={13} className="text-purple-400" />
                  <p className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">Experience Data — Inspection Only</p>
                </div>
                <div className="bg-purple-50 border border-purple-100 rounded-2xl px-4 py-3 mb-1 flex items-start gap-3">
                  <Eye size={15} className="text-purple-500 mt-0.5 shrink-0" />
                  <p className="text-[12px] text-purple-700 leading-relaxed">
                    These fields are set during physical inspection and are locked from venue manager access. Edit only after a verified visit.
                  </p>
                </div>
                {Object.entries(selectedVenue.experience).map(([key, meta]) => (
                  <div key={key} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-3.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{key}</span>
                        <div className="flex items-center gap-2">
                          <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full capitalize", CONFIDENCE_STYLE[meta.confidence])}>
                            {meta.confidence}
                          </span>
                          <button onClick={() => { setEditField(editField === key ? null : key); setEditValue(meta.value); }}
                            className="text-[11px] font-bold text-purple-500 active:scale-95 transition-transform">
                            {editField === key ? 'Cancel' : 'Edit'}
                          </button>
                        </div>
                      </div>

                      {editField === key ? (
                        <div className="flex gap-2 mt-1">
                          <input value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus
                            className="flex-1 px-3 py-2 rounded-xl border border-purple-400 text-[13px] focus:outline-none focus:ring-1 focus:ring-purple-400" />
                          <button onClick={() => saveField('experience', key)}
                            className="px-3 py-2 bg-purple-500 text-white rounded-xl active:scale-95 transition-transform">
                            <Save size={14} />
                          </button>
                        </div>
                      ) : (
                        <p className="text-[14px] font-semibold text-gray-900">{meta.value}</p>
                      )}

                      <p className="text-[10px] text-gray-400 mt-1.5">{meta.source} · {meta.verifiedAt}</p>
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between px-1 mt-2">
                  <span className="text-[12px] text-gray-500 font-medium">⭐ Avg Score</span>
                  <span className="text-[13px] font-black text-gray-900">
                    {(() => {
                      const scores = Object.entries(selectedVenue.experience)
                        .filter(([k]) => k.includes('Score'))
                        .map(([, v]) => parseFloat(v.value));
                      return scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '—';
                    })()}
                    <span className="text-gray-400 font-medium"> / 5</span>
                  </span>
                </div>
              </div>
            )}

            {/* CHANGE LOG */}
            {activeSection === 'log' && (
              <div className="flex flex-col gap-0 animate-in fade-in duration-200">
                <div className="flex items-center gap-1.5 mb-3 px-1">
                  <Star size={13} className="text-gray-400" />
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Change History</p>
                </div>
                {selectedVenue.changeLog.map((entry, i) => (
                  <div key={i} className="flex gap-3 pb-4 relative">
                    {/* Timeline line */}
                    {i < selectedVenue.changeLog.length - 1 && (
                      <div className="absolute left-[14px] top-8 bottom-0 w-[2px] bg-gray-100" />
                    )}
                    {/* Dot */}
                    <div className="w-7 h-7 rounded-full bg-[#141414] flex items-center justify-center shrink-0 relative z-10 mt-0.5">
                      <Edit3 size={11} className="text-white" />
                    </div>
                    <div className="flex-1 bg-white rounded-2xl border border-gray-200 p-3.5 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-gray-900 text-[13px]">{entry.field}</span>
                        <span className="text-[10px] text-gray-400 font-medium">{entry.date}</span>
                      </div>
                      {entry.oldValue !== '—' && (
                        <div className="flex gap-2 text-[11px] mb-1.5 flex-wrap">
                          <span className="bg-red-50 text-red-500 px-2 py-0.5 rounded-full font-medium line-through">{entry.oldValue}</span>
                          <span className="text-gray-400">→</span>
                          <span className="bg-[#E8FFF0] text-[#00C851] px-2 py-0.5 rounded-full font-medium">{entry.newValue}</span>
                        </div>
                      )}
                      <p className="text-[11px] text-gray-500 leading-relaxed">{entry.reason}</p>
                      <p className="text-[10px] text-gray-400 mt-1 font-medium">by {entry.by}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── INSPECTION TRACKER ──────────────────────────────────────────────── */}
      {view === 'tracker' && (
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 pt-4 pb-6">

          {/* Overdue */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <XCircle size={15} className="text-[#FF5A5F]" />
              <p className="font-bold text-gray-900 text-[13px]">Overdue — Action Required</p>
            </div>
            {venues.filter(v => v.health === 'red').length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center text-[13px] text-gray-400">All clear</div>
            )}
            {venues.filter(v => v.health === 'red').map(v => (
              <div key={v.id} className="bg-white rounded-2xl border-2 border-[#FF5A5F]/30 p-4 mb-2.5 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-gray-900 text-[14px]">{v.name}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{v.category} · Due {v.nextInspectionDue}</p>
                  </div>
                  <div className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0", TIER_STYLE[v.tier])}>
                    {v.tier}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openDetail(v.id)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-[12px] active:scale-95 transition-transform">
                    View Venue
                  </button>
                  <button onClick={() => markVerified(v.id)}
                    className="flex-1 py-2.5 rounded-xl bg-[#FF5A5F] text-white font-bold text-[12px] active:scale-95 transition-transform">
                    Mark Re-Verified
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Re-verify soon */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={15} className="text-[#FF9500]" />
              <p className="font-bold text-gray-900 text-[13px]">Re-Verify Soon</p>
            </div>
            {venues.filter(v => v.health === 'amber').length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center text-[13px] text-gray-400">Nothing upcoming</div>
            )}
            {venues.filter(v => v.health === 'amber').map(v => (
              <div key={v.id} className="bg-white rounded-2xl border border-amber-200 p-4 mb-2.5 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-gray-900 text-[14px]">{v.name}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{v.category} · Due {v.nextInspectionDue}</p>
                  </div>
                  <div className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0", TIER_STYLE[v.tier])}>
                    {v.tier}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openDetail(v.id)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-[12px] active:scale-95 transition-transform">
                    View Venue
                  </button>
                  <button onClick={() => markVerified(v.id)}
                    className="flex-1 py-2.5 rounded-xl bg-[#FF9500] text-white font-bold text-[12px] active:scale-95 transition-transform">
                    Mark Re-Verified
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* All clear */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={15} className="text-[#00C851]" />
              <p className="font-bold text-gray-900 text-[13px]">Current — All Good</p>
            </div>
            {venues.filter(v => v.health === 'green').map(v => (
              <div key={v.id} className="bg-white rounded-2xl border border-gray-200 p-4 mb-2.5 flex items-center gap-3 shadow-sm">
                <CheckCircle size={18} className="text-[#00C851] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-[14px] truncate">{v.name}</p>
                  <p className="text-[11px] text-gray-500">Next due {v.nextInspectionDue}</p>
                </div>
                <button onClick={() => openDetail(v.id)} className="text-[#FF5A5F] active:scale-95 transition-transform">
                  <ChevronRight size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
