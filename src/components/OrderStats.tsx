import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ShoppingBag, DollarSign, TrendingUp, CheckCircle } from 'lucide-react';

interface Order {
  id: string;
  total_price: number;
  status: string | null;
  created_at: string;
}

interface OrderStatsProps {
  orders: Order[];
}

export default function OrderStats({ orders }: OrderStatsProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const todayOrders = orders.filter(o => new Date(o.created_at) >= startOfDay);
    const todayRevenue = todayOrders.reduce((sum, o) => sum + Number(o.total_price), 0);
    const avgValue = todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0;
    const completedToday = todayOrders.filter(o => o.status === 'delivered').length;

    return { todayCount: todayOrders.length, todayRevenue, avgValue, completedToday };
  }, [orders]);

  const items = [
    { label: 'طلبات اليوم', value: stats.todayCount, icon: ShoppingBag, color: 'text-blue-600 bg-blue-100' },
    { label: 'إيرادات اليوم', value: `${stats.todayRevenue.toFixed(0)} ج.م`, icon: DollarSign, color: 'text-emerald-600 bg-emerald-100' },
    { label: 'متوسط الطلب', value: `${stats.avgValue.toFixed(0)} ج.م`, icon: TrendingUp, color: 'text-purple-600 bg-purple-100' },
    { label: 'تم التسليم', value: stats.completedToday, icon: CheckCircle, color: 'text-green-600 bg-green-100' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="flex items-center gap-3 p-4">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${item.color}`}>
              <item.icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-foreground truncate">{item.value}</p>
              <p className="text-xs text-muted-foreground truncate">{item.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
