import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { fetchApi } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { Award, Calendar, CheckCircle, FileText, ArrowRight, Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import ChartLoading from '../components/ChartLoading';

// Tái dùng biểu đồ đường đã tách chunk riêng cho Recharts.
const ScoreHistoryChart = lazy(() => import('../components/charts/ScoreHistoryChart'));

export default function TranscriptHistory() {
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [minScore, setMinScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [testId, setTestId] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const params = new URLSearchParams();
        if (status) params.set('status', status);
        if (minScore) params.set('minScore', minScore);
        if (maxScore) params.set('maxScore', maxScore);
        const res = await fetchApi(`/tests/attempts/my-history?${params.toString()}`);
        if (res.success || res.status === 'success') {
          setAttempts(res.data?.attempts || []);
        }
      } catch (error) {
        console.error('Lỗi tải lịch sử thi:', error);
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, [status, minScore, maxScore]);

  // Lọc theo đề ở client (danh sách đề suy từ chính lịch sử đã tải).
  const testOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of attempts) {
      if (a.testId && !map.has(a.testId)) map.set(a.testId, a.test?.title || 'Đề thi TOEIC');
    }
    return [...map.entries()];
  }, [attempts]);

  const visible = useMemo(
    () => (testId ? attempts.filter((a) => a.testId === testId) : attempts),
    [attempts, testId],
  );

  // Dữ liệu biểu đồ: các bài đã nộp có điểm, xếp cũ-trước để vẽ đường tiến bộ.
  const chartData = useMemo(
    () =>
      visible
        .filter((a) => a.status === 'SUBMITTED' && typeof a.totalScore === 'number')
        .map((a) => ({ date: a.submittedAt || a.startedAt, score: a.totalScore || 0 }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [visible],
  );

  const trend = useMemo(() => {
    if (chartData.length < 2) return null;
    const diff = chartData[chartData.length - 1].score - chartData[chartData.length - 2].score;
    return diff;
  }, [chartData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="page page-md space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Award className="text-primary-600" /> Bảng Điểm Cá Nhân & Lịch Sử Thi
        </h1>
      </div>

      {/* Biểu đồ tiến bộ điểm số */}
      {chartData.length > 0 && (
        <section className="card">
          <div className="flex items-center justify-between mb-4 gap-3">
            <h2 className="font-bold text-slate-900">Tiến bộ điểm số</h2>
            {trend !== null && (
              <span
                className="badge"
                style={
                  trend > 0
                    ? { background: 'var(--color-success-50)', color: 'var(--color-success-700)' }
                    : trend < 0
                      ? { background: 'var(--color-danger-50)', color: 'var(--color-danger-700)' }
                      : { background: 'var(--color-background)', color: 'var(--color-slate-500)' }
                }
              >
                {trend > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : trend < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                {trend > 0 ? `+${trend}` : trend} điểm vs bài trước
              </span>
            )}
          </div>
          <Suspense fallback={<ChartLoading />}>
            <ScoreHistoryChart data={chartData} />
          </Suspense>
          <p className="text-xs text-slate-500 mt-2">Tính trên {chartData.length} bài đã nộp{testId ? ' của đề đang lọc' : ''}.</p>
        </section>
      )}

      <div className="card p-4 flex flex-wrap gap-3">
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="input w-auto" aria-label="Lọc trạng thái">
          <option value="">Tất cả trạng thái</option><option value="SUBMITTED">Đã nộp</option><option value="IN_PROGRESS">Đang làm</option><option value="ABANDONED">Đã bỏ</option>
        </select>
        <select value={testId} onChange={(event) => setTestId(event.target.value)} className="input w-auto" aria-label="Lọc theo đề thi">
          <option value="">Tất cả đề thi</option>
          {testOptions.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
        </select>
        <input value={minScore} onChange={(event) => setMinScore(event.target.value)} type="number" min="0" max="990" placeholder="Điểm từ" className="input w-28" />
        <input value={maxScore} onChange={(event) => setMaxScore(event.target.value)} type="number" min="0" max="990" placeholder="Điểm đến" className="input w-28" />
      </div>

      {visible.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <FileText className="w-10 h-10 text-primary-400 mx-auto" />
          <p className="text-lg font-semibold text-slate-800">
            {attempts.length === 0 ? 'Bạn chưa có lịch sử làm bài thi nào!' : 'Không có bài nào khớp bộ lọc!'}
          </p>
          <p className="text-sm text-slate-500">
            {attempts.length === 0
              ? 'Hãy tham gia các bài thi TOEIC để ghi nhận kết quả và bảng điểm chi tiết tại đây.'
              : 'Thử đổi trạng thái, đề thi hoặc khoảng điểm.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((item) => (
            <div key={item.id} className="card flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-primary-200 transition-all">
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 text-lg">{item.test?.title || 'Đề thi TOEIC'}</h3>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> {new Date(item.submittedAt || item.startedAt).toLocaleDateString('vi-VN')}
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-success-500" /> Trạng thái: {item.status}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                <div className="text-right">
                  <div className="text-2xl font-extrabold text-primary-600">
                    {item.totalScore || 0} <span className="text-xs font-normal text-slate-400">điểm</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Listening: {item.listeningScore || 0} | Reading: {item.readingScore || 0}
                  </div>
                </div>
                <button
                  onClick={() => navigate(item.status === 'IN_PROGRESS' ? `/tests/${item.testId}/room` : `/tests/review/${item.id}`)}
                  className="btn-primary"
                >
                  {item.status === 'IN_PROGRESS' ? 'Tiếp tục' : 'Xem chi tiết'} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
