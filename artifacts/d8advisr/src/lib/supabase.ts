import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
          area: string | null;
          category: string;
          tier: string;
          price_tier: string | null;
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
          is_active: boolean;
          is_hidden_gem: boolean;
          partner_id: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      events: {
        Row: {
          id: string;
          venue_id: string | null;
          partner_id: string | null;
          title: string;
          description: string | null;
          category: string | null;
          vibes: string[];
          cover_image: string | null;
          starts_at: string;
          ends_at: string | null;
          price_pp: number;
          currency: string;
          capacity: number | null;
          spots_left: number | null;
          is_free: boolean;
          is_featured: boolean;
          city: string;
          frequency: string | null;
          weekday: string | null;
          next_occurrence: string | null;
          spots_total: number;
          spots_filled: number;
          emoji: string | null;
          event_status: string;
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
          contact: string;
          status: 'pending' | 'live' | 'needs_update';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['partner_applications']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['partner_applications']['Row']>;
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
