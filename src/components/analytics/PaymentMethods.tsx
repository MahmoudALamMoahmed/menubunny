import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'كاش',
  card: 'بطاقة',
  wallet: 'محفظة إلكترونية',
};

const COLORS = ['#22c55e', '#3b82f6', '#8b5cf6'];

interface Props {
  data: { name: string; value: number }[];
}

export default function PaymentMethods({ data }: Props) {
  const labeled = data.map(d => ({ ...d, label: PAYMENT_LABELS[d.name] || d.name }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">توزيع طرق الدفع</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">لا توجد بيانات</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={labeled} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={80} label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                {labeled.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number, name: string) => [v, name]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
