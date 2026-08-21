import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required');
}

const isLocalSupabaseUrl = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(supabaseUrl);

if (!isLocalSupabaseUrl && !supabaseUrl.startsWith('https://')) {
  throw new Error('VITE_SUPABASE_URL must use HTTPS outside local development');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    // OAuth, email confirmation, and recovery codes are exchanged by the
    // dedicated callback pages. Automatic detection would race those explicit
    // exchanges and can consume the same PKCE code twice.
    detectSessionInUrl: false,
    flowType: 'pkce',
    persistSession: true,
    storageKey: 'd8advisr-auth',
  },
  global: {
    headers: {
      'X-Client-Info': 'd8advisr-web',
    },
  },
});

export type PartnerOrganizationType = 'venue_operator' | 'event_organizer' | 'both' | 'platform';
export type PartnerOrganizationStatus = 'unclaimed' | 'pending' | 'active' | 'suspended' | 'archived';
export type PartnerOrganizationMemberRole = 'primary_owner' | 'owner' | 'manager' | 'editor';
export type PartnerOrganizationMemberStatus = 'invited' | 'active' | 'suspended' | 'revoked';
export type PartnerOrganizationClaimStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'disputed';
export type ListingSource = 'd8_admin' | 'partner' | 'import' | 'community';

// Listing reads deliberately exclude created_by, which is private audit data.
// Organization and source are public attribution fields introduced in Phase 3.
export const VENUE_CLIENT_SELECT = 'id,name,slug,city,region_id,area,area_id,area_source,category,category_id,tier,price_tier,price_level,description,address,lat,lng,cover_image,images,vibes,rating,review_count,avg_cost_pp,open_hours,contact_phone,website_url,is_active,is_hidden_gem,listing_status,verification_status,reverification_reason,last_verified_at,next_verification_due_at,partner_id,operator_organization_id,source,created_at,updated_at';
export const EVENT_CLIENT_SELECT = 'id,venue_id,partner_id,organizer_organization_id,source,title,description,category,category_id,vibes,cover_image,images,starts_at,ends_at,price_pp,currency,is_free,is_featured,city,region_id,event_location_kind,external_location_name,external_location_address,venue_page_status,frequency,weekday,next_occurrence,spots_total,spots_filled,emoji,event_status,cancelled_at,first_published_at,initial_published_is_free,initial_published_price,initial_published_currency,commercial_policy_id,commercial_policy_version,commercial_baseline_source,created_at,updated_at';

export type ListingMediaScope = 'events' | 'venues';
export const LISTING_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
export const LISTING_IMAGE_MIN_WIDTH = 800;
export const LISTING_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function validateListingImage(file: File, minWidth = LISTING_IMAGE_MIN_WIDTH) {
  if (!LISTING_IMAGE_TYPES.includes(file.type)) throw new Error('Use JPG, PNG, or WebP images only.');
  if (file.size > LISTING_IMAGE_MAX_BYTES) throw new Error('Images must be 3 MB or smaller.');
  const objectUrl = URL.createObjectURL(file);
  try {
    const width = await new Promise<number>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image.naturalWidth);
      image.onerror = () => reject(new Error('Could not read image dimensions.'));
      image.src = objectUrl;
    });
    if (width < minWidth) throw new Error(`Images must be at least ${minWidth}px wide.`);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function uploadListingImage(file: File, scope: ListingMediaScope) {
  await validateListingImage(file);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${user.id}/${scope}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const upload = await supabase.storage.from('listing-media').upload(path, file, {
    cacheControl: '3600', contentType: file.type, upsert: false,
  });
  if (upload.error) throw upload.error;
  const registration = await supabase.rpc('register_listing_media', {
    p_object_path: path, p_scope: scope,
  });
  if (registration.error) {
    await supabase.storage.from('listing-media').remove([path]);
    throw registration.error;
  }
  return supabase.storage.from('listing-media').getPublicUrl(path).data.publicUrl;
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          display_name: string | null;
          avatar_url: string | null;
          city: string;
          budget_pref: number;
          vibe_prefs: string[];
          is_partner: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      venues: {
        Row: {
          id: string;
          name: string;
          slug: string | null;
          city: string;
          region_id: string | null;
          area: string | null;
          area_id: string | null;
          area_source: 'catalog' | 'manual' | 'legacy' | 'provider' | null;
          category: string;
          category_id: string | null;
          tier: string;
          price_tier: string | null;
          price_level: number | null;
          description: string | null;
          address: string | null;
          lat: number | null;
          lng: number | null;
          cover_image: string | null;
          images: string[];
          vibes: string[];
          rating: number | null;
          review_count: number;
          avg_cost_pp: number | null;
          open_hours: Record<string, string> | null;
          contact_phone: string | null;
          website_url: string | null;
          is_active: boolean;
          is_hidden_gem: boolean;
          listing_status: 'draft' | 'submitted' | 'under_review' | 'live' | 'needs_update' | 'hidden';
          verification_status: 'unverified' | 'verified' | 'reverify_required' | 'expired';
          reverification_reason: string | null;
          last_verified_at: string | null;
          next_verification_due_at: string | null;
          partner_id: string | null;
          operator_organization_id: string | null;
          created_by: string | null;
          source: ListingSource | null;
          created_at: string;
          updated_at: string;
        };
      };
      events: {
        Row: {
          id: string;
          venue_id: string | null;
          partner_id: string | null;
          organizer_organization_id: string | null;
          created_by: string | null;
          source: ListingSource | null;
          title: string;
          description: string | null;
          category: string | null;
          category_id: string | null;
          vibes: string[];
          cover_image: string | null;
          images: string[];
          starts_at: string;
          ends_at: string | null;
          price_pp: number;
          currency: string;
          capacity: number | null;
          spots_left: number | null;
          is_free: boolean;
          is_featured: boolean;
          city: string;
          region_id: string | null;
          event_location_kind: 'd8_venue' | 'external' | 'undisclosed';
          external_location_name: string | null;
          external_location_address: string | null;
          venue_page_status: 'hidden' | 'requested' | 'approved' | 'rejected';
          frequency: string | null;
          weekday: string | null;
          next_occurrence: string | null;
          spots_total: number;
          spots_filled: number;
          emoji: string | null;
          event_status: string;
          cancelled_at: string | null;
          first_published_at: string | null;
          initial_published_is_free: boolean | null;
          initial_published_price: number | null;
          initial_published_currency: string | null;
          commercial_policy_id: string | null;
          commercial_policy_version: string | null;
          commercial_baseline_source: 'first_publication' | 'legacy_backfill' | null;
          created_at: string;
          updated_at: string;
        };
      };
      partner_applications: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          partner_type: 'venue' | 'organizer' | 'both';
          city: string;
          region_id: string | null;
          contact: string;
          status: 'pending' | 'live' | 'needs_update' | 'rejected';
          organization_id: string | null;
          review_reason: string | null;
          internal_review_note: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          submitted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['partner_applications']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['partner_applications']['Row']>;
      };
      partner_organizations: {
        Row: {
          id: string;
          name: string;
          organization_type: PartnerOrganizationType;
          status: PartnerOrganizationStatus;
          contact: string | null;
          city: string | null;
          created_by: string | null;
          verified_at: string | null;
          verified_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['partner_organizations']['Row']> & {
          id?: string;
          name: string;
          organization_type: PartnerOrganizationType;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['partner_organizations']['Row']>;
      };
      partner_organization_memberships: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: PartnerOrganizationMemberRole;
          status: PartnerOrganizationMemberStatus;
          granted_by: string | null;
          granted_at: string | null;
          revoked_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['partner_organization_memberships']['Row']> & {
          id?: string;
          organization_id: string;
          user_id: string;
          role: PartnerOrganizationMemberRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['partner_organization_memberships']['Row']>;
      };
      partner_organization_claims: {
        Row: {
          id: string;
          organization_id: string;
          claimant_user_id: string;
          source_venue_id: string | null;
          requested_role: 'primary_owner' | 'manager';
          status: PartnerOrganizationClaimStatus;
          evidence: Record<string, unknown>;
          review_notes: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['partner_organization_claims']['Row']> & {
          id?: string;
          organization_id: string;
          claimant_user_id: string;
          status?: 'pending';
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['partner_organization_claims']['Row']>;
      };
      partner_notifications: {
        Row: {
          id: string;
          user_id: string;
          partner_application_id: string | null;
          event_venue_relationship_id: string | null;
          deduplication_key: string | null;
          type: 'system' | 'approval' | 'action' | 'review';
          title: string;
          body: string;
          metadata: Record<string, unknown>;
          read_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['partner_notifications']['Row'], 'id' | 'created_at' | 'read_at' | 'event_venue_relationship_id' | 'deduplication_key'> & {
          id?: string;
          read_at?: string | null;
          created_at?: string;
          event_venue_relationship_id?: string | null;
          deduplication_key?: string | null;
        };
        Update: Partial<Database['public']['Tables']['partner_notifications']['Row']>;
      };
      event_revisions: {
        Row: {
          id: string;
          event_id: string;
          status: 'applied' | 'pending' | 'approved' | 'rejected' | 'blocked' | 'cancelled';
          risk_level: 'low' | 'high';
          enforcement_code: 'A' | 'C' | 'R' | 'E' | 'B' | 'N' | null;
          rule_code: string | null;
          previous_values: Record<string, unknown>;
          proposed_values: Record<string, unknown>;
          changed_fields: string[];
          submitted_by: string | null;
          revision_source: 'partner' | 'admin';
          organizer_reason: string | null;
          emergency_reason: string | null;
          policy_id: string;
          policy_version: string;
          reviewed_by: string | null;
          review_note: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['event_revisions']['Row']> & {
          event_id: string;
          previous_values: Record<string, unknown>;
          proposed_values: Record<string, unknown>;
        };
        Update: Partial<Database['public']['Tables']['event_revisions']['Row']>;
      };
      event_interests: {
        Row: {
          id: string;
          user_id: string;
          event_id: string;
          interest_type: 'reminder' | 'saved' | 'plan' | 'ticket' | 'waitlist';
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['event_interests']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['event_interests']['Row']>;
      };
      consumer_notifications: {
        Row: {
          id: string;
          user_id: string;
          event_id: string | null;
          type: 'event_rescheduled' | 'event_relocated' | 'event_price_reduced' | 'event_price_changed' | 'event_cancelled' | 'system' | 'vibe_match';
          title: string;
          body: string;
          metadata: Record<string, unknown>;
          read_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['consumer_notifications']['Row'], 'id' | 'created_at' | 'read_at'> & {
          id?: string;
          read_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['consumer_notifications']['Row']>;
      };
      plan_reviews: {
        Row: {
          id: string;
          plan_id: string;
          user_id: string;
          mood_score: number;
          mood_emoji: string | null;
          note: string | null;
          tags: string[];
          submitted_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['plan_reviews']['Row'], 'id' | 'submitted_at' | 'updated_at'> & {
          id?: string;
          submitted_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['plan_reviews']['Row']>;
      };
      venue_reviews: {
        Row: {
          id: string;
          plan_review_id: string;
          plan_id: string;
          plan_stop_id: string | null;
          venue_id: string;
          user_id: string;
          vibe_score: number;
          value_score: number;
          submitted_at: string;
        };
        Insert: Omit<Database['public']['Tables']['venue_reviews']['Row'], 'id' | 'submitted_at'> & {
          id?: string;
          submitted_at?: string;
        };
        Update: Partial<Database['public']['Tables']['venue_reviews']['Row']>;
      };
      plans: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          status: string;
          date: string | null;
          time: string | null;
          city: string | null;
          budget: number | null;
          total_cost: number | null;
          vibes: string[];
          notes: string | null;
          is_group: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      plan_stops: {
        Row: {
          id: string;
          plan_id: string;
          venue_id: string | null;
          position: number;
          label: string | null;
          time: string | null;
          cost_pp: number;
          is_free: boolean;
          transport: Record<string, unknown> | null;
          notes: string | null;
          created_at: string;
        };
      };
      regions: {
        Row: {
          id: string;
          name: string;
          country_code: string;
          currency_code: string;
          currency_symbol: string;
          timezone: string;
          is_live: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['regions']['Row'], 'created_at'> & { created_at?: string };
        Update: Partial<Database['public']['Tables']['regions']['Row']>;
      };
      region_areas: {
        Row: {
          id: string; region_id: string; slug: string; name: string;
          aliases: string[]; source: 'd8_reviewed' | 'provider' | 'import';
          is_active: boolean; sort_order: number; created_by: string | null;
          created_at: string; updated_at: string;
        };
      };
      listing_categories: {
        Row: {
          id: string; label: string; applies_to: Array<'venue' | 'event'>;
          is_active: boolean; sort_order: number; created_by: string | null;
          created_at: string; updated_at: string;
        };
      };
      listing_vibes: {
        Row: {
          id: string; label: string; is_active: boolean; sort_order: number;
          created_by: string | null; created_at: string; updated_at: string;
        };
      };
      stash_funds: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          emoji: string;
          fund_type: string;
          goal: number;
          saved: number;
          auto_save: number;
          linked_plan: string | null;
          linked_venue: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
      };
    };
  };
};
