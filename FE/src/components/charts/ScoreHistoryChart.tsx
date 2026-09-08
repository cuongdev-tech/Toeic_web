import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface ScoreHistoryChartProps {
  data: { date: string; score: number }[];
}

/** Biểu đồ đường lịch sử điểm — tách riêng để lazy-load Recharts. */
export default function ScoreHistoryChart({ data }: ScoreHistoryChartProps) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(value) => new Date(value).toLocaleDateString('vi-VN', { month: '2-digit', day: '2-digit' })}
          />
          <YAxis domain={[0, 990]} />
          <Tooltip labelFormatter={(value) => new Date(value).toLocaleDateString('vi-VN')} />
          <Line type="monotone" dataKey="score" stroke="var(--color-primary-600)" strokeWidth={3} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
