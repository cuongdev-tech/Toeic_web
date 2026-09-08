import React, { useState, useEffect, Suspense, lazy } from 'react';
import { fetchApi } from '../lib/api';
import { Users, FileText, Activity, ShieldAlert } from 'lucide-react';
import ChartLoading from '../components/ChartLoading';

// Recharts (~700KB) chỉ tải khi biểu đồ thực sự render.
const AdminActivityChart = lazy(() => import('../components/charts/AdminActivityChart'));

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
    <div className="page page-xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
        <ShieldAlert className="text-primary-600" /> Bảng Điều Hành Quản Trị (Admin Dashboard)
      </h1>

      {/* Thẻ tổng quan hệ thống */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-info-50 text-info-600 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Tổng Học Viên</p>
            <p className="text-2xl font-bold text-slate-900">{stats?.overview?.totalStudents || 0}</p>
          </div>
        </div>

        <div className="card"><p className="text-sm text-slate-500">Học viên hoạt động</p><p className="text-2xl font-bold">{stats?.overview?.activeStudents || 0}</p></div>
        <div className="card"><p className="text-sm text-slate-500">Tỷ lệ hoàn thành</p><p className="text-2xl font-bold">{stats?.overview?.completionRate || 0}%</p></div>
        <div className="card"><p className="text-sm text-slate-500">Điểm trung bình</p><p className="text-2xl font-bold">{stats?.overview?.averageScore || 0}</p></div>

        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Tổng Đề Thi</p>
            <p className="text-2xl font-bold text-slate-900">{stats?.overview?.totalTests || 0}</p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 bg-warning-50 text-warning-500 rounded-xl flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Tổng Lượt Làm Bài</p>
            <p className="text-2xl font-bold text-slate-900">{stats?.overview?.totalAttempts || 0}</p>
          </div>
        </div>
      </div>

      <section className="card"><h2 className="text-lg font-bold text-slate-800 mb-4">Câu hỏi bị sai nhiều nhất</h2><div className="space-y-3">{(stats?.mostMissedQuestions || []).map((question: any) => <div key={question.id} className="flex justify-between gap-4 border-b border-slate-100 pb-3"><p className="text-sm text-slate-700">Part {question.partNumber}: {question.questionText}</p><span className="text-sm font-semibold text-danger-600 whitespace-nowrap">{question.wrongCount} lượt sai</span></div>)}</div></section>

      <section className="card">
        <h2 className="text-lg font-bold text-slate-800 mb-1">Hiệu suất từng đề thi</h2>
        <p className="text-sm text-slate-500 mb-4">Lượt nộp, điểm trung bình và cao nhất theo đề — để biết đề nào quá dễ/khó.</p>
        {(stats?.perTestStats || []).length === 0 ? (
          <p className="text-sm text-slate-500">Chưa có đề thi nào.</p>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <th className="py-2 pr-4 font-semibold">Đề thi</th>
                  <th className="py-2 pr-4 font-semibold whitespace-nowrap">Trạng thái</th>
                  <th className="py-2 pr-4 font-semibold text-right whitespace-nowrap">Số câu</th>
                  <th className="py-2 pr-4 font-semibold text-right whitespace-nowrap">Lượt nộp</th>
                  <th className="py-2 pr-4 font-semibold text-right whitespace-nowrap">Điểm TB</th>
                  <th className="py-2 font-semibold text-right whitespace-nowrap">Cao nhất</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(stats?.perTestStats || []).map((t: any) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="py-3 pr-4 font-medium text-slate-900 max-w-60 truncate" title={t.title}>{t.title}</td>
                    <td className="py-3 pr-4">
                      <span className={`badge ${t.status === 'PUBLISHED' ? 'bg-success-50 text-success-700' : 'bg-warning-50 text-warning-700'}`}>
                        {t.status === 'PUBLISHED' ? 'Đã xuất bản' : 'Nháp'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right text-slate-600">{t.questionCount}</td>
                    <td className="py-3 pr-4 text-right text-slate-600">{t.submittedCount}</td>
                    <td className="py-3 pr-4 text-right font-semibold text-slate-800">{t.submittedCount ? t.averageScore : '—'}</td>
                    <td className="py-3 text-right font-bold text-primary-600">{t.submittedCount ? t.bestScore : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Biểu đồ hoạt động 7 ngày qua */}
      <div className="card">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Lượt làm bài trong 7 ngày qua</h2>
        <Suspense fallback={<ChartLoading />}>
          <AdminActivityChart data={stats?.chartData?.last7DaysAttempts || []} />
        </Suspense>
      </div>
    </div>
  );
}