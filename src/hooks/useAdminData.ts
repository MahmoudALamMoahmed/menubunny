import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Admin hooks fetch ALL data (no availability/active filters)
// Shorter stale times since admin data should be fresh
const ADMIN_STALE = 1000 * 60 * 2; // 2 دقائق
const ADMIN_GC = 1000 * 60 * 10; // 10 دقائق

export function useAdminCategories(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ['admin_categories', restaurantId],
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
    staleTime: ADMIN_STALE,
    gcTime: ADMIN_GC,
    refetchOnWindowFocus: false,
  });
}

export function useAdminMenuItems(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ['admin_menu_items', restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurantId!)
        .order('display_order');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!restaurantId,
    staleTime: ADMIN_STALE,
    gcTime: ADMIN_GC,
    refetchOnWindowFocus: false,
  });
}

export function useAdminSizes(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ['admin_sizes', restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sizes')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!restaurantId,
    staleTime: ADMIN_STALE,
    gcTime: ADMIN_GC,
    refetchOnWindowFocus: false,
  });
}

export function useAdminExtras(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ['admin_extras', restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('extras')
        .select('*')
        .eq('restaurant_id', restaurantId!)
        .order('display_order');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!restaurantId,
    staleTime: ADMIN_STALE,
    gcTime: ADMIN_GC,
    refetchOnWindowFocus: false,
  });
}

export function useAdminBranches(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ['admin_branches', restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('restaurant_id', restaurantId!)
        .order('display_order');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!restaurantId,
    staleTime: ADMIN_STALE,
    gcTime: ADMIN_GC,
    refetchOnWindowFocus: false,
  });
}

export function useAdminDeliveryAreas(branchIds: string[] | undefined) {
  return useQuery({
    queryKey: ['admin_delivery_areas', branchIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_areas')
        .select('*')
        .in('branch_id', branchIds!)
        .order('display_order');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!branchIds && branchIds.length > 0,
    staleTime: ADMIN_STALE,
    gcTime: ADMIN_GC,
    refetchOnWindowFocus: false,
  });
}

export function useAdminOrders(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ['admin_orders', restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurantId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!restaurantId,
    staleTime: 1000 * 60, // دقيقة واحدة - الطلبات تتغير بسرعة
    gcTime: ADMIN_GC,
    refetchOnWindowFocus: false,
  });
}
