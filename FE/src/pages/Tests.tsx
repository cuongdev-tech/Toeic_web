import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchApi } from '../lib/api';
import { Clock, Play, FileText, AlertCircle, Loader2 } from 'lucide-react';

interface Test {
  id: string;
  title: string;
  description?: string;
  duration: number;
}

export default function Tests() {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const loadTests = async () => {
      try {
        const res = await fetchApi('/tests');
        if (res.success || res.status === 'success') {
          setTests(res.data?.tests || res.data || []);
        }
      } catch (err: any) {
        if (err.message === 'Unauthorized' || err.message === 'Invalid token') {
          // Token expired or invalid
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        } else {
          setError(err.message || 'Không thể tải danh sách đề thi.');
        }
      } finally {
        setLoading(false);
      }
    };

    loadTests();
  }, [navigate]);

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="relative mb-8 overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-8 text-white shadow-xl shadow-indigo-200/40 sm:px-10 sm:py-10">
          <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full border-[28px] border-indigo-400/20" />
          <div className="relative max-w-2xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Luyện tập có chủ đích</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Thư viện đề thi TOEIC</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            Khám phá các đề thi đa dạng, được biên soạn theo chuẩn cấu trúc mới nhất giúp bạn tự tin đạt điểm cao.
          </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-xl flex items-start gap-3 mb-8 shadow-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-base font-medium">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
            <p className="font-medium text-lg">Đang tải danh sách đề thi...</p>
          </div>
        ) : tests.length === 0 && !error ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Chưa có đề thi nào</h3>
            <p className="text-slate-500 max-w-sm mx-auto">
              Hệ thống hiện tại chưa cập nhật đề thi. Vui lòng quay lại sau!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tests.map((test) => (
              <div 
                key={test.id} 
                className="group flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgba(25,35,60,0.05)] transition-all hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-100/50"
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                      Mock Test
                    </span>
                    <div className="flex items-center text-slate-500 text-sm font-medium">
                      <Clock className="w-4 h-4 mr-1.5" />
                      {test.duration} phút
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2">
                    {test.title}
                  </h3>
                  
                  {test.description ? (
                    <p className="text-slate-500 text-sm line-clamp-3 mb-6">
                      {test.description}
                    </p>
                  ) : (
                    <p className="text-slate-500 text-sm mb-6 italic">
                      Đề thi thử TOEIC chuẩn cấu trúc mới. Tổng cộng 200 câu hỏi Nghe và Đọc.
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 mt-auto">
                    <button 
                    onClick={() => navigate(`/tests/${test.id}/room`)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 py-3 font-medium text-white shadow-sm transition-colors hover:bg-indigo-600"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Bắt đầu thi
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
