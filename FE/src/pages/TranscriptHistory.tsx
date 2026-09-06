import React, { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { Award, Calendar, CheckCircle, FileText, ArrowRight, Loader2 } from 'lucide-react';

export default function TranscriptHistory() {
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [minScore, setMinScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 font-sans space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Award className="text-indigo-600" /> Bảng Điểm Cá Nhân & Lịch Sử Thi
        </h1>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-3">
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
          <option value="">Tất cả trạng thái</option><option value="SUBMITTED">Đã nộp</option><option value="IN_PROGRESS">Đang làm</option><option value="ABANDONED">Đã bỏ</option>
        </select>
        <input value={minScore} onChange={(event) => setMinScore(event.target.value)} type="number" min="0" max="990" placeholder="Điểm từ" className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-28" />
        <input value={maxScore} onChange={(event) => setMaxScore(event.target.value)} type="number" min="0" max="990" placeholder="Điểm đến" className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-28" />
      </div>

      {attempts.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3 shadow-sm">
          <FileText className="w-10 h-10 text-indigo-400 mx-auto" />
          <p className="text-lg font-semibold text-slate-800">Bạn chưa có lịch sử làm bài thi nào!</p>
          <p className="text-sm text-slate-500">Hãy tham gia các bài thi TOEIC để ghi nhận kết quả và bảng điểm chi tiết tại đây.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {attempts.map((item) => (
            <div key={item.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-indigo-200 transition-all">
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 text-lg">{item.test?.title || 'Đề thi TOEIC'}</h3>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> {new Date(item.submittedAt || item.startedAt).toLocaleDateString('vi-VN')}
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Trạng thái: {item.status}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                <div className="text-right">
                  <div className="text-2xl font-extrabold text-indigo-600">
                    {item.totalScore || 0} <span className="text-xs font-normal text-slate-400">điểm</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Listening: {item.listeningScore || 0} | Reading: {item.readingScore || 0}
                  </div>
                </div>
                <button
                  onClick={() => navigate(item.status === 'IN_PROGRESS' ? `/tests/${item.testId}/room` : `/tests/review/${item.id}`)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 shadow-sm"
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