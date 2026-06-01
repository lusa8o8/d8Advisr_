import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import {
  ArrowLeft, ChevronRight, CheckCircle, AlertCircle, XCircle,
  ClipboardList, Search, Shield, Eye,
  ChevronDown, Clock, RotateCcw, Plus, Lock, Activity, Hourglass, LogOut
} from 'lucide-react';
import { cn } from '@/components/SharedUI';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tier = 'Verified' | 'D8 Approved' | 'Hidden Gem';
type Health = 'green' | 'amber' | 'red';

interface Venue {
  id: string;
  name: string;
  category: string;
  city: string;
  area: string | null;
  address: string | null;
  description: string | null;
  price: string;
  hours: string;
  photos: string[];
  coverImage: string | null;
  listingStatus: string;
  verificationStatus: string;
  reverificationReason: string | null;
  lastVerifiedAt: string;
  nextVerificationDueAt: string;
  rating: number | null;
  reviewCount: number;
  isActive: boolean;
  tier: Tier;
  health: Health;
  nextInspectionDue: string;
}

interface AdminVenueRow {
  id: string;
  name: string;
  category: string;
  city: string;
  area: string | null;
  address: string | null;
  tier: string | null;
  price_tier: string | null;
  description: string | null;
  cover_image: string | null;
  images: string[] | null;
  rating: number | null;
  review_count: number | null;
  avg_cost_pp: number | null;
  open_hours: Record<string, string> | null;
  listing_status: string;
  verification_status: string;
  reverification_reason: string | null;
  last_verified_at: string | null;
  next_verification_due_at: string | null;
  is_active: boolean | null;
  is_hidden_gem: boolean | null;
  created_at: string;
  updated_at: string;
}

// Helpers

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

const TIERS: Tier[] = ['Verified', 'D8 Approved', 'Hidden Gem'];
const NOISE_LEVELS: NoiseLevel[] = ['quiet', 'moderate', 'lively', 'loud'];

type AdminView = 'list' | 'detail' | 'tracker' | 'health' | 'submissions';

type SubmissionStatus = 'pending' | 'approved' | 'needs_update' | 'rejected';
type SubmissionKind = 'venue' | 'event';
type PartnerApplicationStatus = 'pending' | 'live' | 'needs_update' | 'rejected';
type PartnerApplicationType = 'venue' | 'organizer' | 'both';
type ReverificationTaskStatus = 'open' | 'in_progress' | 'resolved' | 'dismissed';

interface Submission {
  id: string;
  kind: SubmissionKind;
  name: string;
  city: string;
  category: string;
  contact: string;
  phone: string;
  submittedAt: string;
  status: SubmissionStatus;
  appStatus?: PartnerApplicationStatus;
  partnerType?: PartnerApplicationType;
  note?: string;
  extra?: string;
}

interface PartnerApplicationRow {
  id: string;
  name: string;
  partner_type: PartnerApplicationType;
  city: string;
  contact: string;
  status: PartnerApplicationStatus;
  created_at: string;
  updated_at: string;
}

interface VenuePlacementAdminRow {
  id: string;
  title: string;
  category: string | null;
  cover_image: string | null;
  starts_at: string | null;
  event_status: string | null;
  venue_id: string;
  venue_page_status: string;
  partner_id: string | null;
  created_at: string | null;
  venues?: { name?: string | null; city?: string | null; area?: string | null } | { name?: string | null; city?: string | null; area?: string | null }[] | null;
}

interface VenuePlacementAdminRequest {
  eventId: string;
  eventName: string;
  category: string;
  coverImage: string | null;
  startsAt: string;
  eventStatus: string;
  venueId: string;
  venueName: string;
  venueCity: string;
  venueArea: string;
  organizerId: string | null;
  createdAt: string;
}

interface VenueListingReviewRow {
  id: string;
  name: string;
  category: string;
  city: string;
  area: string | null;
  address: string | null;
  cover_image: string | null;
  images: string[] | null;
  partner_id: string | null;
  listing_status: string;
  verification_status: string;
  reverification_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface VenueListingReview {
  id: string;
  name: string;
  category: string;
  city: string;
  area: string | null;
  address: string | null;
  coverImage: string | null;
  images: string[];
  partnerId: string | null;
  listingStatus: string;
  verificationStatus: string;
  reverificationReason: string | null;
  submittedAt: string;
}

interface ReverificationVenueRow {
  id: string;
  name: string;
  category: string;
  city: string;
  area: string | null;
  tier: string | null;
  listing_status: string;
  verification_status: string;
  cover_image: string | null;
}

interface ReverificationTaskRow {
  id: string;
  venue_id: string;
  reason: string;
  status: ReverificationTaskStatus;
  triggered_by: string | null;
  created_at: string;
  resolved_at: string | null;
  notes: string | null;
  venues?: ReverificationVenueRow | ReverificationVenueRow[] | null;
}

interface ReverificationTask {
  id: string;
  venueId: string;
  venueName: string;
  category: string;
  city: string;
  area: string | null;
  tier: Tier;
  listingStatus: string;
  verificationStatus: string;
  coverImage: string | null;
  reason: string;
  status: ReverificationTaskStatus;
  triggeredBy: string | null;
  createdAt: string;
  resolvedAt: string | null;
  notes: string | null;
}

type NoiseLevel = 'quiet' | 'moderate' | 'lively' | 'loud';

interface VenueInspectionRow {
  id: string;
  venue_id: string;
  inspector_id: string | null;
  atmosphere_score: number | null;
  lighting_score: number | null;
  noise_level: NoiseLevel | null;
  occasion_fit: string[];
  inspector_notes: string | null;
  inspected_at: string;
  created_at: string;
  updated_at: string;
}

interface InspectionDraft {
  atmosphereScore: string;
  lightingScore: string;
  noiseLevel: NoiseLevel;
  occasionFit: string;
  inspectorNotes: string;
}

interface VenueChangeLogRow {
  id: string;
  venue_id: string;
  changed_by: string | null;
  actor_email: string | null;
  actor_display_name: string | null;
  actor_username: string | null;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  risk_level: 'low' | 'high';
  applied_immediately: boolean;
  created_reverification: boolean;
  reverification_reason: string | null;
  created_at: string;
}

function partnerTypeLabel(type: PartnerApplicationType) {
  if (type === 'venue') return 'Venue';
  if (type === 'organizer') return 'Organiser';
  return 'Venue & Organiser';
}

function submissionStatusFromApp(status: PartnerApplicationStatus): SubmissionStatus {
  return status === 'live' ? 'approved' : status;
}

function partnerApplicationToSubmission(row: PartnerApplicationRow): Submission {
  return {
    id: row.id,
    kind: row.partner_type === 'venue' ? 'venue' : 'event',
    name: row.name,
    city: row.city,
    category: partnerTypeLabel(row.partner_type),
    contact: row.name,
    phone: row.contact,
    submittedAt: new Date(row.created_at).toISOString().slice(0, 10),
    status: submissionStatusFromApp(row.status),
    appStatus: row.status,
    partnerType: row.partner_type,
    note: row.status === 'live' ? 'Approved by D8 Team' : row.status === 'needs_update' ? 'Needs more information' : undefined,
    extra: `Partner application · ${partnerTypeLabel(row.partner_type)}`,
  };
}

function venueFromPlacement(row: VenuePlacementAdminRow) {
  return Array.isArray(row.venues) ? row.venues[0] : row.venues;
}

function venuePlacementAdminRequestFromRow(row: VenuePlacementAdminRow): VenuePlacementAdminRequest {
  const venue = venueFromPlacement(row);
  return {
    eventId: row.id,
    eventName: row.title,
    category: row.category ?? 'Event',
    coverImage: row.cover_image,
    startsAt: row.starts_at ?? '',
    eventStatus: row.event_status ?? 'draft',
    venueId: row.venue_id,
    venueName: venue?.name ?? 'Venue',
    venueCity: venue?.city ?? '',
    venueArea: venue?.area ?? '',
    organizerId: row.partner_id,
    createdAt: row.created_at ?? '',
  };
}

function venueListingReviewFromRow(row: VenueListingReviewRow): VenueListingReview {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    city: row.city,
    area: row.area,
    address: row.address,
    coverImage: row.cover_image,
    images: row.images ?? [],
    partnerId: row.partner_id,
    listingStatus: row.listing_status,
    verificationStatus: row.verification_status,
    reverificationReason: row.reverification_reason,
    submittedAt: new Date(row.updated_at ?? row.created_at).toISOString().slice(0, 10),
  };
}

function venueFromReverificationTask(row: ReverificationTaskRow) {
  return Array.isArray(row.venues) ? row.venues[0] : row.venues;
}

function reverificationTaskFromRow(row: ReverificationTaskRow): ReverificationTask {
  const venue = venueFromReverificationTask(row);
  return {
    id: row.id,
    venueId: row.venue_id,
    venueName: venue?.name ?? 'Venue',
    category: venue?.category ?? 'Venue',
    city: venue?.city ?? '',
    area: venue?.area ?? null,
    tier: coerceTier({
      tier: venue?.tier ?? null,
      is_hidden_gem: venue?.tier === 'Hidden Gem',
    } as AdminVenueRow),
    listingStatus: venue?.listing_status ?? 'unknown',
    verificationStatus: venue?.verification_status ?? 'unknown',
    coverImage: venue?.cover_image ?? null,
    reason: row.reason,
    status: row.status,
    triggeredBy: row.triggered_by,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    notes: row.notes,
  };
}

function reviewReasonLabel(reason: string | null) {
  switch (reason) {
    case 'name_changed':
      return 'Name changed';
    case 'address_changed':
      return 'Address changed';
    case 'category_changed':
      return 'Category changed';
    case 'price_changed':
      return 'Price changed';
    case 'sensitive_field_changed':
      return 'Photos or sensitive fields changed';
    case 'admin_review':
      return 'Admin review';
    case 'needs_better_photos':
      return 'Needs better photos';
    default:
      return null;
  }
}

function coerceTier(row: AdminVenueRow): Tier {
  if (row.is_hidden_gem) return 'Hidden Gem';
  if (row.tier === 'D8 Approved' || row.tier === 'Hidden Gem' || row.tier === 'Verified') return row.tier;
  return 'Verified';
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not scheduled';
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return 'Not scheduled';
  return new Date(time).toISOString().slice(0, 10);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Unknown time';
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return 'Unknown time';
  return new Date(time).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function actorLabel(row: VenueChangeLogRow) {
  if (row.actor_email) return row.actor_email;
  if (row.actor_display_name) return row.actor_display_name;
  if (row.actor_username) return row.actor_username;
  if (row.changed_by) return `Admin ${row.changed_by.slice(0, 8)}`;
  return 'D8 admin';
}

function formatOpenHours(hours: Record<string, string> | null) {
  if (!hours || Object.keys(hours).length === 0) return 'Not provided';
  return Object.entries(hours)
    .filter(([, value]) => Boolean(value))
    .map(([day, value]) => `${day}: ${value}`)
    .join(', ') || 'Not provided';
}

function healthFromVenue(row: AdminVenueRow): Health {
  const due = row.next_verification_due_at ? new Date(row.next_verification_due_at).getTime() : null;
  const now = Date.now();
  if (
    row.listing_status === 'needs_update'
    || row.verification_status === 'expired'
    || (due !== null && !Number.isNaN(due) && due < now)
  ) {
    return 'red';
  }
  if (
    row.listing_status !== 'live'
    || row.verification_status === 'reverify_required'
    || (due !== null && !Number.isNaN(due) && due - now < 1000 * 60 * 60 * 24 * 30)
  ) {
    return 'amber';
  }
  return 'green';
}

function adminVenueFromRow(row: AdminVenueRow): Venue {
  const photos = Array.from(new Set([row.cover_image, ...(row.images ?? [])].filter((url): url is string => Boolean(url))));
  const price = row.avg_cost_pp
    ? `${row.price_tier ?? ''} ${row.avg_cost_pp}/pp`.trim()
    : row.price_tier ?? 'Not provided';
  const hours = formatOpenHours(row.open_hours);

  return {
    id: row.id,
    name: row.name,
    category: row.category,
    city: row.city,
    area: row.area,
    address: row.address,
    description: row.description,
    price,
    hours,
    photos,
    coverImage: row.cover_image,
    listingStatus: row.listing_status,
    verificationStatus: row.verification_status,
    reverificationReason: row.reverification_reason,
    lastVerifiedAt: formatDate(row.last_verified_at),
    nextVerificationDueAt: formatDate(row.next_verification_due_at),
    rating: row.rating,
    reviewCount: row.review_count ?? 0,
    isActive: Boolean(row.is_active),
    tier: coerceTier(row),
    health: healthFromVenue(row),
    nextInspectionDue: formatDate(row.next_verification_due_at),
  };
}

function logAdminIssue(message: string, detail?: unknown) {
  if (!import.meta.env.DEV) return;
  if (detail === undefined) {
    console.warn(`[D8 admin] ${message}`);
  } else {
    console.warn(`[D8 admin] ${message}`, detail);
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AdminPanel() {
  const [, setLocation] = useLocation();
  const { signOut, user } = useAuth();
  const [view, setView]       = useState<AdminView>('list');
  const [venues, setVenues]   = useState<Venue[]>([]);
  const [venuesLoading, setVenuesLoading] = useState(false);
  const [venuesError, setVenuesError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [navTab, setNavTab]   = useState<'venues' | 'tracker' | 'health' | 'submissions'>('venues');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionsError, setSubmissionsError] = useState<string | null>(null);
  const [venuePlacementRequests, setVenuePlacementRequests] = useState<VenuePlacementAdminRequest[]>([]);
  const [venueListingReviews, setVenueListingReviews] = useState<VenueListingReview[]>([]);
  const [reverificationTasks, setReverificationTasks] = useState<ReverificationTask[]>([]);
  const [reverificationTasksLoading, setReverificationTasksLoading] = useState(false);
  const [reverificationTasksError, setReverificationTasksError] = useState<string | null>(null);
  const [venueInspections, setVenueInspections] = useState<VenueInspectionRow[]>([]);
  const [inspectionsLoading, setInspectionsLoading] = useState(false);
  const [inspectionsError, setInspectionsError] = useState<string | null>(null);
  const [venueChangeLogs, setVenueChangeLogs] = useState<Record<string, VenueChangeLogRow[]>>({});
  const [changeLogLoading, setChangeLogLoading] = useState(false);
  const [changeLogError, setChangeLogError] = useState<string | null>(null);

  // Filter state
  const [filterTier, setFilterTier]     = useState<string>('All');
  const [filterHealth, setFilterHealth] = useState<string>('All');
  const [search, setSearch]             = useState('');

  // Detail view state
  const [showTierMenu, setShowTierMenu] = useState(false);
  const [tierReason, setTierReason] = useState('');
  const [pendingTier, setPendingTier] = useState<Tier | null>(null);
  const [activeSection, setActiveSection] = useState<'listing' | 'media' | 'experience' | 'review'>('listing');
  const [adminActionError, setAdminActionError] = useState<string | null>(null);
  const [adminActionLoading, setAdminActionLoading] = useState<string | null>(null);
  const [inspectionDraft, setInspectionDraft] = useState<InspectionDraft>({
    atmosphereScore: '',
    lightingScore: '',
    noiseLevel: 'moderate',
    occasionFit: '',
    inspectorNotes: '',
  });

  const selectedVenue = venues.find(v => v.id === selectedId) ?? null;
  const selectedInspection = selectedVenue
    ? venueInspections.find(inspection => inspection.venue_id === selectedVenue.id) ?? null
    : null;
  const selectedChangeLog = selectedVenue ? venueChangeLogs[selectedVenue.id] ?? [] : [];

  const handleSignOut = async () => {
    await signOut();
    setLocation('/');
  };

  const loadAdminVenues = async () => {
    setVenuesLoading(true);
    setVenuesError(null);

    const { data, error } = await supabase
      .from('venues')
      .select('id,name,category,city,area,address,tier,price_tier,description,cover_image,images,rating,review_count,avg_cost_pp,open_hours,listing_status,verification_status,reverification_reason,last_verified_at,next_verification_due_at,is_active,is_hidden_gem,created_at,updated_at')
      .order('updated_at', { ascending: false });

    if (error) {
      setVenues([]);
      setVenuesError(error.message);
      logAdminIssue('Could not load admin venues', error.message);
    } else {
      const rows = (data ?? []) as AdminVenueRow[];
      setVenues(rows.map(adminVenueFromRow));
      if (selectedId && !rows.some(row => row.id === selectedId)) {
        setSelectedId(null);
        setView('list');
      }
    }

    setVenuesLoading(false);
  };

  const loadSubmissions = async () => {
    setSubmissionsLoading(true);
    setSubmissionsError(null);
    const { data, error } = await supabase
      .from('partner_applications')
      .select('id,name,partner_type,city,contact,status,created_at,updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      setSubmissionsError(error.message);
      logAdminIssue('Could not load partner applications', error.message);
    } else {
      const rows = (data ?? []) as PartnerApplicationRow[];
      setSubmissions(rows.map(partnerApplicationToSubmission));
      if (rows.length === 0) {
        logAdminIssue('No partner applications returned for admin submissions');
      }
    }

    const { data: placementRows, error: placementErr } = await supabase
      .from('events')
      .select('id,title,category,cover_image,starts_at,event_status,venue_id,venue_page_status,partner_id,created_at,venues(id,name,city,area)')
      .eq('venue_page_status', 'requested')
      .order('created_at', { ascending: false });

    if (placementErr) {
      setSubmissionsError(placementErr.message);
      logAdminIssue('Could not load venue page placement requests', placementErr.message);
    } else {
      setVenuePlacementRequests(((placementRows ?? []) as VenuePlacementAdminRow[]).map(venuePlacementAdminRequestFromRow));
    }

    const { data: listingRows, error: listingErr } = await supabase
      .from('venues')
      .select('id,name,category,city,area,address,cover_image,images,partner_id,listing_status,verification_status,reverification_reason,created_at,updated_at')
      .in('listing_status', ['draft', 'submitted', 'under_review', 'needs_update'])
      .order('updated_at', { ascending: false });

    if (listingErr) {
      setSubmissionsError(listingErr.message);
      logAdminIssue('Could not load venue listing reviews', listingErr.message);
    } else {
      setVenueListingReviews(((listingRows ?? []) as VenueListingReviewRow[]).map(venueListingReviewFromRow));
    }

    setSubmissionsLoading(false);
  };

  const loadReverificationTasks = async () => {
    setReverificationTasksLoading(true);
    setReverificationTasksError(null);

    const { data, error } = await supabase
      .from('venue_reverification_tasks')
      .select('id,venue_id,reason,status,triggered_by,created_at,resolved_at,notes,venues(id,name,category,city,area,tier,listing_status,verification_status,cover_image)')
      .order('created_at', { ascending: false });

    if (error) {
      setReverificationTasks([]);
      setReverificationTasksError(error.message);
      logAdminIssue('Could not load venue reverification tasks', error.message);
    } else {
      setReverificationTasks(((data ?? []) as ReverificationTaskRow[]).map(reverificationTaskFromRow));
    }

    setReverificationTasksLoading(false);
  };

  const loadVenueInspections = async () => {
    setInspectionsLoading(true);
    setInspectionsError(null);

    const { data, error } = await supabase
      .from('venue_inspections')
      .select('id,venue_id,inspector_id,atmosphere_score,lighting_score,noise_level,occasion_fit,inspector_notes,inspected_at,created_at,updated_at')
      .order('inspected_at', { ascending: false });

    if (error) {
      setVenueInspections([]);
      setInspectionsError(error.message);
      logAdminIssue('Could not load venue inspections', error.message);
    } else {
      const latestByVenue = new Map<string, VenueInspectionRow>();
      ((data ?? []) as VenueInspectionRow[]).forEach(row => {
        if (!latestByVenue.has(row.venue_id)) latestByVenue.set(row.venue_id, row);
      });
      setVenueInspections(Array.from(latestByVenue.values()));
    }

    setInspectionsLoading(false);
  };

  const loadVenueChangeLog = async (venueId: string) => {
    setChangeLogLoading(true);
    setChangeLogError(null);

    const { data, error } = await supabase.rpc('admin_get_venue_change_log', {
      p_venue_id: venueId,
    });

    if (error) {
      setVenueChangeLogs(current => ({ ...current, [venueId]: [] }));
      setChangeLogError(error.message);
      logAdminIssue('Could not load venue change log', { venueId, error: error.message });
    } else {
      setVenueChangeLogs(current => ({
        ...current,
        [venueId]: (data ?? []) as VenueChangeLogRow[],
      }));
    }

    setChangeLogLoading(false);
  };

  useEffect(() => {
    void loadAdminVenues();
    void loadSubmissions();
    void loadReverificationTasks();
    void loadVenueInspections();
  }, []);

  const updatePartnerApplicationStatus = async (id: string, status: PartnerApplicationStatus) => {
    const previous = submissions;
    setSubmissions(current =>
      current.map(sub =>
        sub.id === id
          ? {
              ...sub,
              status: submissionStatusFromApp(status),
              appStatus: status,
              note: status === 'live' ? 'Approved by D8 Team' : status === 'rejected' ? 'Rejected by D8 Team' : sub.note,
            }
          : sub
      )
    );

    const { error } = await supabase.rpc('admin_update_partner_application_status', {
      application_id: id,
      new_status: status,
    });

    if (error) {
      setSubmissions(previous);
      setSubmissionsError(error.message);
      logAdminIssue('Could not update partner application status', { id, status, error: error.message });
    }
  };

  const updateVenuePlacementStatus = async (eventId: string, status: 'approved' | 'rejected') => {
    const previous = venuePlacementRequests;
    setVenuePlacementRequests(current => current.filter(request => request.eventId !== eventId));

    const { error } = await supabase.rpc('set_event_venue_page_status', {
      p_event_id: eventId,
      p_status: status,
    });

    if (error) {
      setVenuePlacementRequests(previous);
      setSubmissionsError(error.message);
      logAdminIssue('Could not update venue page placement request', { eventId, status, error: error.message });
    }
  };

  const updateVenueListingStatus = async (
    venueId: string,
    status: 'live' | 'needs_update' | 'hidden',
    reason: string | null = status === 'live' ? null : 'admin_review'
  ) => {
    const previous = venueListingReviews;
    setVenueListingReviews(current => current.filter(review => review.id !== venueId));

    const { error } = await supabase.rpc('admin_update_venue_listing_status', {
      venue_id: venueId,
      new_status: status,
      reason,
    });

    if (error) {
      setVenueListingReviews(previous);
      setSubmissionsError(error.message);
      logAdminIssue('Could not update venue listing status', { venueId, status, error: error.message });
    } else {
      await loadAdminVenues();
      await loadReverificationTasks();
      if (selectedId) await loadVenueChangeLog(selectedId);
    }
  };

  // ── Filtered list ──────────────────────────────────────────────────────────

  const filtered = venues.filter(v => {
    if (filterTier !== 'All' && v.tier !== filterTier) return false;
    if (filterHealth !== 'All' && v.health !== filterHealth) return false;
    if (search && !v.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // ── Actions ───────────────────────────────────────────────────────────────

  const openDetail = (id: string) => {
    setSelectedId(id);
    setView('detail');
    setActiveSection('listing');
    setInspectionDraft({
      atmosphereScore: '',
      lightingScore: '',
      noiseLevel: 'moderate',
      occasionFit: '',
      inspectorNotes: '',
    });
    void loadVenueChangeLog(id);
  };


  const confirmTierChange = async () => {
    if (!selectedVenue || !pendingTier || !tierReason.trim()) return;
    setAdminActionError(null);
    setAdminActionLoading('tier');

    const { error } = await supabase.rpc('admin_update_venue_tier', {
      p_venue_id: selectedVenue.id,
      new_tier: pendingTier,
      reason: tierReason.trim(),
    });

    if (error) {
      setAdminActionError(error.message);
      logAdminIssue('Could not update venue tier', { venueId: selectedVenue.id, tier: pendingTier, error: error.message });
    } else {
      setPendingTier(null);
      setTierReason('');
      setShowTierMenu(false);
      await loadAdminVenues();
      await loadVenueChangeLog(selectedVenue.id);
    }

    setAdminActionLoading(null);
  };

  const markVerified = async (id: string) => {
    setAdminActionError(null);
    setAdminActionLoading(`verify:${id}`);

    const { error } = await supabase.rpc('admin_mark_venue_verified', {
      p_venue_id: id,
      reason: 'admin_verified',
    });

    if (error) {
      setAdminActionError(error.message);
      logAdminIssue('Could not mark venue verified', { venueId: id, error: error.message });
    } else {
      await loadAdminVenues();
      await loadReverificationTasks();
      await loadVenueChangeLog(id);
    }

    setAdminActionLoading(null);
  };

  const updateReverificationTask = async (
    taskId: string,
    status: ReverificationTaskStatus | 'needs_update',
    note?: string
  ) => {
    setAdminActionError(null);
    setReverificationTasksError(null);
    setAdminActionLoading(`task:${taskId}:${status}`);

    const { error } = await supabase.rpc('admin_update_reverification_task_status', {
      p_task_id: taskId,
      new_status: status,
      note: note ?? null,
    });

    if (error) {
      setReverificationTasksError(error.message);
      logAdminIssue('Could not update reverification task', { taskId, status, error: error.message });
    } else {
      await loadReverificationTasks();
      await loadAdminVenues();
      if (selectedId) await loadVenueChangeLog(selectedId);
    }

    setAdminActionLoading(null);
  };

  const saveInspection = async () => {
    if (!selectedVenue) return;

    const atmosphere = Number(inspectionDraft.atmosphereScore);
    const lighting = Number(inspectionDraft.lightingScore);
    const notes = inspectionDraft.inspectorNotes.trim();

    if (
      Number.isNaN(atmosphere)
      || Number.isNaN(lighting)
      || atmosphere < 0
      || atmosphere > 5
      || lighting < 0
      || lighting > 5
      || !notes
    ) {
      setInspectionsError('Atmosphere, lighting, and inspector notes are required. Scores must be 0 to 5.');
      return;
    }

    setInspectionsError(null);
    setAdminActionLoading(`inspection:${selectedVenue.id}`);

    const occasionFit = inspectionDraft.occasionFit
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);

    const { error } = await supabase
      .from('venue_inspections')
      .insert({
        venue_id: selectedVenue.id,
        inspector_id: user?.id ?? null,
        atmosphere_score: atmosphere,
        lighting_score: lighting,
        noise_level: inspectionDraft.noiseLevel,
        occasion_fit: occasionFit,
        inspector_notes: notes,
      });

    if (error) {
      setInspectionsError(error.message);
      logAdminIssue('Could not save venue inspection', { venueId: selectedVenue.id, error: error.message });
    } else {
      setInspectionDraft({
        atmosphereScore: '',
        lightingScore: '',
        noiseLevel: 'moderate',
        occasionFit: '',
        inspectorNotes: '',
      });
      await loadVenueInspections();
    }

    setAdminActionLoading(null);
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#F7F7F7]">

      {/* TOP BAR */}
      <div className="bg-[#141414] px-5 pt-12 pb-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {view !== 'list' && (
            <button
              onClick={() => setView('list')}
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white active:scale-95 transition-transform"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div>
            <p className="text-white font-black text-[15px] leading-tight tracking-tight">
              <span className="text-[#FF5A5F]">D8</span>Advisr Admin
            </p>
            <p className="text-white/40 text-[11px] font-medium">
              {view === 'detail' && selectedVenue ? selectedVenue.name : 'Internal — Team Only'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#00C851] animate-pulse" />
            <span className="text-white/50 text-[11px] font-semibold">Live</span>
          </div>
          <button
            onClick={() => void handleSignOut()}
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white active:scale-95 transition-all"
            aria-label="Sign out of admin"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* NAV TABS — only on list/tracker */}
      {view !== 'detail' && (
        <div className="bg-[#141414] px-5 pb-4 flex gap-1 shrink-0 overflow-x-auto no-scrollbar">
          <button onClick={() => { setNavTab('venues'); setView('list'); }}
            className={cn("shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12px] font-bold transition-all",
              navTab === 'venues' ? "bg-[#FF5A5F] text-white" : "text-white/50 hover:text-white/80")}>
            <ClipboardList size={13} /> Venues ({venues.length})
          </button>
          <button onClick={() => { setNavTab('tracker'); setView('tracker'); }}
            className={cn("shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12px] font-bold transition-all relative",
              navTab === 'tracker' ? "bg-[#FF5A5F] text-white" : "text-white/50 hover:text-white/80")}>
            <Clock size={13} /> Inspections
            {reverificationTasks.filter(task => task.status === 'open' || task.status === 'in_progress').length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-white text-[9px] font-black flex items-center justify-center">
                {reverificationTasks.filter(task => task.status === 'open' || task.status === 'in_progress').length}
              </span>
            )}
          </button>
          <button onClick={() => { setNavTab('health'); setView('health'); }}
            className={cn("shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12px] font-bold transition-all",
              navTab === 'health' ? "bg-[#FF5A5F] text-white" : "text-white/50 hover:text-white/80")}>
            <Activity size={13} /> Health
          </button>
          <button onClick={() => { setNavTab('submissions'); setView('submissions'); }}
            className={cn("shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12px] font-bold transition-all relative",
              navTab === 'submissions' ? "bg-[#FF5A5F] text-white" : "text-white/50 hover:text-white/80")}>
            <Plus size={13} /> Submissions
            {(submissions.filter(s => s.status === 'pending').length + venuePlacementRequests.length + venueListingReviews.length) > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-white text-[9px] font-black flex items-center justify-center">
                {submissions.filter(s => s.status === 'pending').length + venuePlacementRequests.length + venueListingReviews.length}
              </span>
            )}
          </button>
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
            {venuesLoading && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center text-[13px] font-semibold text-gray-500">
                Loading venues...
              </div>
            )}
            {venuesError && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-[13px] text-red-600">
                <p className="font-bold mb-1">Could not load venues</p>
                <p>{venuesError}</p>
              </div>
            )}
            {!venuesLoading && !venuesError && filtered.length === 0 && (
              <div className="text-center text-muted-foreground text-[14px] py-12">
                {venues.length === 0 ? 'No venues have been submitted yet.' : 'No venues match your filters.'}
              </div>
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
              <button
                onClick={() => setShowTierMenu(v => !v)}
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
                    <button onClick={() => void confirmTierChange()} disabled={!tierReason.trim() || adminActionLoading === 'tier'}
                      className={cn("w-full py-2.5 rounded-xl font-bold text-[13px] transition-all",
                        tierReason.trim() && adminActionLoading !== 'tier' ? "bg-[#FF5A5F] text-white active:scale-[0.98]" : "bg-gray-100 text-gray-400 cursor-not-allowed")}>
                      {adminActionLoading === 'tier' ? 'Saving...' : 'Confirm Tier Change'}
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
            {adminActionError && (
              <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-600">
                {adminActionError}
              </div>
            )}
          </div>

          {/* Section tabs */}
          <div className="flex mx-4 mt-4 bg-white rounded-2xl border border-gray-200 p-1 shadow-sm">
            {(['listing', 'media', 'experience', 'review'] as const).map(s => (
              <button key={s} onClick={() => setActiveSection(s)}
                className={cn("flex-1 py-2 rounded-xl text-[12px] font-bold transition-all capitalize",
                  activeSection === s ? "bg-[#141414] text-white" : "text-gray-500 hover:text-gray-800")}>
                {s}
              </button>
            ))}
          </div>

          <div className="px-4 pt-3 pb-6">
            {activeSection === 'listing' && (
              <div className="flex flex-col gap-3 animate-in fade-in duration-200">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Listing status</p>
                    <p className="text-[18px] font-black text-gray-900 capitalize">{selectedVenue.listingStatus.replaceAll('_', ' ')}</p>
                    <p className="text-[11px] text-gray-400 mt-1">{selectedVenue.isActive ? 'Visible publicly' : 'Not public yet'}</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Verification</p>
                    <p className="text-[18px] font-black text-gray-900 capitalize">{selectedVenue.verificationStatus.replaceAll('_', ' ')}</p>
                    <p className="text-[11px] text-gray-400 mt-1">Next: {selectedVenue.nextVerificationDueAt}</p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Description</p>
                  <p className="text-[13px] text-gray-700 leading-relaxed">{selectedVenue.description || 'No description provided yet.'}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['Area', selectedVenue.area || 'Not provided'],
                    ['Address', selectedVenue.address || 'Not provided'],
                    ['Price', selectedVenue.price],
                    ['Hours', selectedVenue.hours],
                    ['Rating', selectedVenue.rating ? `${selectedVenue.rating.toFixed(1)} (${selectedVenue.reviewCount} reviews)` : 'No reviews yet'],
                    ['Tier', selectedVenue.tier],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{label}</p>
                      <p className="text-[13px] font-bold text-gray-900 leading-snug">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'media' && (
              <div className="flex flex-col gap-3 animate-in fade-in duration-200">
                <div className="grid grid-cols-2 gap-3">
                  <div className={cn(
                    "rounded-2xl border p-4 shadow-sm",
                    selectedVenue.coverImage ? "bg-[#E8FFF0] border-[#00C851]/20 text-[#00C851]" : "bg-amber-50 border-amber-100 text-amber-700"
                  )}>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-2 opacity-70">Cover</p>
                    <p className="text-2xl font-black leading-none">{selectedVenue.coverImage ? 'Ready' : 'Missing'}</p>
                    <p className="text-[11px] font-medium opacity-70 mt-2">{selectedVenue.coverImage ? 'Public card can render.' : 'Ask partner for a clear hero photo.'}</p>
                  </div>
                  <div className={cn(
                    "rounded-2xl border p-4 shadow-sm",
                    selectedVenue.photos.length >= 3 ? "bg-[#E8FFF0] border-[#00C851]/20 text-[#00C851]" : "bg-amber-50 border-amber-100 text-amber-700"
                  )}>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-2 opacity-70">Gallery</p>
                    <p className="text-2xl font-black leading-none">{selectedVenue.photos.length}</p>
                    <p className="text-[11px] font-medium opacity-70 mt-2">{selectedVenue.photos.length >= 3 ? 'Enough media for review.' : 'Prefer at least 3 real venue photos.'}</p>
                  </div>
                </div>

                {selectedVenue.coverImage ? (
                  <div className="rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 shadow-sm">
                    <img src={selectedVenue.coverImage} alt={`${selectedVenue.name} cover`} className="w-full h-44 object-cover" />
                    <div className="px-4 py-3 bg-white">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Cover image</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-[13px] text-amber-700">
                    <p className="font-bold mb-1">Missing cover image</p>
                    <p>This listing can be reviewed, but public quality is weaker without a clear venue photo.</p>
                  </div>
                )}

                {selectedVenue.photos.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {selectedVenue.photos.map((url, index) => (
                      <div key={url} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-100">
                        <img src={url} alt={`${selectedVenue.name} photo ${index + 1}`} className="w-full h-full object-cover" />
                        {url === selectedVenue.coverImage && (
                          <span className="absolute left-1.5 bottom-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-bold text-white">Cover</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center text-[13px] text-gray-400">
                    No venue photos uploaded yet.
                  </div>
                )}
              </div>
            )}

            {activeSection === 'experience' && (
              <div className="flex flex-col gap-3 animate-in fade-in duration-200">
                <div className="bg-purple-50 border border-purple-100 rounded-2xl px-4 py-3 flex items-start gap-3">
                  <Lock size={15} className="text-purple-500 mt-0.5 shrink-0" />
                  <p className="text-[12px] text-purple-700 leading-relaxed">
                    Experience data is admin-only and should be entered after a D8 inspection. Partners cannot view or edit these fields.
                  </p>
                </div>

                {inspectionsLoading && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center text-[13px] text-gray-500">
                    Loading inspection data...
                  </div>
                )}

                {selectedInspection ? (
                  <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Latest inspection</p>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-600">
                        {formatDate(selectedInspection.inspected_at)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Atmosphere</p>
                        <p className="text-[20px] font-black text-gray-900">{selectedInspection.atmosphere_score ?? '—'}<span className="text-[12px] text-gray-400"> / 5</span></p>
                      </div>
                      <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Lighting</p>
                        <p className="text-[20px] font-black text-gray-900">{selectedInspection.lighting_score ?? '—'}<span className="text-[12px] text-gray-400"> / 5</span></p>
                      </div>
                      <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Noise</p>
                        <p className="text-[13px] font-bold text-gray-900 capitalize">{selectedInspection.noise_level ?? 'Not recorded'}</p>
                      </div>
                      <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Occasion fit</p>
                        <p className="text-[13px] font-bold text-gray-900">{selectedInspection.occasion_fit.length ? selectedInspection.occasion_fit.join(', ') : 'Not recorded'}</p>
                      </div>
                    </div>
                    <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Inspector notes</p>
                      <p className="text-[13px] text-gray-700 leading-relaxed">{selectedInspection.inspector_notes || 'No notes recorded.'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-200 p-4 text-[13px] text-gray-500">
                    <p className="font-bold text-gray-900 mb-1">No inspection recorded yet</p>
                    <p>Add the first internal inspection after a D8 team visit.</p>
                  </div>
                )}

                <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Add inspection</p>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Atmosphere</span>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        value={inspectionDraft.atmosphereScore}
                        onChange={e => setInspectionDraft(current => ({ ...current, atmosphereScore: e.target.value }))}
                        placeholder="0-5"
                        className="px-3 py-2.5 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:border-[#FF5A5F]"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Lighting</span>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        value={inspectionDraft.lightingScore}
                        onChange={e => setInspectionDraft(current => ({ ...current, lightingScore: e.target.value }))}
                        placeholder="0-5"
                        className="px-3 py-2.5 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:border-[#FF5A5F]"
                      />
                    </label>
                  </div>
                  <label className="flex flex-col gap-1.5 mb-3">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Noise level</span>
                    <select
                      value={inspectionDraft.noiseLevel}
                      onChange={e => setInspectionDraft(current => ({ ...current, noiseLevel: e.target.value as NoiseLevel }))}
                      className="px-3 py-2.5 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:border-[#FF5A5F] bg-white capitalize"
                    >
                      {NOISE_LEVELS.map(level => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5 mb-3">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Occasion fit</span>
                    <input
                      value={inspectionDraft.occasionFit}
                      onChange={e => setInspectionDraft(current => ({ ...current, occasionFit: e.target.value }))}
                      placeholder="Date night, birthday, group hangout"
                      className="px-3 py-2.5 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:border-[#FF5A5F]"
                    />
                    <span className="text-[10px] text-gray-400">Comma-separated labels.</span>
                  </label>
                  <label className="flex flex-col gap-1.5 mb-3">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Inspector notes</span>
                    <textarea
                      rows={3}
                      value={inspectionDraft.inspectorNotes}
                      onChange={e => setInspectionDraft(current => ({ ...current, inspectorNotes: e.target.value }))}
                      placeholder="What should D8 know about the real experience?"
                      className="px-3 py-2.5 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:border-[#FF5A5F] resize-none"
                    />
                  </label>
                  {inspectionsError && (
                    <div className="mb-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-600">
                      {inspectionsError}
                    </div>
                  )}
                  <button
                    onClick={() => void saveInspection()}
                    disabled={adminActionLoading === `inspection:${selectedVenue.id}`}
                    className={cn(
                      "w-full py-3 rounded-2xl font-bold text-[13px] transition-transform",
                      adminActionLoading === `inspection:${selectedVenue.id}`
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-[#FF5A5F] text-white active:scale-[0.98]"
                    )}
                  >
                    {adminActionLoading === `inspection:${selectedVenue.id}` ? 'Saving...' : 'Save inspection'}
                  </button>
                </div>
              </div>
            )}

            {activeSection === 'review' && (
              <div className="flex flex-col gap-3 animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield size={15} className="text-[#FF5A5F]" />
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Review status</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Listing status</p>
                      <p className="text-[13px] font-bold text-gray-900 capitalize">{selectedVenue.listingStatus.replaceAll('_', ' ')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Verification</p>
                      <p className="text-[13px] font-bold text-gray-900 capitalize">{selectedVenue.verificationStatus.replaceAll('_', ' ')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Last verified</p>
                      <p className="text-[13px] font-bold text-gray-900">{selectedVenue.lastVerifiedAt}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Next review</p>
                      <p className="text-[13px] font-bold text-gray-900">{selectedVenue.nextVerificationDueAt}</p>
                    </div>
                  </div>
                </div>

                {selectedVenue.reverificationReason && (
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-[13px] text-amber-700">
                    <p className="font-bold mb-1">Review reason</p>
                    <p>{reviewReasonLabel(selectedVenue.reverificationReason) ?? selectedVenue.reverificationReason.replaceAll('_', ' ')}</p>
                  </div>
                )}

                <button
                  onClick={() => void markVerified(selectedVenue.id)}
                  disabled={adminActionLoading === `verify:${selectedVenue.id}`}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-[13px] border transition-transform",
                    adminActionLoading === `verify:${selectedVenue.id}`
                      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                      : "bg-[#E8FFF0] text-[#00C851] border-[#00C851]/20 active:scale-[0.98]"
                  )}
                >
                  <RotateCcw size={14} />
                  {adminActionLoading === `verify:${selectedVenue.id}` ? 'Saving...' : 'Mark venue verified'}
                </button>

                <div className="bg-white rounded-2xl border border-gray-200 p-4 text-[13px] text-gray-500">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-bold text-gray-900">Change history</p>
                    {changeLogLoading && (
                      <span className="text-[10px] font-bold text-gray-400">Loading...</span>
                    )}
                  </div>
                  {changeLogError && (
                    <div className="mb-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-600">
                      {changeLogError}
                    </div>
                  )}
                  {!changeLogLoading && selectedChangeLog.length === 0 && !changeLogError && (
                    <p>No venue change history has been recorded yet.</p>
                  )}
                  {selectedChangeLog.map(entry => {
                    const reason = reviewReasonLabel(entry.reverification_reason) ?? entry.reverification_reason?.replaceAll('_', ' ');
                    return (
                      <div key={entry.id} className="border-t border-gray-100 py-3 first:border-t-0 first:pt-0">
                        <div className="flex items-start justify-between gap-3 mb-1.5">
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 text-[13px] capitalize">{entry.field_name.replaceAll('_', ' ')}</p>
                            <p className="text-[11px] text-gray-400 truncate">by {actorLabel(entry)}</p>
                          </div>
                          <span className="text-[10px] font-bold text-gray-400 shrink-0">{formatDateTime(entry.created_at)}</span>
                        </div>
                        {(entry.old_value || entry.new_value) && (
                          <div className="flex flex-wrap gap-1.5 text-[11px] mb-2">
                            {entry.old_value && (
                              <span className="rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-500 line-through">{entry.old_value}</span>
                            )}
                            {entry.old_value && entry.new_value && <span className="text-gray-300">to</span>}
                            {entry.new_value && (
                              <span className="rounded-full bg-[#E8FFF0] px-2 py-0.5 font-medium text-[#00C851]">{entry.new_value}</span>
                            )}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                          <span className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold",
                            entry.risk_level === 'high' ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-500"
                          )}>
                            {entry.risk_level} risk
                          </span>
                          {entry.created_reverification && (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">reverification</span>
                          )}
                          {reason && (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">{reason}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ── INSPECTION TRACKER ──────────────────────────────────────────────── */}
      {view === 'tracker' && (() => {
        const openTasks = reverificationTasks.filter(task => task.status === 'open');
        const inProgressTasks = reverificationTasks.filter(task => task.status === 'in_progress');
        const resolvedTasks = reverificationTasks.filter(task => task.status === 'resolved');
        const dismissedTasks = reverificationTasks.filter(task => task.status === 'dismissed');
        const activeTasks = [...openTasks, ...inProgressTasks];

        const renderTaskCard = (task: ReverificationTask, resolved = false) => (
          <div key={task.id} className={cn(
            "bg-white rounded-2xl border p-4 mb-2.5 shadow-sm",
            task.status === 'open' ? "border-amber-200" :
            task.status === 'in_progress' ? "border-blue-200" :
            task.status === 'resolved' ? "border-[#00C851]/20" :
            "border-gray-200"
          )}>
            <div className="flex items-start gap-3 mb-3">
              {task.coverImage ? (
                <img src={task.coverImage} alt={`${task.venueName} cover`} className="w-12 h-12 rounded-xl object-cover bg-gray-100 border border-gray-100 shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-100 flex items-center justify-center shrink-0">
                  <Shield size={18} className="text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 text-[14px] leading-tight truncate">{task.venueName}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{task.category} · {[task.area, task.city].filter(Boolean).join(', ') || 'Location not provided'}</p>
                  </div>
                  <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0", TIER_STYLE[task.tier])}>
                    {task.tier}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full capitalize",
                    task.status === 'open' ? "bg-amber-50 text-amber-600" :
                    task.status === 'in_progress' ? "bg-blue-50 text-blue-600" :
                    task.status === 'resolved' ? "bg-[#E8FFF0] text-[#00C851]" :
                    "bg-gray-100 text-gray-500"
                  )}>
                    {task.status.replaceAll('_', ' ')}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                    {reviewReasonLabel(task.reason) ?? task.reason.replaceAll('_', ' ')}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Listing</p>
                <p className="text-[12px] font-bold text-gray-800 capitalize">{task.listingStatus.replaceAll('_', ' ')}</p>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Created</p>
                <p className="text-[12px] font-bold text-gray-800">{formatDate(task.createdAt)}</p>
              </div>
            </div>

            {task.notes && (
              <p className="mb-3 rounded-xl bg-gray-50 border border-gray-100 px-3 py-2 text-[11px] font-medium text-gray-500">
                {task.notes}
              </p>
            )}

            {resolved ? (
              <button onClick={() => openDetail(task.venueId)}
                className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-[12px] active:scale-95 transition-transform">
                View Venue
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => openDetail(task.venueId)}
                  className="py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-[12px] active:scale-95 transition-transform">
                  View Venue
                </button>
                {task.status === 'open' ? (
                  <button
                    onClick={() => void updateReverificationTask(task.id, 'in_progress', 'review_started')}
                    disabled={adminActionLoading === `task:${task.id}:in_progress`}
                    className={cn(
                      "py-2.5 rounded-xl font-bold text-[12px] transition-transform",
                      adminActionLoading === `task:${task.id}:in_progress`
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-blue-500 text-white active:scale-95"
                    )}
                  >
                    {adminActionLoading === `task:${task.id}:in_progress` ? 'Saving...' : 'Start review'}
                  </button>
                ) : (
                  <button
                    onClick={() => void markVerified(task.venueId)}
                    disabled={adminActionLoading === `verify:${task.venueId}`}
                    className={cn(
                      "py-2.5 rounded-xl font-bold text-[12px] transition-transform",
                      adminActionLoading === `verify:${task.venueId}`
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-[#00C851] text-white active:scale-95"
                    )}
                  >
                    {adminActionLoading === `verify:${task.venueId}` ? 'Saving...' : 'Mark resolved'}
                  </button>
                )}
                <button
                  onClick={() => void updateReverificationTask(task.id, 'needs_update', 'Admin requested partner updates')}
                  disabled={adminActionLoading === `task:${task.id}:needs_update`}
                  className={cn(
                    "py-2.5 rounded-xl font-bold text-[12px] transition-transform",
                    adminActionLoading === `task:${task.id}:needs_update`
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-[#FF5A5F] text-white active:scale-95"
                  )}
                >
                  {adminActionLoading === `task:${task.id}:needs_update` ? 'Saving...' : 'Needs update'}
                </button>
                <button
                  onClick={() => void updateReverificationTask(task.id, 'dismissed', 'Dismissed by admin')}
                  disabled={adminActionLoading === `task:${task.id}:dismissed`}
                  className={cn(
                    "py-2.5 rounded-xl border font-bold text-[12px] transition-transform",
                    adminActionLoading === `task:${task.id}:dismissed`
                      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                      : "border-gray-200 text-gray-500 active:scale-95"
                  )}
                >
                  {adminActionLoading === `task:${task.id}:dismissed` ? 'Saving...' : 'Dismiss'}
                </button>
              </div>
            )}
          </div>
        );

        return (
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 pt-4 pb-6">
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                ['Open', openTasks.length, 'text-amber-600 bg-amber-50 border-amber-100'],
                ['Reviewing', inProgressTasks.length, 'text-blue-600 bg-blue-50 border-blue-100'],
                ['Resolved', resolvedTasks.length, 'text-[#00C851] bg-[#E8FFF0] border-[#00C851]/10'],
                ['Dismissed', dismissedTasks.length, 'text-gray-500 bg-white border-gray-200'],
              ].map(([label, value, style]) => (
                <div key={label} className={cn("rounded-2xl border p-3 text-center", style as string)}>
                  <p className="text-2xl font-black leading-none">{value}</p>
                  <p className="text-[10px] font-bold mt-1">{label}</p>
                </div>
              ))}
            </div>

            {reverificationTasksLoading && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center text-[13px] font-semibold text-gray-500">
                Loading reverification tasks...
              </div>
            )}
            {reverificationTasksError && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-4 text-[13px] text-red-600">
                <p className="font-bold mb-1">Could not sync inspections</p>
                <p>{reverificationTasksError}</p>
              </div>
            )}
            {!reverificationTasksLoading && !reverificationTasksError && activeTasks.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5 text-center text-[13px] text-gray-400">
                No active reverification tasks.
              </div>
            )}

            {openTasks.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle size={15} className="text-[#FF9500]" />
                  <p className="font-bold text-gray-900 text-[13px]">Needs Review</p>
                </div>
                {openTasks.map(task => renderTaskCard(task))}
              </div>
            )}
            {inProgressTasks.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <Hourglass size={15} className="text-blue-500" />
                  <p className="font-bold text-gray-900 text-[13px]">In Progress</p>
                </div>
                {inProgressTasks.map(task => renderTaskCard(task))}
              </div>
            )}
            {(resolvedTasks.length > 0 || dismissedTasks.length > 0) && (
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle size={15} className="text-[#00C851]" />
                  <p className="font-bold text-gray-900 text-[13px]">Recently Closed</p>
                </div>
                {[...resolvedTasks, ...dismissedTasks].slice(0, 8).map(task => renderTaskCard(task, true))}
              </div>
            )}
          </div>
        );
      })()}


      {/* ── HEALTH VIEW ─────────────────────────────────────────────────────── */}
      {view === 'health' && (() => {
        const now = Date.now();
        const liveListings = venues.filter(v => v.listingStatus === 'live' && v.isActive);
        const underReview = venues.filter(v => v.listingStatus === 'submitted' || v.listingStatus === 'under_review');
        const needsUpdate = venues.filter(v => v.listingStatus === 'needs_update');
        const reverifyRequired = venues.filter(v => v.verificationStatus === 'reverify_required');
        const overdueVerification = venues.filter(v => {
          const due = v.nextVerificationDueAt === 'Not scheduled' ? NaN : new Date(v.nextVerificationDueAt).getTime();
          return v.listingStatus === 'live' && !Number.isNaN(due) && due < now;
        });
        const missingPhotos = venues.filter(v => !v.coverImage || v.photos.length === 0);
        const missingRequiredFields = venues.filter(v =>
          !v.name.trim()
          || !v.category.trim()
          || !v.city.trim()
          || !v.area?.trim()
          || !v.address?.trim()
          || !v.description?.trim()
          || !v.coverImage
        );
        const activeReviewTasks = reverificationTasks.filter(task => task.status === 'open' || task.status === 'in_progress');
        const resolvedThisWeek = reverificationTasks.filter(task => {
          if (task.status !== 'resolved' && task.status !== 'dismissed') return false;
          const resolvedAt = task.resolvedAt ? new Date(task.resolvedAt).getTime() : NaN;
          return !Number.isNaN(resolvedAt) && now - resolvedAt <= 1000 * 60 * 60 * 24 * 7;
        });

        const criticalCards = [
          {
            label: 'Overdue verification',
            value: overdueVerification.length,
            detail: 'Live listings past their next review date',
            tone: overdueVerification.length ? 'red' : 'green',
            items: overdueVerification,
          },
          {
            label: 'Needs update',
            value: needsUpdate.length,
            detail: 'Listings waiting on partner fixes',
            tone: needsUpdate.length ? 'red' : 'green',
            items: needsUpdate,
          },
          {
            label: 'Missing required fields',
            value: missingRequiredFields.length,
            detail: 'Listings missing core public-page data',
            tone: missingRequiredFields.length ? 'red' : 'green',
            items: missingRequiredFields,
          },
        ];

        const workloadCards = [
          {
            label: 'Under review',
            value: underReview.length,
            detail: 'Submitted listings awaiting admin review',
            tone: underReview.length ? 'amber' : 'green',
            items: underReview,
          },
          {
            label: 'Active reverify tasks',
            value: activeReviewTasks.length,
            detail: 'Open or in-progress inspection queue items',
            tone: activeReviewTasks.length ? 'amber' : 'green',
            items: activeReviewTasks,
          },
          {
            label: 'Reverify required',
            value: reverifyRequired.length,
            detail: 'Venues flagged by sensitive changes',
            tone: reverifyRequired.length ? 'amber' : 'green',
            items: reverifyRequired,
          },
        ];

        const qualityCards = [
          {
            label: 'Missing photos',
            value: missingPhotos.length,
            detail: 'Listings without a cover or gallery image',
            tone: missingPhotos.length ? 'amber' : 'green',
            items: missingPhotos,
          },
          {
            label: 'Live listings',
            value: liveListings.length,
            detail: 'Active public supply',
            tone: 'neutral',
            items: liveListings,
          },
          {
            label: 'Resolved this week',
            value: resolvedThisWeek.length,
            detail: 'Closed reverify tasks in the last 7 days',
            tone: 'neutral',
            items: resolvedThisWeek,
          },
        ];

        const cardStyle = (tone: string) =>
          tone === 'red' ? 'border-[#FF5A5F]/30 bg-red-50 text-[#FF5A5F]' :
          tone === 'amber' ? 'border-amber-100 bg-amber-50 text-amber-600' :
          tone === 'green' ? 'border-[#00C851]/20 bg-[#E8FFF0] text-[#00C851]' :
          'border-gray-200 bg-white text-gray-900';

        const renderMetric = (metric: { label: string; value: number; detail: string; tone: string; items: unknown[] }) => (
          <div key={metric.label} className={cn("rounded-2xl border p-4 shadow-sm", cardStyle(metric.tone))}>
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-2">{metric.label}</p>
            <p className="text-3xl font-black leading-none">{metric.value}</p>
            <p className="text-[11px] font-medium opacity-70 mt-2 leading-snug">{metric.detail}</p>
          </div>
        );

        return (
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 pt-4 pb-6">
            <div className="flex items-center gap-2 mb-4 px-1">
              <Activity size={14} className="text-gray-400" />
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Operational health - real admin workload</p>
            </div>

            {(venuesLoading || reverificationTasksLoading) && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4 text-center text-[13px] font-semibold text-gray-500">
                Loading health metrics...
              </div>
            )}
            {(venuesError || reverificationTasksError) && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-4 text-[13px] text-red-600">
                <p className="font-bold mb-1">Some health data could not sync</p>
                <p>{venuesError ?? reverificationTasksError}</p>
              </div>
            )}

            <div className="mb-5">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">Critical</p>
              <div className="grid grid-cols-1 gap-3">
                {criticalCards.map(renderMetric)}
              </div>
            </div>

            <div className="mb-5">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">Review workload</p>
              <div className="grid grid-cols-1 gap-3">
                {workloadCards.map(renderMetric)}
              </div>
            </div>

            <div className="mb-5">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">Supply quality</p>
              <div className="grid grid-cols-1 gap-3">
                {qualityCards.map(renderMetric)}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">Action queue</p>
              {[
                ...overdueVerification.map(v => ({ id: v.id, title: v.name, label: 'Overdue verification', venueId: v.id })),
                ...needsUpdate.map(v => ({ id: v.id, title: v.name, label: 'Needs partner update', venueId: v.id })),
                ...missingRequiredFields.map(v => ({ id: v.id, title: v.name, label: 'Missing required fields', venueId: v.id })),
              ].slice(0, 8).map(item => (
                <button key={`${item.label}:${item.id}`} onClick={() => openDetail(item.venueId)}
                  className="w-full flex items-center justify-between gap-3 py-3 border-b border-gray-100 last:border-b-0 text-left active:scale-[0.99] transition-transform">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 text-[13px] truncate">{item.title}</p>
                    <p className="text-[11px] text-gray-500">{item.label}</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-400 shrink-0" />
                </button>
              ))}
              {overdueVerification.length + needsUpdate.length + missingRequiredFields.length === 0 && (
                <p className="py-3 text-center text-[13px] font-medium text-gray-400">No critical action items.</p>
              )}
            </div>
          </div>
        );
      })()}


      {/* ── SUBMISSIONS VIEW ─────────────────────────────────────────────────── */}
      {view === 'submissions' && (() => {
        const pending  = submissions.filter(s => s.status === 'pending' || s.status === 'needs_update');
        const resolved = submissions.filter(s => s.status !== 'pending' && s.status !== 'needs_update');
        const totalPending = pending.length + venuePlacementRequests.length + venueListingReviews.length;

        const approve = (id: string) => {
          void updatePartnerApplicationStatus(id, 'live');
        };
        const reject = (id: string) =>
          setSubmissions(ss => ss.map(s => s.id === id ? { ...s, status: 'rejected' as const, note: 'Rejected — needs more info' } : s));

        const Card = ({ sub }: { sub: Submission }) => (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0",
                  sub.kind === 'venue' ? "bg-[#FFF0F1]" : "bg-blue-50"
                )}>
                  {sub.kind === 'venue' ? '🏛️' : '🎟️'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-[14px] leading-tight">{sub.name}</p>
                  <p className="text-[12px] text-gray-400 font-medium mt-0.5">{sub.category} · {sub.city}</p>
                  {sub.extra && (
                    <p className="text-[11px] text-gray-500 mt-1 italic">{sub.extra}</p>
                  )}
                </div>
              </div>
              <span className={cn(
                "text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 ml-2",
                sub.status === 'pending'  ? "bg-amber-50 text-amber-700 border-amber-200" :
                sub.status === 'approved' ? "bg-green-50 text-[#00C851] border-green-200" :
                sub.status === 'needs_update' ? "bg-blue-50 text-blue-600 border-blue-200" :
                "bg-red-50 text-red-600 border-red-200"
              )}>
                {sub.status === 'pending' ? '⏳ Pending' : sub.status === 'approved' ? '✓ Approved' : '✕ Rejected'}
              </span>
            </div>

            <div className="flex gap-3 mb-3 text-[12px] text-gray-500">
              <span className="font-medium">{sub.contact}</span>
              <span>·</span>
              <span>{sub.phone}</span>
              <span>·</span>
              <span>{sub.submittedAt}</span>
            </div>

            {sub.note && sub.status !== 'pending' && (
              <p className={cn(
                "text-[12px] font-medium px-3 py-2 rounded-xl mb-3",
                sub.status === 'approved' ? "bg-green-50 text-[#00C851]" : "bg-red-50 text-red-600"
              )}>
                {sub.note}
              </p>
            )}

            {sub.status === 'pending' && (
              <div className="flex gap-2">
                <button
                  onClick={() => approve(sub.id)}
                  className="flex-1 bg-[#00C851] text-white rounded-xl font-bold text-[13px] py-2.5 active:scale-95 transition-transform flex items-center justify-center gap-1.5"
                >
                  <CheckCircle size={14} /> Approve
                </button>
                <button
                  onClick={() => updatePartnerApplicationStatus(sub.id, 'rejected')}
                  className="flex-1 bg-gray-100 text-gray-600 rounded-xl font-bold text-[13px] py-2.5 active:scale-95 transition-transform flex items-center justify-center gap-1.5 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <XCircle size={14} /> Reject
                </button>
              </div>
            )}
          </div>
        );

        const PlacementCard = ({ request }: { request: VenuePlacementAdminRequest }) => (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-50 text-amber-600">
                  <Plus size={17} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-[14px] leading-tight">{request.eventName}</p>
                  <p className="text-[12px] text-gray-400 font-medium mt-0.5">
                    Wants placement on {request.venueName}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1 italic">
                    {request.category} - {request.venueArea || request.venueCity || 'D8 venue'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 ml-2 bg-amber-50 text-amber-700 border-amber-200">
                Review
              </span>
            </div>

            {request.coverImage ? (
              <div className="mb-3 rounded-xl overflow-hidden bg-gray-100 border border-gray-100">
                <img src={request.coverImage} alt={request.eventName} className="w-full h-36 object-cover" />
              </div>
            ) : (
              <div className="mb-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
                <p className="font-bold">Missing event cover</p>
                <p className="mt-0.5">Placement can be reviewed, but this event has no public image.</p>
              </div>
            )}

            <div className="flex gap-3 mb-3 text-[12px] text-gray-500">
              <span className="font-medium">{request.eventStatus}</span>
              <span>-</span>
              <span>{request.startsAt ? new Date(request.startsAt).toISOString().slice(0, 10) : 'No date'}</span>
              <span>-</span>
              <span>{request.organizerId ? `${request.organizerId.slice(0, 8)}...` : 'Unknown organiser'}</span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => void updateVenuePlacementStatus(request.eventId, 'approved')}
                className="flex-1 bg-[#00C851] text-white rounded-xl font-bold text-[13px] py-2.5 active:scale-95 transition-transform flex items-center justify-center gap-1.5"
              >
                <CheckCircle size={14} /> Approve placement
              </button>
              <button
                onClick={() => void updateVenuePlacementStatus(request.eventId, 'rejected')}
                className="flex-1 bg-gray-100 text-gray-600 rounded-xl font-bold text-[13px] py-2.5 active:scale-95 transition-transform flex items-center justify-center gap-1.5 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <XCircle size={14} /> Reject
              </button>
            </div>
          </div>
        );

        const ListingCard = ({ review }: { review: VenueListingReview }) => {
          const media = [review.coverImage, ...review.images]
            .filter((url, index, arr): url is string => Boolean(url) && arr.indexOf(url) === index);
          const reason = reviewReasonLabel(review.reverificationReason);
          const missingCover = !review.coverImage;
          const thinGallery = media.length < 3;

          return (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#FFF0F1] text-[#FF5A5F]">
                  <ClipboardList size={17} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-[14px] leading-tight">{review.name}</p>
                  <p className="text-[12px] text-gray-400 font-medium mt-0.5">
                    {review.category} · {review.area || review.city}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1 italic">
                    {reason ?? review.address ?? 'New venue listing'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 ml-2 bg-amber-50 text-amber-700 border-amber-200">
                {review.listingStatus.replaceAll('_', ' ')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className={cn(
                "rounded-xl border px-3 py-2",
                missingCover ? "bg-amber-50 border-amber-100 text-amber-700" : "bg-[#E8FFF0] border-[#00C851]/20 text-[#00C851]"
              )}>
                <p className="text-[9px] font-bold uppercase tracking-wider opacity-70">Cover</p>
                <p className="text-[12px] font-bold">{missingCover ? 'Missing' : 'Ready'}</p>
              </div>
              <div className={cn(
                "rounded-xl border px-3 py-2",
                thinGallery ? "bg-amber-50 border-amber-100 text-amber-700" : "bg-[#E8FFF0] border-[#00C851]/20 text-[#00C851]"
              )}>
                <p className="text-[9px] font-bold uppercase tracking-wider opacity-70">Photos</p>
                <p className="text-[12px] font-bold">{media.length} uploaded</p>
              </div>
            </div>

            {media.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {media.slice(0, 6).map((url, index) => (
                  <div key={url} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-100">
                    <img src={url} alt={`${review.name} photo ${index + 1}`} className="w-full h-full object-cover" />
                    {index === 0 && (
                      <span className="absolute left-1.5 bottom-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-bold text-white">
                        Cover
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mb-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
                <p className="font-bold">No venue photos yet</p>
                <p className="mt-0.5">Request real venue photos before this listing goes public.</p>
              </div>
            )}

            <div className="flex gap-3 mb-3 text-[12px] text-gray-500">
              <span className="font-medium">{review.verificationStatus.replace('_', ' ')}</span>
              <span>-</span>
              <span>{review.submittedAt}</span>
              <span>-</span>
              <span>{review.partnerId ? `${review.partnerId.slice(0, 8)}...` : 'No partner'}</span>
            </div>

            {(missingCover || thinGallery) && (
              <div className="mb-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
                <p className="font-bold">Media quality check</p>
                <p className="mt-0.5">
                  {missingCover ? 'Cover image is missing. ' : ''}
                  {thinGallery ? 'Gallery is light; prefer at least 3 venue photos.' : ''}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => void updateVenueListingStatus(review.id, 'live')}
                className="flex-1 bg-[#00C851] text-white rounded-xl font-bold text-[13px] py-2.5 active:scale-95 transition-transform flex items-center justify-center gap-1.5"
              >
                <CheckCircle size={14} /> Approve listing
              </button>
              <button
                onClick={() => void updateVenueListingStatus(review.id, 'needs_update')}
                className="flex-1 bg-gray-100 text-gray-600 rounded-xl font-bold text-[13px] py-2.5 active:scale-95 transition-transform flex items-center justify-center gap-1.5 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <XCircle size={14} /> Needs update
              </button>
              <button
                onClick={() => void updateVenueListingStatus(review.id, 'needs_update', 'needs_better_photos')}
                className="flex-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-xl font-bold text-[13px] py-2.5 active:scale-95 transition-transform flex items-center justify-center gap-1.5"
              >
                <Eye size={14} /> Needs better photos
              </button>
            </div>
          </div>
          );
        };

        return (
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 pt-4 pb-8">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2.5 mb-5">
              {[
                { label: 'Pending', count: totalPending, color: 'bg-amber-50 text-amber-700' },
                { label: 'Approved', count: submissions.filter(s => s.status === 'approved').length, color: 'bg-green-50 text-[#00C851]' },
                { label: 'Rejected', count: submissions.filter(s => s.status === 'rejected').length, color: 'bg-red-50 text-red-500' },
              ].map(stat => (
                <div key={stat.label} className={cn("rounded-2xl p-3 text-center", stat.color, "border border-current/10")}>
                  <p className="text-[22px] font-black leading-none">{stat.count}</p>
                  <p className="text-[11px] font-bold mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            {submissionsError && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
                <p className="font-bold text-red-700 text-[13px]">Could not sync submissions</p>
                <p className="text-red-600 text-[12px] mt-1">{submissionsError}</p>
              </div>
            )}

            {submissionsLoading && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4 text-center">
                <p className="text-[13px] font-bold text-gray-500">Loading partner applications...</p>
              </div>
            )}

            {venuePlacementRequests.length > 0 && (
              <>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Venue page requests ({venuePlacementRequests.length})
                </p>
                <div className="flex flex-col gap-3 mb-6">
                  {venuePlacementRequests.map(request => <PlacementCard key={request.eventId} request={request} />)}
                </div>
              </>
            )}

            {venueListingReviews.length > 0 && (
              <>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Venue listing reviews ({venueListingReviews.length})
                </p>
                <div className="flex flex-col gap-3 mb-6">
                  {venueListingReviews.map(review => <ListingCard key={review.id} review={review} />)}
                </div>
              </>
            )}

            {pending.length > 0 && (
              <>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Needs review ({pending.length})
                </p>
                <div className="flex flex-col gap-3 mb-6">
                  {pending.map(s => <Card key={s.id} sub={s} />)}
                </div>
              </>
            )}

            {resolved.length > 0 && (
              <>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Resolved ({resolved.length})
                </p>
                <div className="flex flex-col gap-3">
                  {resolved.map(s => <Card key={s.id} sub={s} />)}
                </div>
              </>
            )}

            {submissions.length === 0 && venuePlacementRequests.length === 0 && venueListingReviews.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-4xl mb-4">📥</p>
                <p className="font-bold text-gray-700 text-[16px]">No submissions yet</p>
                <p className="text-[13px] text-gray-400 mt-1">Venue and event submissions will appear here</p>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
