import React, { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, FileText, Activity, ShieldAlert } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAdminStats = async () => {
      try {
        const res = await fetchApi('/admin/dashboard/stats');
        if (res.success && res.data) {
          setStats(res.data);
        }
      } catch (err) {
        console.error('Lỗi tải thống kê Admin:', err);
      } finally {
        setLoading(false);
      }
    };
    loadAdminStats();
  }, []);

  if (loading) return <div className="p-10 text-center text-slate-500">Đang tải số liệu hệ thống...</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 font-sans space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
        <ShieldAlert className="text-indigo-600" /> Bảng Điều Hành Quản Trị (Admin Dashboard)
      </h1>

      {/* Thẻ tổng quan hệ thống */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Tổng Học Viên</p>
            <p className="text-2xl font-bold text-slate-900">{stats?.overview?.totalStudents || 0}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"><p className="text-sm text-slate-500">Học viên hoạt động</p><p className="text-2xl font-bold">{stats?.overview?.activeStudents || 0}</p></div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"><p className="text-sm text-slate-500">Tỷ lệ hoàn thành</p><p className="text-2xl font-bold">{stats?.overview?.completionRate || 0}%</p></div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"><p className="text-sm text-slate-500">Điểm trung bình</p><p className="text-2xl font-bold">{stats?.overview?.averageScore || 0}</p></div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Tổng Đề Thi</p>
            <p className="text-2xl font-bold text-slate-900">{stats?.overview?.totalTests || 0}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Tổng Lượt Làm Bài</p>
            <p className="text-2xl font-bold text-slate-900">{stats?.overview?.totalAttempts || 0}</p>
          </div>
        </div>
      </div>

      <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"><h2 className="text-lg font-bold text-slate-800 mb-4">Câu hỏi bị sai nhiều nhất</h2><div className="space-y-3">{(stats?.mostMissedQuestions || []).map((question: any) => <div key={question.id} className="flex justify-between gap-4 border-b border-slate-100 pb-3"><p className="text-sm text-slate-700">Part {question.partNumber}: {question.questionText}</p><span className="text-sm font-semibold text-rose-600 whitespace-nowrap">{question.wrongCount} lượt sai</span></div>)}</div></section>

      {/* Biểu đồ hoạt động 7 ngày qua */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Lượt làm bài trong 7 ngày qua</h2>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats?.chartData?.last7DaysAttempts || []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}