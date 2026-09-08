import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchApi } from '../lib/api';
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Ear,
  FileText,
  Loader2,
  RotateCcw,
  Timer,
  XCircle,
} from 'lucide-react';

interface PracticeQuestion {
  id: string;
  questionText: string;
  options: unknown;
  correctAnswer: string;
  explanation: string | null;
  partNumber: number;
  difficulty: string;
  groupId: string | null;
  group: { audioUrl: string | null; imageUrl: string | null; passageText: string | null } | null;
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

const isListening = (part: number) => part >= 1 && part <= 4;

function parseOptions(optionsInput: unknown): string[] {
  const normalize = (value: unknown): string => {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object') {
      const o = value as Record<string, unknown>;
      const id = typeof o.id === 'string' ? o.id : '';
      const text = typeof o.text === 'string' ? o.text : '';
      if (id && text) return `${id}. ${text.replace(/^[A-D][\.\):\-]\s*/, '')}`;
      if (text) return text;
    }
    return String(value ?? '');
  };
  if (Array.isArray(optionsInput)) return optionsInput.map(normalize).filter(Boolean);
  if (typeof optionsInput === 'string') {
    try {
      const parsed = JSON.parse(optionsInput);
      if (Array.isArray(parsed)) return parsed.map(normalize).filter(Boolean);
    } catch {
      return [];
    }
  }
  return [];
}

function letterOf(optionText: string, idx: number): string {
  const m = optionText.match(/^\s*\(?([A-D])[\.\):\-]/) || optionText.match(/^\s*([A-D])/);
  return m ? m[1] : String.fromCharCode(65 + idx);
}

function stripPrefix(optionText: string): string {
  return optionText.replace(/^\s*\(?[A-D][\.\):\-]\s*/, '');
}

function formatElapsed(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

type Phase = 'setup' | 'quiz' | 'result';

export default function Practice() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('setup');
  const [part, setPart] = useState(5);
  const [limit, setLimit] = useState(10);
  const [difficulty, setDifficulty] = useState('');

  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(0);

  // Bấm giờ nhẹ: chỉ đo thời gian luyện, không giới hạn.
  useEffect(() => {
    if (phase !== 'quiz') return;
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  const startQuiz = async (retry = false) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ part: String(part), limit: String(limit) });
      if (difficulty) params.set('difficulty', difficulty);
      const res = await fetchApi(`/tests/practice?${params.toString()}`);
      const list: PracticeQuestion[] = res.data?.questions || [];
      if (!list.length) throw new Error('Kho chưa có câu hỏi phù hợp.');
      setQuestions(list);
      setIndex(0);
      setPicks({});
      startRef.current = Date.now();
      setElapsed(0);
      setPhase('quiz');
    } catch (err: any) {
      if (!retry) setError(err.message || 'Không tải được bộ câu luyện.');
      else setPhase('setup');
    } finally {
      setLoading(false);
    }
  };

  const correctCount = questions.filter((q) => picks[q.id] === q.correctAnswer).length;
  const current = questions[index];
  const picked = current ? picks[current.id] : undefined;
  const prev = index > 0 ? questions[index - 1] : undefined;
  const showContext = current && (index === 0 || current.groupId !== prev?.groupId) && current.group &&
    (current.group.audioUrl || current.group.passageText || current.group.imageUrl);

  if (phase === 'setup') {
    return (
      <div className="page page-lg space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-primary-600">Luyện ngắn mỗi ngày</p>
          <h1 className="text-3xl font-bold text-slate-900 mt-1 flex items-center gap-2">
            <Dumbbell className="text-primary-600" /> Luyện theo Part
          </h1>
          <p className="text-slate-500 mt-1">Chọn 1 Part, bốc ngẫu nhiên từ kho câu hỏi, chấm đúng/sai ngay từng câu.</p>
        </div>

        <section className="card">
          <h2 className="section-label mb-4">1. Chọn Part cần luyện</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6, 7].map((p) => {
              const active = part === p;
              const listening = isListening(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPart(p)}
                  aria-pressed={active}
                  className="rounded-inner border-2 p-4 text-left transition-all"
                  style={active
                    ? { borderColor: 'var(--color-primary-600)', background: 'var(--color-primary-50)' }
                    : { borderColor: 'var(--color-slate-200)', background: '#fff' }}
                >
                  <span
                    className="inline-flex items-center justify-center w-9 h-9 rounded-full mb-2"
                    style={listening
                      ? { background: 'var(--color-info-50)', color: 'var(--color-info-600)' }
                      : { background: 'var(--color-success-50)', color: 'var(--color-success-600)' }}
                  >
                    {listening ? <Ear className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                  </span>
                  <span className="block font-bold text-slate-900">Part {p}</span>
                  <span className="block text-xs text-slate-500 mt-0.5">{PART_NAMES[p]}</span>
                  <span className={`badge mt-2 ${listening ? 'bg-info-50 text-info-600' : 'bg-success-50 text-success-600'}`}>
                    {listening ? 'Nghe' : 'Đọc'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="card">
          <h2 className="section-label mb-4">2. Số câu & độ khó</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              Số câu
              <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="input sm:w-auto">
                {[5, 10, 15, 20].map((n) => <option key={n} value={n}>{n} câu</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              Độ khó
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="input sm:w-auto">
                <option value="">Tất cả</option>
                <option value="EASY">Dễ</option>
                <option value="MEDIUM">Trung bình</option>
                <option value="HARD">Khó</option>
              </select>
            </label>
          </div>
          {error && <p className="text-sm text-danger-600 mt-3">{error}</p>}
          <button onClick={() => startQuiz()} disabled={loading} className="btn-primary w-full sm:w-auto px-8 mt-4">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Dumbbell className="w-4 h-4" />}
            {loading ? 'Đang bốc câu hỏi...' : `Bắt đầu luyện Part ${part}`}
          </button>
        </section>
      </div>
    );
  }

  if (phase === 'result') {
    const pct = questions.length ? Math.round((correctCount / questions.length) * 100) : 0;
    return (
      <div className="page page-md space-y-6">
        <section className="card p-8 text-center">
          <div
            className="w-24 h-24 rounded-full mx-auto flex items-center justify-center"
            style={{ background: `conic-gradient(var(--color-success-500) ${pct}%, var(--color-slate-100) ${pct}%)` }}
          >
            <div className="w-20 h-20 rounded-full bg-white flex flex-col items-center justify-center">
              <span className="text-2xl font-extrabold text-slate-900">{correctCount}/{questions.length}</span>
            </div>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-4">Part {part} — đúng {pct}%</h2>
          <p className="text-sm text-slate-500 mt-1 flex items-center justify-center gap-1.5">
            <Timer className="w-4 h-4" /> Hoàn thành trong {formatElapsed(elapsed)}
            {pct === 100 ? ' • Tuyệt đối!' : pct >= 70 ? ' • Giữ phong độ!' : ' • Ôn thêm nhé!'}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button onClick={() => startQuiz(true)} className="btn-primary flex-1">
              <RotateCcw className="w-4 h-4" /> Luyện bộ mới
            </button>
            <button onClick={() => setPhase('setup')} className="btn-secondary flex-1">Đổi Part</button>
            <button onClick={() => navigate('/tests')} className="btn-secondary flex-1">Về thư viện đề</button>
          </div>
        </section>
      </div>
    );
  }

  if (!current) return null;
  const answered = Object.keys(picks).length;

  return (
    <div className="page page-md space-y-6">
      {/* Tiến độ + giờ */}
      <div>
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-medium text-slate-600">Part {part} • Câu {index + 1}/{questions.length}</span>
          <span className="flex items-center gap-1.5 text-slate-500 font-mono">
            <Timer className="w-4 h-4" /> {formatElapsed(elapsed)}
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden" role="progressbar" aria-valuenow={index + 1} aria-valuemin={1} aria-valuemax={questions.length}>
          <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(((index + 1) / questions.length) * 100)}%`, background: 'var(--color-primary-600)' }} />
        </div>
      </div>

      {showContext && (
        <div className="card">
          <h4 className="text-sm font-bold text-primary-600 mb-3 flex items-center gap-2 uppercase tracking-wider">
            <FileText className="w-4 h-4" /> Ngữ cảnh chung
          </h4>
          {current.group?.audioUrl && (
            <audio controls controlsList="nodownload" src={current.group.audioUrl} className="w-full h-12 mb-3" />
          )}
          {current.group?.imageUrl && (
            <img src={current.group.imageUrl} alt="Context" className="max-w-full h-auto rounded-lg border border-slate-200 mb-3" />
          )}
          {current.group?.passageText && (
            <div className="whitespace-pre-wrap font-reading text-slate-700 bg-slate-50 p-4 rounded-inner border border-slate-100 leading-relaxed">
              {current.group.passageText}
            </div>
          )}
        </div>
      )}

      <div className="card md:p-6">
        <p className="text-lg text-slate-900 font-medium mb-5">{current.questionText}</p>
        <div className="space-y-2.5">
          {parseOptions(current.options).map((opt, oi) => {
            const letter = letterOf(opt, oi);
            const isPicked = picked === letter;
            const isRight = letter === current.correctAnswer;
            let cls = 'border-slate-200 bg-white hover:border-primary-300';
            if (picked) {
              if (isRight) cls = 'border-success-400 bg-success-50 font-medium';
              else if (isPicked) cls = 'border-danger-400 bg-danger-50 font-medium';
              else cls = 'border-slate-100 text-slate-400';
            }
            return (
              <button
                key={oi}
                type="button"
                disabled={!!picked}
                onClick={() => setPicks((p) => ({ ...p, [current.id]: letter }))}
                className={`w-full flex items-center p-4 rounded-xl border-2 text-left transition-all ${cls} disabled:cursor-default`}
              >
                <span className="w-7 h-7 rounded-full border-2 flex items-center justify-center mr-3 shrink-0 font-bold text-sm border-current">{letter}</span>
                <span className="flex-1">{stripPrefix(opt)}</span>
                {picked && isRight && <CheckCircle2 className="w-5 h-5 text-success-600 shrink-0" />}
                {picked && isPicked && !isRight && <XCircle className="w-5 h-5 text-danger-500 shrink-0" />}
              </button>
            );
          })}
        </div>
        {picked && current.explanation && (
          <p className="mt-4 text-sm text-slate-600 bg-primary-50/50 border border-primary-100 rounded-inner p-3">
            <strong className="text-primary-700">Giải thích: </strong>{current.explanation}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} className="btn-secondary px-4">
          <ChevronLeft className="w-4 h-4" /> Trước
        </button>
        <span className="text-sm text-slate-500">Đã trả lời {answered}/{questions.length}</span>
        {index < questions.length - 1 ? (
          <button onClick={() => setIndex((i) => i + 1)} className="btn-primary px-4">
            Tiếp <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={() => setPhase('result')} disabled={answered < questions.length} className="btn-success px-4" title={answered < questions.length ? 'Trả lời hết các câu để xem kết quả' : 'Xem kết quả'}>
            <CheckCircle2 className="w-4 h-4" /> Xong
          </button>
        )}
      </div>

      <button onClick={() => setPhase('setup')} className="text-sm text-slate-500 hover:text-slate-800 font-medium">
        ← Thoát buổi luyện
      </button>
    </div>
  );
}
