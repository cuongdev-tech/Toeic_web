import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchApi } from '../lib/api';
import {
  ArrowLeft,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Copy,
  Flame,
  KeyRound,
  Loader2,
  Lock,
  Unlock,
  User,
} from 'lucide-react';
import ChartLoading from '../components/ChartLoading';

const ScoreHistoryChart = lazy(() => import('../components/charts/ScoreHistoryChart'));

export default function AdminUserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadDetail = async () => {
    try {
      const res = await fetchApi(`/admin/users/${userId}/detail`);
      setData(res.data);
    } catch (err: any) {
      alert(err.message || 'Không tải được chi tiết học viên.');
      navigate('/admin/users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const toggleStatus = async () => {
    if (!data) return;
    try {
      await fetchApi(`/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !data.user.isActive }),
      });
      setData({ ...data, user: { ...data.user, isActive: !data.user.isActive } });
    } catch (err: any) {
      alert(err.message || 'Không thể cập nhật trạng thái.');
    }
  };

  const resetPassword = async () => {
    if (!window.confirm(`Đặt lại mật khẩu cho ${data?.user?.fullName}? Mật khẩu tạm chỉ hiện 1 lần.`)) return;
    setResetting(true);
    try {
      const res = await fetchApi(`/admin/users/${userId}/reset-password`, { method: 'POST', body: JSON.stringify({}) });
      setTempPassword(res.data?.tempPassword || null);
      setCopied(false);
    } catch (err: any) {
      alert(err.message || 'Không thể đặt lại mật khẩu.');
    } finally {
      setResetting(false);
    }
  };

  const copyPassword = async () => {
    if (!tempPassword) return;
    try {
      await navigator.clipboard.writeText(tempPassword);
    } catch {
      /* bỏ qua khi clipboard bị chặn */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-primary-600" /></div>;
  if (!data) return null;

  const { user, overview, streak, scoreHistory, recentAttempts, mostMissedQuestions, vocabCount } = data;

  return (
    <div className="page page-xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <button onClick={() => navigate('/admin/users')} className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary-600">
          <ArrowLeft className="w-4 h-4" /> Danh sách học viên
        </button>
        <span className={`badge ${user.isActive ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700'}`}>
          {user.isActive ? 'Đang hoạt động' : 'Đã khóa'}
        </span>
      </div>

      {/* Hồ sơ + hành động */}
      <section className="card flex flex-col md:flex-row md:items-center gap-5">
        <span className="inline-flex items-center justify-center w-16 h-16 rounded-full shrink-0" style={{ background: 'var(--color-primary-50)', color: 'var(--color-primary-600)' }}>
          <User className="w-8 h-8" />
        </span>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 truncate">{user.fullName}</h1>
          <p className="text-sm text-slate-500">{user.email} • Tham gia {new Date(user.createdAt).toLocaleDateString('vi-VN')}</p>
          <p className="text-sm text-slate-500 mt-1">Mục tiêu: <strong className="text-slate-800">{user.targetScore}</strong> • Từ vựng: <strong className="text-slate-800">{vocabCount}</strong></p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={toggleStatus} className="btn-secondary px-4 py-2 text-sm">
            {user.isActive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            {user.isActive ? 'Khóa tài khoản' : 'Mở khóa'}
          </button>
          <button onClick={resetPassword} disabled={resetting} className="btn-admin px-4 py-2 text-sm">
            {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            Đặt lại mật khẩu
          </button>
        </div>
      </section>

      {tempPassword && (
        <section className="card" style={{ background: 'var(--color-warning-50)', borderColor: 'var(--color-warning-200)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-warning-800)' }}>Mật khẩu tạm (chỉ hiện 1 lần — gửi ngay cho học viên):</p>
          <div className="flex items-center gap-3 mt-2">
            <code className="font-mono text-lg font-bold bg-white border border-warning-200 rounded-inner px-4 py-2">{tempPassword}</code>
            <button onClick={copyPassword} className="btn-secondary px-3 py-2 text-sm">
              <Copy className="w-4 h-4" /> {copied ? 'Đã chép' : 'Chép'}
            </button>
            <button onClick={() => setTempPassword(null)} className="text-sm text-slate-500 hover:text-slate-800">Ẩn đi</button>
          </div>
        </section>
      )}

      {/* Stat học tập */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: <Award className="w-5 h-5" />, label: 'Bài đã nộp', value: overview.totalCompleted },
          { icon: <BarChart3 className="w-5 h-5" />, label: 'Điểm cao nhất', value: `${overview.bestScore}/990` },
          { icon: <CheckCircle2 className="w-5 h-5" />, label: 'Điểm trung bình', value: `${overview.averageScore}/990` },
          { icon: <Flame className="w-5 h-5" />, label: 'Streak dài nhất', value: `${streak.longestStreak} ngày` },
        ].map((s) => (
          <div key={s.label} className="card p-5">
            <div className="text-primary-600 mb-2">{s.icon}</div>
            <p className="text-sm text-slate-500">{s.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{s.value}</p>
          </div>
        ))}
      </section>

      {/* Mini chart tiến bộ */}
      {scoreHistory.length > 0 && (
        <section className="card">
          <h2 className="font-bold text-slate-900 mb-4">Tiến bộ điểm số</h2>
          <Suspense fallback={<ChartLoading />}>
            <ScoreHistoryChart data={scoreHistory} />
          </Suspense>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Lịch sử thi */}
        <section className="card">
          <h2 className="font-bold text-slate-900 mb-4">Lịch sử thi gần đây</h2>
          {recentAttempts.length === 0 ? (
            <p className="text-sm text-slate-500">Chưa có lượt thi nào.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentAttempts.map((a: any) => (
                <div key={a.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{a.testTitle}</p>
                    <p className="text-xs text-slate-500">{new Date(a.submittedAt || a.startedAt).toLocaleDateString('vi-VN')} • {a.status}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-bold text-primary-600">{a.status === 'SUBMITTED' ? `${a.totalScore}` : '—'}</span>
                    {a.status === 'SUBMITTED' && (
                      <button onClick={() => navigate(`/tests/review/${a.id}`)} className="text-xs text-primary-600 hover:underline">
                        Xem bài
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Câu sai nhiều */}
        <section className="card">
          <h2 className="font-bold text-slate-900 mb-1 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary-600" /> Câu hay sai nhất
          </h2>
          <p className="text-xs text-slate-500 mb-4">Để gợi ý học viên ôn lại hoặc rà soát chất lượng câu hỏi.</p>
          {(mostMissedQuestions || []).length === 0 ? (
            <p className="text-sm text-slate-500">Chưa có dữ liệu.</p>
          ) : (
            <div className="space-y-3">
              {(mostMissedQuestions || []).map((q: any) => (
                <div key={q.id} className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                  <p className="text-sm text-slate-700">Part {q.partNumber}: {q.questionText}</p>
                  <span className="text-sm font-semibold text-danger-600 whitespace-nowrap">{q.wrongCount} lượt sai</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
