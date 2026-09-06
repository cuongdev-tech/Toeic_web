import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Award, BarChart3, Clock, Loader2, Play } from 'lucide-react';
import { fetchApi } from '../lib/api';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface DashboardData {
  overview: { totalCompleted: number; highestScore: number; averageScore: number };
  recentAttempts: any[];
  inProgress: any[];
  weeklyProgress: { date: string; count: number }[];
  scoreHistory?: { date: string; score: number }[];
}

export default function StudentDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [targetScore, setTargetScore] = useState(() => localStorage.getItem('toeicTargetScore') || '700');
  const navigate = useNavigate();

  useEffect(() => {
    fetchApi('/admin/dashboard/student')
      .then((response) => setData(response.data))
      .catch(() => navigate('/login'))
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>;
  if (!data) return null;

  const target = Math.min(990, Math.max(10, Number(targetScore) || 700));
  const progress = Math.min(100, Math.round((data.overview.highestScore / target) * 100));

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">TOEIC Master</p>
        <h1 className="text-3xl font-bold text-slate-900 mt-1">Dashboard học tập</h1>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat icon={<Award />} label="Bài đã hoàn thành" value={data.overview.totalCompleted} />
        <Stat icon={<BarChart3 />} label="Điểm cao nhất" value={`${data.overview.highestScore}/990`} />
        <Stat icon={<Activity />} label="Điểm trung bình" value={`${data.overview.averageScore}/990`} />
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-6"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><h2 className="font-bold text-slate-900">Mục tiêu điểm TOEIC</h2><p className="text-sm text-slate-500 mt-1">Tiến độ dựa trên điểm cao nhất hiện tại.</p></div><label className="flex items-center gap-2 text-sm text-slate-600">Mục tiêu <input type="number" min="10" max="990" step="5" value={targetScore} onChange={(event) => { setTargetScore(event.target.value); localStorage.setItem('toeicTargetScore', event.target.value); }} className="w-24 border border-slate-200 rounded-lg px-3 py-2" /></label></div><div className="mt-5 h-3 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-600 rounded-full transition-all" style={{ width: `${progress}%` }} /></div><p className="text-sm text-slate-500 mt-2">{data.overview.highestScore}/{target} điểm ({progress}%)</p></section>

      {data.inProgress.length > 0 && (
        <section className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6">
          <h2 className="font-bold text-slate-900 mb-4">Bài đang làm dở</h2>
          <div className="space-y-3">
            {data.inProgress.map((attempt) => (
              <div key={attempt.id} className="bg-white rounded-xl p-4 flex items-center justify-between gap-4">
                <div><p className="font-semibold text-slate-900">{attempt.test.title}</p><p className="text-sm text-slate-500">Còn {Math.ceil(attempt.timeRemaining / 60)} phút</p></div>
                <button onClick={() => navigate(`/tests/${attempt.test.id}/room`)} className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg"><Play className="w-4 h-4" /> Tiếp tục</button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5"><h2 className="font-bold text-slate-900">Tiến độ 7 ngày</h2><Link to="/analytics" className="text-sm text-indigo-600">Xem phân tích</Link></div>
        <div className="grid grid-cols-7 gap-2 items-end h-36">
          {data.weeklyProgress.map((day) => <div key={day.date} className="flex flex-col items-center justify-end h-full gap-2"><div className="w-full bg-indigo-500 rounded-t-md" style={{ height: `${Math.max(day.count * 20, day.count ? 12 : 4)}px` }} title={`${day.count} bài`} /><span className="text-[10px] text-slate-500">{day.date.slice(5)}</span></div>)}
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-6"><h2 className="font-bold text-slate-900 mb-4">Biểu đồ điểm</h2><div className="h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.scoreHistory || []}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString('vi-VN', { month: '2-digit', day: '2-digit' })} /><YAxis domain={[0, 990]} /><Tooltip labelFormatter={(value) => new Date(value).toLocaleDateString('vi-VN')} /><Line type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} /></LineChart></ResponsiveContainer></div></section>

      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="font-bold text-slate-900 mb-4">Bài thi gần đây</h2>
        <div className="divide-y divide-slate-100">{data.recentAttempts.map((attempt) => <div key={attempt.id} className="py-4 flex items-center justify-between gap-4"><div><p className="font-medium text-slate-900">{attempt.test.title}</p><p className="text-xs text-slate-500 flex items-center gap-1 mt-1"><Clock className="w-3 h-3" /> {new Date(attempt.startedAt).toLocaleDateString('vi-VN')}</p></div><div className="text-right"><p className="font-bold text-indigo-600">{attempt.status === 'SUBMITTED' ? `${attempt.totalScore}/990` : 'Đang làm'}</p>{attempt.status === 'SUBMITTED' && <Link to={`/tests/review/${attempt.id}`} className="text-xs text-indigo-600">Xem kết quả</Link>}</div></div>)}</div>
      </section>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return <div className="bg-white border border-slate-200 rounded-2xl p-5"><div className="text-indigo-600 mb-3">{icon}</div><p className="text-sm text-slate-500">{label}</p><p className="text-2xl font-bold text-slate-900 mt-1">{value}</p></div>;
}
