import React, { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import { BarChart3, TrendingUp, Award, CheckCircle, Clock, Loader2, AlertCircle } from 'lucide-react';

export default function Analytics() {
  const [overview, setOverview] = useState<any>(null);
  const [weaknesses, setWeaknesses] = useState<any>(null);
  const [targetScore, setTargetScore] = useState(700);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalyticsData = async () => {
      try {
        const [overviewRes, weaknessesRes, profileRes] = await Promise.all([
          fetchApi('/analytics/overview').catch(() => null),
          fetchApi('/analytics/weaknesses').catch(() => null),
          fetchApi('/auth/profile').catch(() => null)
        ]);

        if (overviewRes?.success || overviewRes?.status === 'success') {
          setOverview(overviewRes.data);
        }
        if (weaknessesRes?.success || weaknessesRes?.status === 'success') {
          setWeaknesses(weaknessesRes.data);
        }
        const serverTarget = profileRes?.data?.user?.targetScore;
        if (serverTarget) {
          setTargetScore(serverTarget);
          localStorage.setItem('toeicTargetScore', String(serverTarget));
        } else {
          const cached = Number(localStorage.getItem('toeicTargetScore'));
          if (Number.isInteger(cached) && cached >= 10 && cached <= 990) setTargetScore(cached);
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="page page-lg space-y-8">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <BarChart3 className="text-primary-600" /> Thống Kê & Phân Tích Học Tập Cá Nhân
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card space-y-1">
          <div className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-1.5">
            <Award className="w-4 h-4 text-primary-600" /> Tổng số bài đã thi
          </div>
          <div className="text-3xl font-extrabold text-slate-900">
            {overview?.totalTestsTaken || 0}
          </div>
        </div>

        <div className="card space-y-1">
          <div className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-success-600" /> Điểm cao nhất
          </div>
          <div className="text-3xl font-extrabold text-success-600">
            {overview?.highestScore || 0} <span className="text-xs font-normal text-slate-400">pts</span>
          </div>
        </div>

        <div className="card space-y-1">
          <div className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-info-600" /> Điểm trung bình
          </div>
          <div className="text-3xl font-extrabold text-info-600">
            {overview?.averageScore || 0} <span className="text-xs font-normal text-slate-400">pts</span>
          </div>
        </div>

        <div className="card space-y-1">
          <div className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-warning-600" /> Tổng câu đã làm
          </div>
          <div className="text-3xl font-extrabold text-warning-600">
            {weaknesses?.totalQuestionsAttempted || 0} <span className="text-xs font-normal text-slate-400">câu</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="section-label">Tiến độ tới mục tiêu {targetScore} điểm</h2>
        <div className="card">
          {(() => {
            const best = overview?.highestScore || 0;
            const progress = Math.min(100, Math.round((best / targetScore) * 100));
            const remaining = Math.max(0, targetScore - best);
            return (
              <>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-slate-500">Điểm cao nhất: <strong className="text-slate-900">{best}</strong></span>
                  <span className="text-slate-500">{remaining === 0 ? 'Đã chạm mục tiêu!' : `Còn thiếu ${remaining} điểm`}</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-slate-500 mt-2">Đổi mục tiêu trong Hồ sơ hoặc Dashboard — tự động đồng bộ.</p>
              </>
            );
          })()}
        </div>
        <h2 className="section-label">Độ chính xác chi tiết theo từng Part</h2>
        {!weaknesses || !weaknesses.radarChartByPart ? (
          <div className="bg-warning-50 border border-warning-200 p-6 rounded-card text-warning-800 flex items-center gap-3">
            <AlertCircle className="w-6 h-6 shrink-0" />
            <p className="text-sm">Bạn chưa hoàn thành bài thi nào để hệ thống phân tích chi tiết độ chính xác theo từng Part.</p>
          </div>
        ) : (
          <div className="card space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {weaknesses.radarChartByPart.map((item: any, idx: number) => (
                <div key={idx} className="p-4 bg-slate-50 border border-slate-100 rounded-card flex items-center gap-4">
                  <div className="relative w-16 h-16 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-200 shrink-0">
                    <span className="text-sm font-extrabold text-slate-800">{item.score}%</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-slate-900">{item.subject}</div>
                    <div className="text-xs text-slate-500">Đúng: <strong>{item.rawCorrect}</strong> / {item.rawTotal} câu</div>
                    <div className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block ${
                      item.score >= 70 ? 'bg-success-100 text-success-700' : item.score >= 50 ? 'bg-primary-100 text-primary-700' : 'bg-danger-100 text-danger-700'
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

      <section className="card">
        <h2 className="section-label mb-5">Xu hướng điểm theo thời gian</h2>
        {overview?.scoreHistory?.length ? <div className="space-y-3">{overview.scoreHistory.map((item: any, index: number) => <div key={`${item.date}-${index}`} className="flex items-center gap-3"><span className="w-24 text-xs text-slate-500">{new Date(item.date).toLocaleDateString('vi-VN')}</span><div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-primary-500 rounded-full" style={{ width: `${Math.min(100, (item.score / 990) * 100)}%` }} /></div><span className="w-14 text-right text-sm font-bold text-slate-700">{item.score}</span></div>)}</div> : <p className="text-sm text-slate-500">Chưa có dữ liệu điểm.</p>}
      </section>

      {weaknesses?.radarChartByTag?.length > 0 && <section className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="card"><h2 className="section-label mb-4">Theo kỹ năng</h2><div className="space-y-3">{weaknesses.radarChartByTag.map((item: any) => <div key={item.subject} className="flex items-center justify-between gap-3"><span className="text-sm text-slate-700">{item.subject}</span><span className={`font-bold ${item.score < 50 ? 'text-danger-600' : 'text-success-600'}`}>{item.score}%</span></div>)}</div></div><div className="bg-primary-50 p-6 rounded-2xl border border-primary-100"><h2 className="text-sm font-bold text-primary-900 uppercase tracking-wider mb-4">Đề xuất luyện tập</h2><ul className="space-y-3 text-sm text-primary-900">{weaknesses.radarChartByTag.filter((item: any) => item.score < 70).sort((a: any, b: any) => a.score - b.score).slice(0, 3).map((item: any) => <li key={item.subject}>Luyện thêm <strong>{item.subject}</strong>: {item.rawTotal} câu đã làm, độ chính xác {item.score}%.</li>)}{weaknesses.radarChartByTag.every((item: any) => item.score >= 70) && <li>Bạn đang duy trì tốt các kỹ năng. Hãy thử đề khó hơn để tăng điểm.</li>}</ul></div></section>}
    </div>
  );
}