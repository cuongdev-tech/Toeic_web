import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock,
  Compass,
  Ear,
  Flame,
  Loader2,
  Medal,
  Play,
  Target,
  Trophy,
  X,
} from 'lucide-react';
import { fetchApi } from '../lib/api';
import ChartLoading from '../components/ChartLoading';

// Recharts chỉ tải khi biểu đồ điểm thực sự render.
const ScoreHistoryChart = lazy(() => import('../components/charts/ScoreHistoryChart'));

interface WeekDot {
  date: string;
  done: boolean;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  fullName: string;
  highestScore: number;
  totalCompleted: number;
  isMe: boolean;
}

interface StudyPlanItem {
  partNumber: number;
  accuracy: number;
  answered: number;
  correct: number;
  unresolvedMistakes: number;
  recommendedTest: { id: string; title: string; duration: number; partCount: number } | null;
  suggestedTopic: { id: string; title: string; remaining: number } | null;
}

interface DashboardData {
  overview: {
    totalCompleted: number;
    highestScore: number;
    averageScore: number;
    totalCorrectAnswers: number;
    totalAnswered: number;
    accuracy: number;
  };
  streak: { currentStreak: number; longestStreak: number; todayDone: boolean; weekDots: WeekDot[] };
  leaderboard: LeaderboardEntry[];
  currentRank: number | null;
  studyPlan?: StudyPlanItem[];
  me: { id: string; fullName: string };
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
  // Chống race: không PATCH giá trị khởi tạo, không để GET chậm ghi đè sửa tay của user.
  const targetDirtyRef = React.useRef(false);
  const skipTargetSaveRef = React.useRef(true);
  // Huy hiệu mới mở khóa kể từ lần xem trước (để toast chúc mừng).
  const [newUnlocks, setNewUnlocks] = useState<{ id: string; name: string; description: string }[]>([]);

  useEffect(() => {
    fetchApi('/admin/dashboard/student')
      .then((response) => setData(response.data))
      .catch(() => navigate('/login'))
      .finally(() => setLoading(false));
    // Đồng bộ mục tiêu từ server (đồng bộ đa thiết bị), fallback localStorage khi offline.
    fetchApi('/auth/profile')
      .then((response) => {
        const serverTarget = response.data?.user?.targetScore;
        if (serverTarget && !targetDirtyRef.current) {
          setTargetScore(String(serverTarget));
          localStorage.setItem('toeicTargetScore', String(serverTarget));
        }
      })
      .catch(() => undefined);
    // So huy hiệu đã mở với lần xem trước: lần đầu chỉ ghi nhận im lặng (tránh bão toast),
    // các lần sau toast những huy hiệu mới.
    fetchApi('/analytics/achievements')
      .then((response) => {
        const list: { id: string; name: string; description: string; unlocked: boolean }[] =
          response.data?.achievements || [];
        const unlockedIds = list.filter((a) => a.unlocked).map((a) => a.id);
        let seen: string[] | null = null;
        try {
          const raw = JSON.parse(localStorage.getItem('toeic-seen-achievements') || 'null');
          seen = Array.isArray(raw) ? raw : null;
        } catch {
          seen = null;
        }
        if (seen === null) {
          try {
            localStorage.setItem('toeic-seen-achievements', JSON.stringify(unlockedIds));
          } catch { /* bỏ qua */ }
        } else {
          const fresh = list.filter((a) => a.unlocked && !seen.includes(a.id));
          if (fresh.length) {
            setNewUnlocks(fresh);
            try {
              localStorage.setItem('toeic-seen-achievements', JSON.stringify(unlockedIds));
            } catch { /* bỏ qua */ }
          }
        }
      })
      .catch(() => undefined);
  }, [navigate]);

  // Tự ẩn toast chúc mừng sau 6 giây.
  useEffect(() => {
    if (!newUnlocks.length) return;
    const timer = setTimeout(() => setNewUnlocks([]), 6000);
    return () => clearTimeout(timer);
  }, [newUnlocks]);

  // Lưu mục tiêu lên server (debounce để không spam API từng phím).
  useEffect(() => {
    if (skipTargetSaveRef.current) {
      skipTargetSaveRef.current = false;
      return;
    }
    const value = Math.min(990, Math.max(10, Number(targetScore) || 700));
    const timer = setTimeout(() => {
      fetchApi('/auth/profile', { method: 'PATCH', body: JSON.stringify({ targetScore: value }) })
        .then((response) => {
          const saved = response.data?.user?.targetScore;
          if (saved) localStorage.setItem('toeicTargetScore', String(saved));
        })
        .catch(() => undefined);
    }, 600);
    return () => clearTimeout(timer);
  }, [targetScore]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary-600" /></div>;
  if (!data) return null;

  const target = Math.min(990, Math.max(10, Number(targetScore) || 700));
  const progress = Math.min(100, Math.round((data.overview.highestScore / target) * 100));
  const streak = data.streak ?? { currentStreak: 0, longestStreak: 0, todayDone: false, weekDots: [] };
  const leaderboard = data.leaderboard ?? [];

  return (
    <div className="page page-xl space-y-8">
      {/* Header: tiêu đề + badge động lực (Streak / Hạng) */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary-600">TOEIC Master</p>
          <h1 className="text-3xl font-bold text-slate-900 mt-1">Dashboard học tập</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <span
            className="badge"
            style={{ background: 'var(--color-warning-50)', color: 'var(--color-warning-700)', border: '1px solid var(--color-warning-200)' }}
          >
            <Flame className="w-3.5 h-3.5" /> Streak {streak.currentStreak} ngày
          </span>
          {data.currentRank && (
            <span
              className="badge"
              style={{ background: 'var(--color-primary-50)', color: 'var(--color-primary-700)', border: '1px solid var(--color-primary-200)' }}
            >
              <Trophy className="w-3.5 h-3.5" /> Hạng #{data.currentRank}
            </span>
          )}
        </div>
      </div>

      {/* Hàng Stat: 4 thẻ .card — Bài làm / Điểm cao nhất / Câu đúng / Streak */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={<Award />} label="Bài đã hoàn thành" value={data.overview.totalCompleted} />
        <Stat icon={<BarChart3 />} label="Điểm cao nhất" value={`${data.overview.highestScore}/990`} />
        <Stat
          icon={<CheckCircle2 />}
          label="Câu trả lời đúng"
          value={`${data.overview.totalCorrectAnswers}/${data.overview.totalAnswered}`}
          sub={data.overview.totalAnswered ? `Độ chính xác ${data.overview.accuracy}%` : 'Chưa có dữ liệu'}
          accent="var(--color-success-600)"
        />
        <Stat
          icon={<Flame />}
          label="Chuỗi ngày học"
          value={`${streak.currentStreak} ngày`}
          sub={streak.todayDone ? 'Hôm nay đã học — giữ lửa!' : 'Hôm nay chưa học — làm 1 bài nhé!'}
          accent="var(--color-warning-500)"
        />
      </section>

      {/* Lộ trình ôn hôm nay: 3 Part yếu nhất + hành động cụ thể */}
      <StudyPlanSection plan={data.studyPlan ?? []} totalAnswered={data.overview.totalAnswered} />

      {/* Layout 2 cột: trái nội dung học tập, phải động lực (Streak + BXH mini) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <section className="card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-bold text-slate-900 flex items-center gap-2"><Target className="w-4 h-4" style={{ color: 'var(--color-primary-600)' }} /> Mục tiêu điểm TOEIC</h2>
                <p className="text-sm text-slate-500 mt-1">Tiến độ dựa trên điểm cao nhất hiện tại.</p>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                Mục tiêu
                <input
                  type="number" min="10" max="990" step="5" value={targetScore}
                  onChange={(event) => { targetDirtyRef.current = true; setTargetScore(event.target.value); localStorage.setItem('toeicTargetScore', event.target.value); }}
                  className="input w-24"
                />
              </label>
            </div>
            <div className="mt-5 h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: 'var(--color-primary-600)' }} />
            </div>
            <p className="text-sm text-slate-500 mt-2">{data.overview.highestScore}/{target} điểm ({progress}%)</p>
          </section>

          {data.inProgress.length > 0 && (
            <section className="rounded-card p-6 border" style={{ background: 'var(--color-primary-50)', borderColor: 'var(--color-primary-100)' }}>
              <h2 className="font-bold text-slate-900 mb-4">Bài đang làm dở</h2>
              <div className="space-y-3">
                {data.inProgress.map((attempt) => (
                  <div key={attempt.id} className="bg-white rounded-inner p-4 flex items-center justify-between gap-4">
                    <div><p className="font-semibold text-slate-900">{attempt.test.title}</p><p className="text-sm text-slate-500">Còn {Math.ceil(attempt.timeRemaining / 60)} phút</p></div>
                    <button onClick={() => navigate(`/tests/${attempt.test.id}/room`)} className="btn-primary px-4 py-2"><Play className="w-4 h-4" /> Tiếp tục</button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="card">
            <div className="flex items-center justify-between mb-5"><h2 className="font-bold text-slate-900">Tiến độ 7 ngày</h2><Link to="/analytics" className="text-sm text-primary-600">Xem phân tích</Link></div>
            <div className="grid grid-cols-7 gap-2 items-end h-36">
              {data.weeklyProgress.map((day) => <div key={day.date} className="flex flex-col items-center justify-end h-full gap-2"><div className="w-full bg-primary-500 rounded-t-md" style={{ height: `${Math.max(day.count * 20, day.count ? 12 : 4)}px` }} title={`${day.count} bài`} /><span className="text-[10px] text-slate-500">{day.date.slice(5)}</span></div>)}
            </div>
          </section>

          <section className="card"><h2 className="font-bold text-slate-900 mb-4">Biểu đồ điểm</h2><Suspense fallback={<ChartLoading />}><ScoreHistoryChart data={data.scoreHistory || []} /></Suspense></section>

          <section className="card">
            <h2 className="font-bold text-slate-900 mb-4">Bài thi gần đây</h2>
            <div className="divide-y divide-slate-100">{data.recentAttempts.map((attempt) => <div key={attempt.id} className="py-4 flex items-center justify-between gap-4"><div><p className="font-medium text-slate-900">{attempt.test.title}</p><p className="text-xs text-slate-500 flex items-center gap-1 mt-1"><Clock className="w-3 h-3" /> {new Date(attempt.startedAt).toLocaleDateString('vi-VN')}</p></div><div className="text-right"><p className="font-bold text-primary-600">{attempt.status === 'SUBMITTED' ? `${attempt.totalScore}/990` : 'Đang làm'}</p>{attempt.status === 'SUBMITTED' && <Link to={`/tests/review/${attempt.id}`} className="text-xs text-primary-600">Xem kết quả</Link>}</div></div>)}</div>
          </section>
        </div>

        {/* Cột động lực */}
        <div className="space-y-6">
          <StreakCard streak={streak} />
          <LeaderboardCard leaderboard={leaderboard} currentRank={data.currentRank} />
          <section className="card" style={{ background: 'var(--color-success-50)', borderColor: 'var(--color-success-200)' }}>
            <p className="section-label" style={{ color: 'var(--color-success-700)' }}>Mẹo giữ lửa</p>
            <p className="text-sm mt-2" style={{ color: 'var(--color-success-800)' }}>
              Chỉ cần 1 bài thi mỗi ngày là streak không đứt. Lên hạng BXH bằng cách phá kỷ lục điểm của chính bạn.
            </p>
            <Link to="/tests" className="btn-success mt-4 w-full"><Activity className="w-4 h-4" /> Làm bài ngay</Link>
          </section>
        </div>
      </div>

      {/* Toast chúc mừng huy hiệu mới mở khóa */}
      {newUnlocks.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm space-y-2" role="status" aria-live="polite">
          {newUnlocks.slice(0, 3).map((a) => (
            <div
              key={a.id}
              className="card p-4 flex items-center gap-3"
              style={{ borderColor: 'var(--color-warning-300)', background: 'var(--color-warning-50)', boxShadow: 'var(--shadow-card-hover)' }}
            >
              <span
                className="inline-flex items-center justify-center w-11 h-11 rounded-full shrink-0"
                style={{ background: 'var(--color-warning-500)', color: '#fff' }}
              >
                <Medal className="w-5 h-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900">Mở khóa: {a.name}!</p>
                <p className="text-xs text-slate-500 truncate">{a.description}</p>
                <Link to="/achievements" className="text-xs font-semibold text-primary-600 hover:underline">Xem huy hiệu</Link>
              </div>
              <button onClick={() => setNewUnlocks((prev) => prev.filter((x) => x.id !== a.id))} aria-label="Đóng thông báo" className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub?: string; accent?: string }) {
  return (
    <div className="card p-5">
      <div className="mb-3" style={{ color: accent ?? 'var(--color-primary-600)' }}>{icon}</div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

const PART_NAMES: Record<number, string> = {
  1: 'Mô tả tranh',
  2: 'Hỏi — đáp',
  3: 'Hội thoại ngắn',
  4: 'Bài nói ngắn',
  5: 'Hoàn thành câu',
  6: 'Hoàn thành đoạn văn',
  7: 'Đọc hiểu',
};

const isListeningPart = (part: number) => part >= 1 && part <= 4;

/** Lộ trình ôn hôm nay: 3 Part yếu nhất, mỗi thẻ đi kèm hành động 1 chạm. */
function StudyPlanSection({ plan, totalAnswered }: { plan: StudyPlanItem[]; totalAnswered: number }) {
  if (plan.length === 0) {
    return (
      <section className="card" style={{ background: 'var(--color-primary-50)', borderColor: 'var(--color-primary-100)' }}>
        <h2 className="font-bold text-slate-900 flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white">
            <Compass className="w-4 h-4" style={{ color: 'var(--color-primary-600)' }} />
          </span>
          Bắt đầu từ 3 bước nhỏ
        </h2>
        <p className="text-sm text-slate-500 mt-1">Làm xong 1 đề, hệ thống sẽ vẽ lộ trình riêng theo điểm yếu của bạn.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          {[
            { step: '1', title: 'Làm 1 đề Sprint 30', desc: 'Đề ngắn, đủ mặt kỹ năng', to: '/tests', icon: <Play className="w-4 h-4" /> },
            { step: '2', title: 'Nạp 10 từ vựng mẫu', desc: 'Sổ tay từ + flashcard', to: '/vocab', icon: <BookOpen className="w-4 h-4" /> },
            { step: '3', title: 'Đặt mục tiêu điểm', desc: 'Để đo tiến độ mỗi ngày', to: '/profile', icon: <Target className="w-4 h-4" /> },
          ].map((s) => (
            <Link key={s.step} to={s.to} className="bg-white rounded-inner border border-slate-200 p-4 flex items-start gap-3 hover:border-primary-300 transition-colors">
              <span className="badge justify-center min-w-7" style={{ background: 'var(--color-primary-600)', color: '#fff' }}>{s.step}</span>
              <span>
                <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">{s.icon} {s.title}</span>
                <span className="block text-xs text-slate-500 mt-0.5">{s.desc}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="card" style={{ background: 'var(--color-primary-50)', borderColor: 'var(--color-primary-100)' }}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-bold text-slate-900 flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white">
            <Compass className="w-4 h-4" style={{ color: 'var(--color-primary-600)' }} />
          </span>
          Hôm nay nên học gì
        </h2>
        <span className="badge bg-white text-primary-700 border border-primary-200">3 Part yếu nhất</span>
      </div>
      <p className="text-sm text-slate-500 mt-1">Tính từ {totalAnswered} câu bạn đã làm — mỗi thẻ là một việc xong trong 15–30 phút.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {plan.map((item, i) => {
          const listening = isListeningPart(item.partNumber);
          const barColor = item.accuracy < 50 ? 'var(--color-danger-500)' : item.accuracy < 70 ? 'var(--color-warning-500)' : 'var(--color-success-500)';
          return (
            <div key={item.partNumber} className="bg-white rounded-inner border border-slate-200 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className="badge" style={i === 0 ? { background: 'var(--color-warning-500)', color: '#fff' } : { background: 'var(--color-background)', color: 'var(--color-slate-500)' }}>
                  {i === 0 ? 'Ưu tiên #1' : `#${i + 1}`}
                </span>
                <span
                  className="inline-flex items-center justify-center w-8 h-8 rounded-full"
                  style={listening ? { background: 'var(--color-info-50)', color: 'var(--color-info-600)' } : { background: 'var(--color-success-50)', color: 'var(--color-success-600)' }}
                  title={listening ? 'Kỹ năng Nghe' : 'Kỹ năng Đọc'}
                >
                  {listening ? <Ear className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                </span>
              </div>
              <div>
                <p className="font-bold text-slate-900">Part {item.partNumber} — {PART_NAMES[item.partNumber] ?? 'Luyện tập'}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Đúng {item.correct}/{item.answered} câu
                  {item.unresolvedMistakes > 0 && <> • <span className="font-semibold text-danger-600">{item.unresolvedMistakes} câu cần ôn</span></>}
                </p>
              </div>
              <div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${item.accuracy}%`, background: barColor }} />
                </div>
                <p className="text-xs text-slate-500 mt-1">Độ chính xác {item.accuracy}%</p>
              </div>
              <div className="flex flex-col gap-2 mt-auto">
                {item.unresolvedMistakes > 0 && (
                  <Link to="/mistakes" className="btn-danger w-full py-2 text-sm">
                    Ôn {item.unresolvedMistakes} câu sai <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
                {item.recommendedTest ? (
                  <Link to={`/tests/${item.recommendedTest.id}/room`} className={`${item.unresolvedMistakes > 0 ? 'btn-secondary' : 'btn-primary'} w-full py-2 text-sm`}>
                    <Play className="w-4 h-4" /> {item.recommendedTest.title.length > 26 ? `${item.recommendedTest.title.slice(0, 26)}…` : item.recommendedTest.title} ({item.recommendedTest.partCount} câu)
                  </Link>
                ) : (
                  <Link to="/tests" className="btn-secondary w-full py-2 text-sm">
                    <Play className="w-4 h-4" /> Chọn đề để luyện
                  </Link>
                )}
                {item.suggestedTopic && (
                  <Link to="/vocab" className="w-full py-2 text-sm inline-flex items-center justify-center gap-2 text-primary-600 hover:underline" title={`Chủ đề ${item.suggestedTopic.title} còn ${item.suggestedTopic.remaining} từ chưa học`}>
                    <BookOpen className="w-4 h-4" /> Học từ: {item.suggestedTopic.title.length > 24 ? `${item.suggestedTopic.title.slice(0, 24)}…` : item.suggestedTopic.title} (còn {item.suggestedTopic.remaining})
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Thẻ Streak: số ngày liên tục + 7 chấm tròn + kỷ lục, dùng .card/.badge + biến warning trong @theme */
function StreakCard({ streak }: { streak: DashboardData['streak'] }) {
  return (
    <section className="card">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-900 flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full" style={{ background: 'var(--color-warning-50)' }}>
            <Flame className="w-4 h-4" style={{ color: 'var(--color-warning-500)' }} />
          </span>
          Chuỗi ngày học
        </h2>
        {streak.todayDone ? (
          <span className="badge" style={{ background: 'var(--color-success-50)', color: 'var(--color-success-700)' }}>Hôm nay đã học</span>
        ) : (
          <span className="badge" style={{ background: 'var(--color-warning-50)', color: 'var(--color-warning-700)' }}>Chưa học hôm nay</span>
        )}
      </div>
      <p className="mt-4 text-4xl font-bold text-slate-900">
        {streak.currentStreak} <span className="text-base font-medium text-slate-500">ngày liên tục</span>
      </p>
      <p className="text-xs text-slate-500 mt-1">Kỷ lục của bạn: {streak.longestStreak} ngày</p>
      <div className="flex items-center justify-between mt-4">
        {(streak.weekDots.length ? streak.weekDots : []).map((d) => (
          <div key={d.date} className="flex flex-col items-center gap-1.5" title={d.date}>
            <span
              className="w-7 h-7 rounded-full inline-flex items-center justify-center text-[11px] font-bold"
              style={
                d.done
                  ? { background: 'var(--color-warning-500)', color: '#fff' }
                  : { background: 'var(--color-background)', color: 'var(--color-slate-400)', border: '1px solid var(--color-slate-200)' }
              }
            >
              {d.done ? '✓' : '·'}
            </span>
            <span className="text-[10px] text-slate-500">{d.date.slice(5)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Thẻ BXH mini: Top 5 + hạng của bạn, dùng .card/.badge + biến primary và warning trong @theme */
function LeaderboardCard({ leaderboard, currentRank }: { leaderboard: LeaderboardEntry[]; currentRank: number | null }) {
  return (
    <section className="card">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-bold text-slate-900 flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full" style={{ background: 'var(--color-primary-50)' }}>
            <Trophy className="w-4 h-4" style={{ color: 'var(--color-primary-600)' }} />
          </span>
          Bảng xếp hạng
        </h2>
        {currentRank && (
          <span className="badge" style={{ background: 'var(--color-primary-50)', color: 'var(--color-primary-700)' }}>
            Bạn hạng #{currentRank}
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 mb-4">Top học viên theo điểm cao nhất</p>
      {leaderboard.length === 0 ? (
        <p className="text-sm text-slate-500">Chưa có dữ liệu xếp hạng. Hãy là người đầu tiên nộp bài!</p>
      ) : (
        <ol className="space-y-2">
          {leaderboard.map((entry) => (
            <li
              key={entry.userId}
              className="flex items-center gap-3 rounded-inner px-3 py-2.5 border"
              style={
                entry.isMe
                  ? { background: 'var(--color-primary-50)', borderColor: 'var(--color-primary-200)' }
                  : { background: '#fff', borderColor: 'var(--color-slate-200)' }
              }
            >
              <RankBadge rank={entry.rank} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {entry.fullName} {entry.isMe && <span style={{ color: 'var(--color-primary-600)' }}>(Bạn)</span>}
                </p>
                <p className="text-[11px] text-slate-500">{entry.totalCompleted} bài đã nộp</p>
              </div>
              <span className="text-sm font-bold" style={{ color: 'var(--color-primary-700)' }}>{entry.highestScore}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const style =
    rank === 1
      ? { background: 'var(--color-warning-500)', color: '#fff' }
      : rank === 2
        ? { background: 'var(--color-slate-200)', color: 'var(--color-slate-700)' }
        : rank === 3
          ? { background: 'var(--color-warning-100)', color: 'var(--color-warning-700)' }
          : { background: 'var(--color-background)', color: 'var(--color-slate-500)' };
  return (
    <span className="badge justify-center min-w-7" style={style}>
      {rank === 1 ? '1 ★' : `#${rank}`}
    </span>
  );
}
