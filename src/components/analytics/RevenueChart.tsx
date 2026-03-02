import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Props {
  data: { date: string; revenue: number }[];
  isWeekly: boolean;
}

export default function RevenueChart({ data, isWeekly }: Props) {
  const formatted = data.map(d => ({
    ...d,
    label: format(new Date(d.date), isWeekly ? 'dd MMM' : 'dd/MM', { locale: ar }),
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">الإيرادات عبر الزمن</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">لا توجد بيانات</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={formatted} margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" fontSize={12} />
              <YAxis fontSize={12} width={60} tickMargin={8} />
              <Tooltip formatter={(v: number) => [`${v.toLocaleString('ar-EG')} ج.م`, 'الإيرادات']} />
              <Area type="monotone" dataKey="revenue" stroke="hsl(14, 88%, 35%)" fill="hsl(14, 88%, 35%)" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
