import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface AdminActivityChartProps {
  data: { date: string; count: number }[];
}

/** Biểu đồ cột lượt làm bài 7 ngày — tách riêng để lazy-load Recharts. */
export default function AdminActivityChart({ data }: AdminActivityChartProps) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="date" axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: '#f8fafc' }} />
          <Bar dataKey="count" fill="var(--color-primary-600)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
