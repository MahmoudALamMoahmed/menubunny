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
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const labeled = data.map(d => ({
    ...d,
    label: PAYMENT_LABELS[d.name] || d.name,
    percent: total > 0 ? ((d.value / total) * 100).toFixed(1) : '0',
  }));

  const renderLabel = ({ cx, cy, midAngle, outerRadius, index }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 20;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill={COLORS[index % COLORS.length]} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12} fontWeight={600}>
        {labeled[index].percent}%
      </text>
    );
  };

  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-2">
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: entry.color }} />
            <span className="text-xs text-muted-foreground">{entry.value}</span>
            <span className="text-xs font-semibold" style={{ color: entry.color }}>{labeled[i]?.percent}%</span>
          </div>
        ))}
      </div>
    );
  };

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
              <Pie data={labeled} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={70} label={renderLabel} labelLine={false}>
                {labeled.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number, name: string) => [v, name]} />
              <Legend content={renderLegend} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
