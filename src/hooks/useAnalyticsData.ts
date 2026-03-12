import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, subDays, subMonths, format, getHours, startOfWeek, isWithinInterval } from 'date-fns';
import { ar } from 'date-fns/locale';

export type DatePreset = 'today' | '7days' | '30days' | '3months' | 'all';

export interface AnalyticsFilters {
  preset: DatePreset;
  customFrom?: Date;
  customTo?: Date;
  branchId?: string | null;
  orderSource?: string;
}

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  total: number;
  price: number;
  size?: { name: string; price: number };
  extras?: { name: string; price: number }[];
}

function getDateRange(filters: AnalyticsFilters): { from: Date | null; to: Date } {
  const now = new Date();
  const to = now;
  if (filters.customFrom && filters.customTo) return { from: startOfDay(filters.customFrom), to: filters.customTo };
  switch (filters.preset) {
    case 'today': return { from: startOfDay(now), to };
    case '7days': return { from: startOfDay(subDays(now, 7)), to };
    case '30days': return { from: startOfDay(subDays(now, 30)), to };
    case '3months': return { from: startOfDay(subMonths(now, 3)), to };
    case 'all': return { from: null, to };
  }
}

// Fetch all orders with pagination to bypass the 1000 row limit
async function fetchAllOrders(restaurantId: string, from: Date | null, branchId?: string | null) {
  const PAGE_SIZE = 1000;
  let allData: any[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (from) query = query.gte('created_at', from.toISOString());
    if (branchId) query = query.eq('branch_id', branchId);

    const { data, error } = await query;
    if (error) throw error;
    allData = allData.concat(data ?? []);
    hasMore = (data?.length ?? 0) === PAGE_SIZE;
    page++;
  }
  return allData;
}

export function useAnalyticsData(restaurantId: string | undefined, filters: AnalyticsFilters) {
  const { from, to } = getDateRange(filters);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['analytics_orders', restaurantId, from?.toISOString(), filters.branchId],
    queryFn: () => fetchAllOrders(restaurantId!, from, filters.branchId),
    enabled: !!restaurantId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
  });

  // Filter by custom "to" date if set
  const filteredOrders = useMemo(() => {
    if (!filters.customTo) return orders;
    return orders.filter(o => new Date(o.created_at) <= filters.customTo!);
  }, [orders, filters.customTo]);

  // KPIs
  const kpis = useMemo(() => {
    const total = filteredOrders.length;
    const revenue = filteredOrders.reduce((sum, o) => sum + Number(o.total_price || 0), 0);
    const delivered = filteredOrders.filter(o => o.status === 'delivered').length;
    const cancelled = filteredOrders.filter(o => o.status === 'cancelled').length;
    return {
      totalOrders: total,
      totalRevenue: revenue,
      avgOrderValue: total > 0 ? revenue / total : 0,
      deliveredCount: delivered,
      cancelledCount: cancelled,
      cancellationRate: total > 0 ? (cancelled / total) * 100 : 0,
    };
  }, [filteredOrders]);

  // Determine grouping: daily for <=30 days, weekly otherwise
  const useWeekly = useMemo(() => {
    if (!from) return true;
    const diffDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays > 60;
  }, [from, to]);

  // Revenue & orders over time
  const timeSeriesData = useMemo(() => {
    const map = new Map<string, { date: string; revenue: number; orders: number }>();
    filteredOrders.forEach(order => {
      const d = new Date(order.created_at);
      const key = useWeekly
        ? format(startOfWeek(d, { locale: ar }), 'yyyy-MM-dd')
        : format(d, 'yyyy-MM-dd');
      const existing = map.get(key) || { date: key, revenue: 0, orders: 0 };
      existing.revenue += Number(order.total_price || 0);
      existing.orders += 1;
      map.set(key, existing);
    });
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredOrders, useWeekly]);

  // Status distribution
  const statusDistribution = useMemo(() => {
    const map = new Map<string, number>();
    filteredOrders.forEach(o => {
      const s = o.status || 'pending';
      map.set(s, (map.get(s) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredOrders]);

  // Payment methods
  const paymentMethods = useMemo(() => {
    const map = new Map<string, number>();
    filteredOrders.forEach(o => {
      const m = o.payment_method || 'cash';
      map.set(m, (map.get(m) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredOrders]);

  // Top selling items
  const allItems = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; revenue: number }>();
    filteredOrders.forEach(order => {
      const items = (order.items as OrderItem[]) || [];
      items.forEach(item => {
        const key = item.name;
        const existing = map.get(key) || { name: key, quantity: 0, revenue: 0 };
        existing.quantity += item.quantity || 1;
        existing.revenue += Number(item.total || item.price || 0);
        map.set(key, existing);
      });
    });
    const sorted = Array.from(map.values()).sort((a, b) => b.quantity - a.quantity);
    return sorted;
  }, [filteredOrders]);

  const topItems = useMemo(() => allItems.slice(0, 10), [allItems]);

  // Peak hours
  const peakHours = useMemo(() => {
    const hours = new Array(24).fill(0);
    filteredOrders.forEach(o => {
      const h = getHours(new Date(o.created_at));
      hours[h]++;
    });
    return hours.map((count, hour) => ({ hour: `${hour}:00`, count }));
  }, [filteredOrders]);

  // Branch performance
  const branchPerformance = useMemo(() => {
    const map = new Map<string, { branchId: string; orders: number; revenue: number }>();
    filteredOrders.forEach(order => {
      const bid = order.branch_id || 'no_branch';
      const existing = map.get(bid) || { branchId: bid, orders: 0, revenue: 0 };
      existing.orders += 1;
      existing.revenue += Number(order.total_price || 0);
      map.set(bid, existing);
    });
    return Array.from(map.values());
  }, [filteredOrders]);

  return {
    orders: filteredOrders,
    isLoading,
    kpis,
    timeSeriesData,
    statusDistribution,
    paymentMethods,
    topItems,
    allItems,
    peakHours,
    branchPerformance,
    useWeekly,
  };
}
