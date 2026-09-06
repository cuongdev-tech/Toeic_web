import React, { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import { BarChart3, TrendingUp, Award, CheckCircle, Clock, Loader2, AlertCircle } from 'lucide-react';

export default function Analytics() {
  const [overview, setOverview] = useState<any>(null);
  const [weaknesses, setWeaknesses] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalyticsData = async () => {
      try {
        const [overviewRes, weaknessesRes] = await Promise.all([
          fetchApi('/analytics/overview').catch(() => null),
          fetchApi('/analytics/weaknesses').catch(() => null)
        ]);

        if (overviewRes?.success || overviewRes?.status === 'success') {
          setOverview(overviewRes.data);
        }
        if (weaknessesRes?.success || weaknessesRes?.status === 'success') {
          setWeaknesses(weaknessesRes.data);
        }
      } catch (error) {
        console.error('Lỗi tải dữ liệu thống kê:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalyticsData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 font-sans space-y-8">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <BarChart3 className="text-indigo-600" /> Thống Kê & Phân Tích Học Tập Cá Nhân
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-1.5">
            <Award className="w-4 h-4 text-indigo-600" /> Tổng số bài đã thi
          </div>
          <div className="text-3xl font-extrabold text-slate-900">
            {overview?.totalTestsTaken || 0}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-600" /> Điểm cao nhất
          </div>
          <div className="text-3xl font-extrabold text-emerald-600">
            {overview?.highestScore || 0} <span className="text-xs font-normal text-slate-400">pts</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-blue-600" /> Điểm trung bình
          </div>
          <div className="text-3xl font-extrabold text-blue-600">
            {overview?.averageScore || 0} <span className="text-xs font-normal text-slate-400">pts</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-600" /> Tổng câu đã làm
          </div>
          <div className="text-3xl font-extrabold text-amber-600">
            {weaknesses?.totalQuestionsAttempted || 0} <span className="text-xs font-normal text-slate-400">câu</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Độ chính xác chi tiết theo từng Part</h2>
        {!weaknesses || !weaknesses.radarChartByPart ? (
          <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl text-amber-800 flex items-center gap-3">
            <AlertCircle className="w-6 h-6 shrink-0" />
            <p className="text-sm">Bạn chưa hoàn thành bài thi nào để hệ thống phân tích chi tiết độ chính xác theo từng Part.</p>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {weaknesses.radarChartByPart.map((item: any, idx: number) => (
                <div key={idx} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-4">
                  <div className="relative w-16 h-16 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-200 shrink-0">
                    <span className="text-sm font-extrabold text-slate-800">{item.score}%</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-slate-900">{item.subject}</div>
                    <div className="text-xs text-slate-500">Đúng: <strong>{item.rawCorrect}</strong> / {item.rawTotal} câu</div>
                    <div className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block ${
                      item.score >= 70 ? 'bg-emerald-100 text-emerald-700' : item.score >= 50 ? 'bg-indigo-100 text-indigo-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {item.score >= 70 ? 'Tốt' : item.score >= 50 ? 'Khá' : 'Cần cải thiện'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-5">Xu hướng điểm theo thời gian</h2>
        {overview?.scoreHistory?.length ? <div className="space-y-3">{overview.scoreHistory.map((item: any, index: number) => <div key={`${item.date}-${index}`} className="flex items-center gap-3"><span className="w-24 text-xs text-slate-500">{new Date(item.date).toLocaleDateString('vi-VN')}</span><div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, (item.score / 990) * 100)}%` }} /></div><span className="w-14 text-right text-sm font-bold text-slate-700">{item.score}</span></div>)}</div> : <p className="text-sm text-slate-500">Chưa có dữ liệu điểm.</p>}
      </section>

      {weaknesses?.radarChartByTag?.length > 0 && <section className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"><h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Theo kỹ năng</h2><div className="space-y-3">{weaknesses.radarChartByTag.map((item: any) => <div key={item.subject} className="flex items-center justify-between gap-3"><span className="text-sm text-slate-700">{item.subject}</span><span className={`font-bold ${item.score < 50 ? 'text-rose-600' : 'text-emerald-600'}`}>{item.score}%</span></div>)}</div></div><div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100"><h2 className="text-sm font-bold text-indigo-900 uppercase tracking-wider mb-4">Đề xuất luyện tập</h2><ul className="space-y-3 text-sm text-indigo-900">{weaknesses.radarChartByTag.filter((item: any) => item.score < 70).sort((a: any, b: any) => a.score - b.score).slice(0, 3).map((item: any) => <li key={item.subject}>Luyện thêm <strong>{item.subject}</strong>: {item.rawTotal} câu đã làm, độ chính xác {item.score}%.</li>)}{weaknesses.radarChartByTag.every((item: any) => item.score >= 70) && <li>Bạn đang duy trì tốt các kỹ năng. Hãy thử đề khó hơn để tăng điểm.</li>}</ul></div></section>}
    </div>
  );
}