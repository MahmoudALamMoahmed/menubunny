import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ─── إعدادات الكاش ─────────────────────────────────────────
// Cache Config - بيانات الأدمن تحتاج تحديث أسرع من بيانات الجمهور
const ADMIN_STALE = 1000 * 60 * 2; // 2 دقائق
const ADMIN_GC = 1000 * 60 * 10; // 10 دقائق

// ─── React Query Hooks (للأدمن - بدون فلاتر، جميع البيانات) ──

// React Query - جلب جميع الفئات (بدون فلترة) للإدارة
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

// React Query - جلب جميع أصناف القائمة (بدون فلترة is_available) للإدارة
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

// React Query - جلب جميع الأحجام للإدارة
export function useAdminSizes(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ['admin_sizes', restaurantId],
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
    staleTime: ADMIN_STALE,
    gcTime: ADMIN_GC,
    refetchOnWindowFocus: false,
  });
}

// React Query - جلب جميع الإضافات (بدون فلترة is_available) للإدارة
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

// React Query - جلب جميع الفروع (بدون فلترة is_active) للإدارة
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

// React Query - جلب جميع مناطق التوصيل (بدون فلترة is_active) للإدارة
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

// React Query - جلب جميع الطلبات مرتبة من الأحدث (stale أقصر لأن الطلبات تتغير بسرعة)
export function useAdminOrders(restaurantId: string | undefined, orderSource?: string) {
  return useQuery({
    queryKey: ['admin_orders', restaurantId, orderSource],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurantId!)
        .order('created_at', { ascending: false });
      if (orderSource) query = query.eq('order_source' as any, orderSource);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!restaurantId,
    staleTime: 1000 * 60,
    gcTime: ADMIN_GC,
    refetchOnWindowFocus: false,
  });
}

// React Query - جلب طلبات فرع محدد (لموظف الفرع)
export function useBranchOrders(branchId: string | undefined) {
  return useQuery({
    queryKey: ['branch_orders', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('branch_id', branchId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!branchId,
    staleTime: 1000 * 60,
    gcTime: ADMIN_GC,
    refetchOnWindowFocus: false,
  });
}

// React Query - جلب قائمة حسابات موظفي الفروع لمطعم معين
export function useBranchStaffList(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ['branch_staff_list', restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branch_staff')
        .select('*')
        .eq('restaurant_id', restaurantId!);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!restaurantId,
    staleTime: ADMIN_STALE,
    gcTime: ADMIN_GC,
    refetchOnWindowFocus: false,
  });
}

