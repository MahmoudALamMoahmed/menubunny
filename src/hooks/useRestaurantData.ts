import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

// Type - نوع صنف القائمة (يُستخدم في فلترة select)
type MenuItem = Tables<'menu_items'>;

// ─── إعدادات الكاش ─────────────────────────────────────────
// Cache Config - بيانات المطعم نادراً ما تتغير
const LONG_STALE = 1000 * 60 * 10; // 10 دقائق
const LONG_GC = 1000 * 60 * 30; // 30 دقيقة

// Cache Config - بيانات المنيو تتغير أكثر
const MEDIUM_STALE = 1000 * 60 * 5; // 5 دقائق
const MEDIUM_GC = 1000 * 60 * 15; // 15 دقيقة

// ─── React Query Hooks (للجمهور - مع فلاتر التوفر/النشاط) ──

// React Query - جلب بيانات المطعم بناءً على اسم المستخدم في الرابط
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

// React Query - جلب فئات القائمة (المتاحة فقط) مرتبة حسب display_order
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

// React Query - جلب أصناف القائمة المتاحة مع فلترة حسب الفئة النشطة عبر select
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

// React Query - جلب أحجام الأصناف المتاحة
export function useSizes(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ['sizes', restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sizes')
        .select('*, menu_items!inner(restaurant_id)')
        .eq('menu_items.restaurant_id', restaurantId!)
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

// React Query - جلب الإضافات المتاحة فقط (is_available = true)
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

// React Query - جلب الفروع النشطة فقط (is_active = true)
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

// React Query - جلب مناطق التوصيل النشطة للفروع المحددة
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

// React Query - جلب طرق الدفع لفرع معين
export function useBranchPaymentMethods(branchId: string | undefined) {
  return useQuery({
    queryKey: ['branch_payment_methods', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branch_payment_methods')
        .select('*')
        .eq('branch_id', branchId!)
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!branchId,
    staleTime: LONG_STALE,
    gcTime: LONG_GC,
    refetchOnWindowFocus: false,
  });
}
