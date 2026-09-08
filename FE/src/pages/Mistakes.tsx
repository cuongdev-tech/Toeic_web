import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchApi } from '../lib/api';
import {
  BookX,
  CheckCircle2,
  ChevronLeft,
  GraduationCap,
  Loader2,
  MessageCircle,
  RotateCcw,
  Search,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react';

interface Mistake {
  questionId: string;
  questionText: string;
  options: unknown;
  correctAnswer: string;
  explanation: string | null;
  partNumber: number;
  tags: string[];
  difficulty: string;
  timesSeen: number;
  wrongCount: number;
  resolved: boolean;
  lastSelected: string | null;
  lastTestTitle: string;
  lastAt: string | null;
}

type StatusTab = 'unresolved' | 'resolved' | 'all';

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

export default function Mistakes() {
  const navigate = useNavigate();
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [summary, setSummary] = useState({ total: 0, unresolved: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<StatusTab>('unresolved');
  const [part, setPart] = useState(0);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [retryMode, setRetryMode] = useState(false);
  const [retryAnswers, setRetryAnswers] = useState<Record<string, string>>({});
  const [retryChecked, setRetryChecked] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ status: tab, limit: '100' });
    if (part) params.set('part', String(part));
    if (debouncedQuery) params.set('search', debouncedQuery);
    fetchApi(`/analytics/mistakes?${params.toString()}`)
      .then((res) => {
        if (cancelled) return;
        setMistakes(res.data?.mistakes || []);
        setSummary(res.data?.summary || { total: 0, unresolved: 0, resolved: 0 });
      })
      .catch(() => navigate('/tests'))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, part, debouncedQuery, navigate]);

  const parts = useMemo(() => Array.from(new Set(mistakes.map((m) => m.partNumber))).sort((a, b) => a - b), [mistakes]);
  const retryList = useMemo(() => mistakes.filter((m) => !m.resolved), [mistakes]);
  const retryScore = retryList.filter((m) => retryAnswers[m.questionId] === m.correctAnswer).length;

  const toggleReveal = (id: string) =>
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary-600 mb-4" />
        <p className="text-lg font-medium text-slate-600">Đang mở sổ tay câu sai...</p>
      </div>
    );
  }

  return (
    <div className="page page-lg space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-primary-600">Học từ lỗi sai</p>
        <h1 className="text-3xl font-bold text-slate-900 mt-1 flex items-center gap-2">
          <BookX className="text-primary-600" /> Sổ tay câu sai
        </h1>
        <p className="text-slate-500 mt-1">Mọi câu từng làm sai gom về một chỗ. Trả lời đúng ở bài sau, câu đó tự đánh dấu đã vững.</p>
      </div>

      {/* Tổng quan */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 border-danger-200" style={{ background: 'var(--color-danger-50)' }}>
          <p className="text-sm text-slate-500">Cần ôn lại</p>
          <p className="text-3xl font-extrabold text-danger-600 mt-1">{summary.unresolved}</p>
        </div>
        <div className="card p-5" style={{ background: 'var(--color-success-50)', borderColor: 'var(--color-success-200)' }}>
          <p className="text-sm text-slate-500">Đã vững</p>
          <p className="text-3xl font-extrabold mt-1" style={{ color: 'var(--color-success-600)' }}>{summary.resolved}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-slate-500">Từng sai (tổng)</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-1">{summary.total}</p>
        </div>
      </section>

      {retryMode ? (
        <section className="space-y-6">
          <div className="card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900">Ôn nhanh câu chưa vững</h2>
              <p className="text-sm text-slate-500 mt-1" aria-live="polite">
                {retryChecked ? `Kết quả: ${retryScore}/${retryList.length} câu đúng` : `Đã trả lời ${Object.keys(retryAnswers).length}/${retryList.length} câu`}
              </p>
            </div>
            <div className="flex gap-2">
              {!retryChecked ? (
                <button onClick={() => setRetryChecked(true)} disabled={Object.keys(retryAnswers).length === 0} className="btn-success px-6">
                  <CheckCircle2 className="w-4 h-4" /> Kiểm tra
                </button>
              ) : (
                <button onClick={() => { setRetryAnswers({}); setRetryChecked(false); }} className="btn-secondary px-6">
                  <RotateCcw className="w-4 h-4" /> Làm lại
                </button>
              )}
              <button onClick={() => setRetryMode(false)} className="btn-secondary px-4" aria-label="Thoát ôn tập">
                <X className="w-4 h-4" /> Thoát
              </button>
            </div>
          </div>
          {retryChecked && retryScore === retryList.length && retryList.length > 0 && (
            <div className="card p-5 text-center" style={{ background: 'var(--color-success-50)', borderColor: 'var(--color-success-200)' }}>
              <Sparkles className="w-8 h-8 mx-auto" style={{ color: 'var(--color-success-600)' }} />
              <p className="font-bold mt-2" style={{ color: 'var(--color-success-700)' }}>Đúng hết! Nộp thêm bài thi để hệ thống ghi nhận đã vững.</p>
            </div>
          )}
          {retryList.map((m, i) => {
            const picked = retryAnswers[m.questionId];
            const showResult = retryChecked && picked;
            const ok = picked === m.correctAnswer;
            return (
              <div key={m.questionId} className="card md:p-6">
                <div className="flex gap-4 mb-4">
                  <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${showResult ? (ok ? 'bg-success-100 text-success-700' : 'bg-danger-100 text-danger-700') : 'bg-primary-100 text-primary-700'}`}>
                    {i + 1}
                  </div>
                  <p className="flex-1 text-slate-900 font-medium">{m.questionText}</p>
                </div>
                <div className="space-y-2" style={{ paddingLeft: '3.25rem' }}>
                  {parseOptions(m.options).map((opt, oi) => {
                    const letter = letterOf(opt, oi);
                    const isPicked = picked === letter;
                    const isRight = letter === m.correctAnswer;
                    let cls = 'border-slate-200 bg-white hover:border-primary-300';
                    if (retryChecked && isRight) cls = 'border-success-300 bg-success-50 font-medium';
                    else if (retryChecked && isPicked && !isRight) cls = 'border-danger-300 bg-danger-50 font-medium';
                    else if (isPicked) cls = 'border-primary-600 bg-primary-50/50 font-medium';
                    return (
                      <button key={oi} type="button" disabled={retryChecked} onClick={() => setRetryAnswers((p) => ({ ...p, [m.questionId]: letter }))}
                        className={`w-full flex items-center p-3.5 rounded-xl border-2 text-left text-sm transition-all ${cls} disabled:cursor-default`}>
                        <span className="w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 shrink-0 font-bold text-xs border-current">{letter}</span>
                        {stripPrefix(opt)}
                      </button>
                    );
                  })}
                </div>
                {showResult && !ok && m.explanation && (
                  <p className="mt-3 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-inner p-3" style={{ marginLeft: '3.25rem' }}>{m.explanation}</p>
                )}
              </div>
            );
          })}
        </section>
      ) : (
        <>
          {/* Toolbar */}
          <div className="card p-4 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex bg-slate-100 p-1 rounded-xl w-full lg:w-auto">
              {(['unresolved', 'resolved', 'all'] as StatusTab[]).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 lg:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600'}`}>
                  {t === 'unresolved' ? `Cần ôn (${summary.unresolved})` : t === 'resolved' ? `Đã vững (${summary.resolved})` : 'Tất cả'}
                </button>
              ))}
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm trong câu hỏi..." aria-label="Tìm câu sai" className="input pl-10" />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              Part
              <select value={part} onChange={(e) => setPart(Number(e.target.value))} className="input sm:w-auto">
                <option value={0}>Tất cả</option>
                {parts.map((p) => <option key={p} value={p}>Part {p}</option>)}
              </select>
            </label>
            <button onClick={() => { setRetryAnswers({}); setRetryChecked(false); setRetryMode(true); }} disabled={retryList.length === 0} className="btn-primary whitespace-nowrap">
              <GraduationCap className="w-4 h-4" /> Ôn nhanh
            </button>
          </div>

          {mistakes.length === 0 ? (
            <div className="card p-12 text-center space-y-3">
              {tab === 'unresolved' ? (
                <>
                  <CheckCircle2 className="w-10 h-10 mx-auto" style={{ color: 'var(--color-success-500)' }} />
                  <p className="text-lg font-semibold text-slate-800">Sạch câu sai!</p>
                  <p className="text-sm text-slate-500">Bạn không còn câu nào cần ôn. Thi thêm đề mới để tiếp tục lên trình.</p>
                </>
              ) : (
                <>
                  <BookX className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-lg font-semibold text-slate-800">Chưa có dữ liệu.</p>
                  <p className="text-sm text-slate-500">Nộp bài thi để hệ thống ghi lại các câu bạn làm sai.</p>
                </>
              )}
            </div>
          ) : (
            <section className="space-y-4">
              {mistakes.map((m) => {
                const open = revealed.has(m.questionId);
                return (
                  <article key={m.questionId} className="card md:p-6 relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-1.5 h-full ${m.resolved ? 'bg-success-500' : 'bg-danger-500'}`} />
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="badge bg-primary-50 text-primary-700">Part {m.partNumber}</span>
                      {m.resolved ? (
                        <span className="badge" style={{ background: 'var(--color-success-50)', color: 'var(--color-success-700)' }}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Đã vững
                        </span>
                      ) : (
                        <span className="badge" style={{ background: 'var(--color-danger-50)', color: 'var(--color-danger-700)' }}>
                          <XCircle className="w-3.5 h-3.5" /> Sai {m.wrongCount}/{m.timesSeen} lần gặp
                        </span>
                      )}
                      <span className="text-xs text-slate-400 ml-auto">
                        {m.lastTestTitle}{m.lastAt ? ` • ${new Date(m.lastAt).toLocaleDateString('vi-VN')}` : ''}
                      </span>
                    </div>
                    <p className="text-slate-900 font-medium mb-4">{m.questionText}</p>

                    {open ? (
                      <div className="space-y-2">
                        {parseOptions(m.options).map((opt, oi) => {
                          const letter = letterOf(opt, oi);
                          const isRight = letter === m.correctAnswer;
                          const wasPicked = letter === m.lastSelected && !m.resolved;
                          return (
                            <div key={oi} className={`flex items-center p-3 rounded-xl border-2 text-sm ${isRight ? 'border-success-300 bg-success-50 font-medium' : wasPicked ? 'border-danger-300 bg-danger-50' : 'border-slate-100 text-slate-500'}`}>
                              <span className="w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 shrink-0 font-bold text-xs border-current">{letter}</span>
                              {stripPrefix(opt)}
                            </div>
                          );
                        })}
                        {m.explanation && (
                          <p className="text-sm text-slate-600 bg-primary-50/50 border border-primary-100 rounded-inner p-3 flex gap-2">
                            <MessageCircle className="w-4 h-4 shrink-0 mt-0.5 text-primary-600" /> {m.explanation}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400">Đáp án đang ẩn — tự trả lời trong đầu rồi hãy mở.</p>
                    )}

                    <button onClick={() => toggleReveal(m.questionId)} className="mt-3 text-sm font-medium text-primary-600 hover:underline">
                      {open ? 'Ẩn đáp án' : 'Hiện đáp án đúng'}
                    </button>
                  </article>
                );
              })}
            </section>
          )}

          <button onClick={() => navigate('/tests')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 font-medium">
            <ChevronLeft className="w-4 h-4" /> Về thư viện đề thi
          </button>
        </>
      )}
    </div>
  );
}
