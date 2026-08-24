import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';
import type { Database } from './supabase';
import { useProfile } from './useProfile';

export type Region = Database['public']['Tables']['regions']['Row'] & {
  country: { calling_code: string } | null;
};
export type RegionArea = Database['public']['Tables']['region_areas']['Row'];
export type ListingCategory = Database['public']['Tables']['listing_categories']['Row'];
export type ListingVibe = Database['public']['Tables']['listing_vibes']['Row'];

export function useRegion() {
  const { profile } = useProfile();

  // Local state for the active discovery market. The live catalog supplies the fallback.
  const [activeRegionId, setActiveRegionId] = useState<string>('lagos');

  // Fetch all live regions
  const { data: regions, isLoading, error } = useQuery({
    queryKey: ['regions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regions')
        .select('*,country:countries(calling_code)')
        .eq('is_live', true)
        .order('name');

      if (error) throw error;
      return data as Region[];
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  // Canonical profile key first; legacy city remains a one-release compatibility read.
  useEffect(() => {
    const preferredRegionId = profile?.region_id ?? profile?.city;
    if (preferredRegionId && regions?.find(r => r.id === preferredRegionId)) {
      setActiveRegionId(preferredRegionId);
    }
  }, [profile?.region_id, profile?.city, regions]);

  const activeRegion = regions?.find(r => r.id === activeRegionId) || regions?.[0] || {
    id: 'lagos',
    slug: 'lagos',
    name: 'Lagos',
    country_code: 'NG',
    administrative_area_code: 'NG-LA',
    administrative_area_name: 'Lagos State',
    currency_code: 'NGN',
    currency_symbol: '₦',
    timezone: 'Africa/Lagos',
    center_lat: 6.5244,
    center_lng: 3.3792,
    default_zoom: 12,
    country: { calling_code: '+234' },
    is_live: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  /**
   * Format a price according to a specific currency code, using the region's country format.
   * If currencyCode isn't provided, it defaults to the active region's currency.
   */
  const formatPrice = (amount: number | null | undefined, currencyCode?: string, isFree?: boolean) => {
    if (isFree || amount === 0) return 'Free';
    if (amount === null || amount === undefined) return '';

    const code = currencyCode || activeRegion.currency_code;

    // For Zambian Kwacha (ZMW) we want a simple 'K' formatting since standard Intl can be weird
    if (code === 'ZMW') {
      return `K ${amount.toLocaleString('en-ZM')}`;
    }

    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: code,
        maximumFractionDigits: 0 // Most of our prices are whole numbers
      }).format(amount);
    } catch {
      // Fallback if the currency code isn't supported by the browser
      return `${code} ${amount.toLocaleString()}`;
    }
  };

  return {
    regions: regions ?? [],
    activeRegion,
    setActiveRegionId,
    formatPrice,
    isLoading,
    error
  };
}

export function useListingReferences(listingKind: 'venue' | 'event', regionId?: string) {
  const categoriesQuery = useQuery({
    queryKey: ['listing-categories', listingKind],
    queryFn: async () => {
      const { data, error } = await supabase.from('listing_categories')
        .select('id,label,applies_to,is_active,sort_order')
        .eq('is_active', true).contains('applies_to', [listingKind]).order('sort_order');
      if (error) throw error;
      return data as ListingCategory[];
    },
    staleTime: 1000 * 60 * 60,
  });
  const vibesQuery = useQuery({
    queryKey: ['listing-vibes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('listing_vibes')
        .select('id,label,is_active,sort_order').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data as ListingVibe[];
    },
    staleTime: 1000 * 60 * 60,
  });
  const areasQuery = useQuery({
    queryKey: ['region-areas', regionId],
    enabled: Boolean(regionId),
    queryFn: async () => {
      const { data, error } = await supabase.from('region_areas')
        .select('id,region_id,slug,name,aliases,source,is_active,sort_order')
        .eq('region_id', regionId!).eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data as RegionArea[];
    },
    staleTime: 1000 * 60 * 60,
  });
  return {
    categories: categoriesQuery.data ?? [],
    vibes: vibesQuery.data ?? [],
    areas: areasQuery.data ?? [],
    isLoading: categoriesQuery.isLoading || vibesQuery.isLoading || areasQuery.isLoading,
    error: categoriesQuery.error || vibesQuery.error || areasQuery.error,
  };
}
