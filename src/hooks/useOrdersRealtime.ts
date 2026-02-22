import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface UseOrdersRealtimeOptions {
  filterColumn: 'restaurant_id' | 'branch_id';
  filterValue: string | undefined;
  queryKey: (string | undefined)[];
}

export function useOrdersRealtime({ filterColumn, filterValue, queryKey }: UseOrdersRealtimeOptions) {
  const queryClient = useQueryClient();
  const processedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!filterValue) return;

    const channelName = `orders-${filterColumn}-${filterValue}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `${filterColumn}=eq.${filterValue}`,
        },
        (payload) => {
          const newOrder = payload.new as { id: string; customer_name: string };

          // تجنب عرض toast مكرر لنفس الطلب
          if (processedIds.current.has(newOrder.id)) return;
          processedIds.current.add(newOrder.id);

          // تحديث البيانات
          queryClient.invalidateQueries({ queryKey });

          // عرض اشعار
          toast({
            title: '🔔 طلب جديد!',
            description: newOrder.customer_name,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `${filterColumn}=eq.${filterValue}`,
        },
        () => {
          // تحديث صامت بدون toast
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filterColumn, filterValue, JSON.stringify(queryKey)]);
}
