import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Props {
  data: { date: string; orders: number }[];
  isWeekly: boolean;
}

export default function OrdersChart({ data, isWeekly }: Props) {
  const formatted = data.map(d => ({
    ...d,
    label: format(new Date(d.date), isWeekly ? 'dd MMM' : 'dd/MM', { locale: ar }),
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">عدد الطلبات عبر الزمن</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">لا توجد بيانات</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={formatted} margin={{ left: 30, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" fontSize={12} />
              <YAxis fontSize={12} width={80} tickMargin={20} />
              <Tooltip formatter={(v: number) => [v, 'طلبات']} />
              <Bar dataKey="orders" fill="hsl(14, 88%, 55%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
