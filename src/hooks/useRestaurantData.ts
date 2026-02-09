import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Restaurant = Tables<'restaurants'>;
type Category = Tables<'categories'>;
type MenuItem = Tables<'menu_items'>;
type Size = Tables<'sizes'>;
type Extra = Tables<'extras'>;
type Branch = Tables<'branches'>;
type DeliveryArea = Tables<'delivery_areas'>;

// بيانات المطعم نادراً ما تتغير
const LONG_STALE = 1000 * 60 * 10; // 10 دقائق
const LONG_GC = 1000 * 60 * 30; // 30 دقيقة

// بيانات المنيو تتغير أكثر
const MEDIUM_STALE = 1000 * 60 * 5; // 5 دقائق
const MEDIUM_GC = 1000 * 60 * 15; // 15 دقيقة

export function useRestaurant(username: string | undefined) {
  return useQuery({
    queryKey: ['restaurant', username],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('username', username!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!username,
    staleTime: LONG_STALE,
    gcTime: LONG_GC,
    refetchOnWindowFocus: false,
  });
}

export function useCategories(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ['categories', restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurantId!)
        .order('display_order');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!restaurantId,
    staleTime: LONG_STALE,
    gcTime: LONG_GC,
    refetchOnWindowFocus: false,
  });
}

export function useMenuItems(restaurantId: string | undefined, activeCategory?: string) {
  return useQuery({
    queryKey: ['menu_items', restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurantId!)
        .eq('is_available', true)
        .order('display_order');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!restaurantId,
    staleTime: MEDIUM_STALE,
    gcTime: MEDIUM_GC,
    refetchOnWindowFocus: false,
    select: activeCategory && activeCategory !== 'all'
      ? (data: MenuItem[]) => data.filter(item => item.category_id === activeCategory)
      : undefined,
  });
}

export function useSizes(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ['sizes', restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sizes')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!restaurantId,
    staleTime: MEDIUM_STALE,
    gcTime: MEDIUM_GC,
    refetchOnWindowFocus: false,
  });
}

export function useExtras(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ['extras', restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('extras')
        .select('*')
        .eq('restaurant_id', restaurantId!)
        .eq('is_available', true)
        .order('display_order');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!restaurantId,
    staleTime: MEDIUM_STALE,
    gcTime: MEDIUM_GC,
    refetchOnWindowFocus: false,
  });
}

export function useBranches(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ['branches', restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('restaurant_id', restaurantId!)
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!restaurantId,
    staleTime: LONG_STALE,
    gcTime: LONG_GC,
    refetchOnWindowFocus: false,
  });
}

export function useDeliveryAreas(branchIds: string[] | undefined) {
  return useQuery({
    queryKey: ['delivery_areas', branchIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_areas')
        .select('*')
        .in('branch_id', branchIds!)
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!branchIds && branchIds.length > 0,
    staleTime: LONG_STALE,
    gcTime: LONG_GC,
    refetchOnWindowFocus: false,
  });
}
