import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchApi } from '../lib/api';
import {
  Calendar,
  Crown,
  Flag,
  Flame,
  Gem,
  Loader2,
  Lock,
  Medal,
  Moon,
  Shield,
  Star,
  Target,
  Trophy,
  Wrench,
  Zap,
} from 'lucide-react';

interface Achievement {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  target: number;
  progress: number;
  unlocked: boolean;
}

const ICONS: Record<string, React.ReactNode> = {
  flag: <Flag className="w-6 h-6" />,
  calendar: <Calendar className="w-6 h-6" />,
  medal: <Medal className="w-6 h-6" />,
  star: <Star className="w-6 h-6" />,
  crown: <Crown className="w-6 h-6" />,
  gem: <Gem className="w-6 h-6" />,
  flame: <Flame className="w-6 h-6" />,
  zap: <Zap className="w-6 h-6" />,
  wrench: <Wrench className="w-6 h-6" />,
  shield: <Shield className="w-6 h-6" />,
  target: <Target className="w-6 h-6" />,
  moon: <Moon className="w-6 h-6" />,
};

const CATEGORY_ORDER = ['Khởi đầu', 'Điểm số', 'Kiên trì', 'Câu sai', 'Thử thách'];

export function markAchievementsSeen(ids: string[]) {
  try {
    localStorage.setItem('toeic-seen-achievements', JSON.stringify(ids));
  } catch { /* bỏ qua khi localStorage khóa */ }
}

export function getSeenAchievements(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem('toeic-seen-achievements') || 'null');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export default function Achievements() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi('/analytics/achievements')
      .then((res) => {
        const list: Achievement[] = res.data?.achievements || [];
        setAchievements(list);
        markAchievementsSeen(list.filter((a) => a.unlocked).map((a) => a.id));
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary-600 mb-4" />
        <p className="text-lg font-medium text-slate-600">Đang tải huy hiệu...</p>
      </div>
    );
  }

  const unlocked = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="page page-lg space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-primary-600">Ghi nhận nỗ lực</p>
        <h1 className="text-3xl font-bold text-slate-900 mt-1 flex items-center gap-2">
          <Trophy className="text-primary-600" /> Huy hiệu thành tích
        </h1>
        <p className="text-slate-500 mt-1">Đã mở khóa {unlocked}/{achievements.length} huy hiệu — mỗi mốc đều tính từ quá trình học thật của bạn.</p>
      </div>

      <div className="card">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-semibold text-slate-700">Tiến độ sưu tầm</span>
          <span className="text-slate-500">{unlocked}/{achievements.length}</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${achievements.length ? Math.round((unlocked / achievements.length) * 100) : 0}%`, background: 'var(--color-warning-500)' }}
          />
        </div>
      </div>

      {CATEGORY_ORDER.map((category) => {
        const items = achievements.filter((a) => a.category === category);
        if (!items.length) return null;
        return (
          <section key={category} className="space-y-4">
            <h2 className="section-label">{category}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((a) => {
                const pct = Math.min(100, Math.round((a.progress / a.target) * 100));
                return (
                  <div
                    key={a.id}
                    className="card p-5 relative overflow-hidden"
                    style={a.unlocked ? { borderColor: 'var(--color-warning-200)', background: 'var(--color-warning-50)' } : { opacity: 0.85 }}
                  >
                    <div className="flex items-start gap-4">
                      <span
                        className="inline-flex items-center justify-center w-14 h-14 rounded-full shrink-0"
                        style={
                          a.unlocked
                            ? { background: 'var(--color-warning-500)', color: '#fff', boxShadow: '0 6px 16px rgb(245 158 11 / 0.35)' }
                            : { background: 'var(--color-background)', color: 'var(--color-slate-400)', border: '1px solid var(--color-slate-200)' }
                        }
                      >
                        {a.unlocked ? (ICONS[a.icon] ?? <Medal className="w-6 h-6" />) : <Lock className="w-5 h-5" />}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900">{a.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{a.description}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="h-2 bg-white rounded-full overflow-hidden border border-slate-100">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, background: a.unlocked ? 'var(--color-warning-500)' : 'var(--color-primary-500)' }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1.5">
                        {a.unlocked ? 'Đã mở khóa!' : `${a.progress}/${a.target}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <p className="text-sm text-slate-500 text-center">
        Muốn mở thêm huy hiệu? <Link to="/tests" className="text-primary-600 font-medium hover:underline">Làm thêm đề thi</Link> hoặc <Link to="/mistakes" className="text-primary-600 font-medium hover:underline">ôn câu sai</Link>.
      </p>
    </div>
  );
}
