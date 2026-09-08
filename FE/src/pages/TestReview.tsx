import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchApi } from '../lib/api';
import {
  ChevronLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  FileText,
  MessageCircle,
  HelpCircle,
  Search,
  RotateCcw,
  BookmarkPlus,
  X,
} from 'lucide-react';

interface LinkedWord {
  id: string;
  word: string;
  meaning: string;
  example: string | null;
}

interface ReviewDetail {
  questionId: string;
  questionText: string;
  options: string;
  selectedOption: string | null;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string | null;
  partNumber: number;
  audioUrl?: string;
  passageText?: string;
  imageUrl?: string;
  vocabWords?: LinkedWord[];
}

interface ReviewData {
  listeningScore: number;
  readingScore: number;
  totalScore: number;
  cheatCount: number;
  details: ReviewDetail[];
}

type StatusFilter = 'all' | 'correct' | 'wrong' | 'skipped';

function normalizeOption(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const id = typeof obj.id === 'string' ? obj.id : '';
    const text = typeof obj.text === 'string' ? obj.text : (typeof obj.label === 'string' ? obj.label : '');
    if (id && text) return `${id}. ${text.replace(/^[A-D][\.\):\-]\s*/, '')}`;
    if (text) return text;
  }
  return String(value ?? '');
}

function parseOptions(optionsInput: unknown): string[] {
  if (Array.isArray(optionsInput)) return optionsInput.map(normalizeOption).filter(Boolean);
  if (typeof optionsInput === 'string') {
    try {
      const parsed = JSON.parse(optionsInput);
      if (Array.isArray(parsed)) return parsed.map(normalizeOption).filter(Boolean);
    } catch {
      return [];
    }
  }
  return [];
}

/** Chữ cái đáp án (A-D), fallback theo vị trí khi text không có prefix. */
function letterOf(optionText: string, idx: number): string {
  const m = optionText.match(/^\s*\(?([A-D])[\.\):\-]/) || optionText.match(/^\s*([A-D])/);
  return m ? m[1] : String.fromCharCode(65 + idx);
}

/** Bỏ prefix "A. " khi hiển thị vì đã có vòng tròn chữ cái. Regex thay cho substring(3) giòn. */
function stripOptionPrefix(optionText: string): string {
  return optionText.replace(/^\s*\(?[A-D][\.\):\-]\s*/, '');
}

export default function TestReview() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedExplanations, setExpandedExplanations] = useState<Set<string>>(new Set());

  // Bộ lọc xem lại
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [partFilter, setPartFilter] = useState<number>(0);
  const [query, setQuery] = useState('');

  // Chế độ luyện lại câu sai (thuần client, dùng dữ liệu review đã tải)
  const [retryMode, setRetryMode] = useState(false);
  const [retryAnswers, setRetryAnswers] = useState<Record<string, string>>({});
  const [retryChecked, setRetryChecked] = useState(false);

  // Lưu từ vựng 1-click (form inline, không prompt chặn luồng)
  const [vocabFormFor, setVocabFormFor] = useState<string | null>(null);
  const [vocabWord, setVocabWord] = useState('');
  const [vocabMeaning, setVocabMeaning] = useState('');
  const [vocabSaving, setVocabSaving] = useState(false);
  const [savedVocabIds, setSavedVocabIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchReview = async () => {
      try {
        const res = await fetchApi(`/tests/attempts/${attemptId}/review`);
        if (res.success) {
          setData(res.data);
        } else {
          throw new Error(res.message);
        }
      } catch (err: any) {
        alert(err.message || 'Không thể tải kết quả. Vui lòng thử lại sau.');
        navigate('/tests');
      } finally {
        setLoading(false);
      }
    };

    if (attemptId) fetchReview();
  }, [attemptId, navigate]);

  const parts = useMemo(
    () => Array.from(new Set((data?.details || []).map((d) => d.partNumber))).sort((a, b) => a - b),
    [data],
  );

  const wrongList = useMemo(() => (data?.details || []).filter((d) => !d.isCorrect), [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.details || [])
      .map((detail, originalIndex) => ({ detail, originalIndex }))
      .filter(({ detail }) => {
        if (statusFilter === 'correct' && !detail.isCorrect) return false;
        if (statusFilter === 'wrong' && detail.isCorrect) return false;
        if (statusFilter === 'skipped' && detail.selectedOption !== null) return false;
        if (partFilter !== 0 && detail.partNumber !== partFilter) return false;
        if (q && !detail.questionText.toLowerCase().includes(q)) return false;
        return true;
      });
  }, [data, statusFilter, partFilter, query]);

  const correctCount = (data?.details || []).filter((d) => d.isCorrect).length;
  const retryScore = wrongList.filter((q) => retryAnswers[q.questionId] === q.correctAnswer).length;

  const toggleExplanation = (questionId: string) => {
    setExpandedExplanations(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const startRetry = () => {
    setRetryAnswers({});
    setRetryChecked(false);
    setRetryMode(true);
  };

  const saveVocab = async (questionId: string) => {
    const word = vocabWord.trim();
    const meaning = vocabMeaning.trim();
    if (!word || !meaning || vocabSaving) return;
    setVocabSaving(true);
    try {
      await fetchApi('/vocab', { method: 'POST', body: JSON.stringify({ word, meaning }) });
    } catch {
      // Offline: xếp hàng đồng bộ lại khi vào trang Vocab (cùng key với TestRoom).
      try {
        const pending = JSON.parse(localStorage.getItem('toeic-pending-vocab') || '[]');
        localStorage.setItem('toeic-pending-vocab', JSON.stringify([...pending, { word, meaning }]));
      } catch { /* localStorage đầy/khóa: bỏ qua, vẫn đánh dấu đã lưu */ }
    } finally {
      setVocabSaving(false);
    }
    setSavedVocabIds(prev => new Set(prev).add(questionId));
    setVocabFormFor(null);
    setVocabWord('');
    setVocabMeaning('');
  };

  // Lưu 1 chạm từ vựng do admin gắn sẵn vào câu hỏi.
  const saveLinkedWord = async (questionId: string, linked: LinkedWord) => {
    const key = `${questionId}:${linked.id}`;
    if (savedVocabIds.has(key) || vocabSaving) return;
    setVocabSaving(true);
    try {
      await fetchApi('/vocab', { method: 'POST', body: JSON.stringify({ word: linked.word, meaning: linked.meaning }) });
    } catch {
      try {
        const pending = JSON.parse(localStorage.getItem('toeic-pending-vocab') || '[]');
        localStorage.setItem('toeic-pending-vocab', JSON.stringify([...pending, { word: linked.word, meaning: linked.meaning }]));
      } catch { /* bỏ qua, vẫn đánh dấu đã lưu */ }
    } finally {
      setVocabSaving(false);
    }
    setSavedVocabIds(prev => new Set(prev).add(key));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary-600 mb-4" />
        <p className="text-lg font-medium text-slate-600">Đang tải kết quả bài làm...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate('/tests')}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-medium"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Thư viện đề thi</span>
          </button>
          <h1 className="font-bold text-lg text-slate-900">
            Kết Quả & Giải Thích Chi Tiết
          </h1>
          <div className="w-24"></div> {/* Balance header flex */}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* SCORE BOARD */}
        <section className="card md:p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex flex-col items-center justify-center p-4 bg-primary-50 rounded-xl border border-primary-100">
              <span className="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-1">Tổng điểm</span>
              <span className="text-4xl font-extrabold text-primary-900">{data.totalScore}<span className="text-lg text-primary-400 font-medium">/990</span></span>
            </div>
            <div className="flex flex-col items-center justify-center p-4 bg-score-listening-soft rounded-inner border border-info-100">
              <span className="text-sm font-semibold text-score-listening uppercase tracking-wider mb-1">Listening</span>
              <span className="text-3xl font-bold text-score-listening-ink">{data.listeningScore}<span className="text-base text-score-listening font-medium">/495</span></span>
            </div>
            <div className="flex flex-col items-center justify-center p-4 bg-score-reading-soft rounded-inner border border-success-100">
              <span className="text-sm font-semibold text-score-reading uppercase tracking-wider mb-1">Reading</span>
              <span className="text-3xl font-bold text-score-reading-ink">{data.readingScore}<span className="text-base text-score-reading font-medium">/495</span></span>
            </div>
            <div className={`flex flex-col items-center justify-center p-4 rounded-xl border ${data.cheatCount > 0 ? 'bg-danger-50 border-danger-100' : 'bg-slate-50 border-slate-100'}`}>
              <div className="flex items-center gap-1 mb-1">
                {data.cheatCount > 0 && <AlertTriangle className="w-4 h-4 text-danger-600" />}
                <span className={`text-sm font-semibold uppercase tracking-wider ${data.cheatCount > 0 ? 'text-danger-600' : 'text-slate-500'}`}>
                  Vi phạm
                </span>
              </div>
              <span className={`text-3xl font-bold ${data.cheatCount > 0 ? 'text-danger-700' : 'text-slate-700'}`}>
                {data.cheatCount} <span className="text-base font-medium opacity-50">lần</span>
              </span>
            </div>
          </div>

          {/* Hành động sau khi xem điểm */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={startRetry}
              disabled={wrongList.length === 0}
              className="btn-primary flex-1"
            >
              <RotateCcw className="w-4 h-4" />
              {wrongList.length === 0 ? 'Bạn đúng hết — xuất sắc!' : `Luyện lại ${wrongList.length} câu sai`}
            </button>
            <button onClick={() => navigate('/analytics')} className="btn-secondary flex-1">
              Xem phân tích điểm yếu
            </button>
          </div>
        </section>

        {retryMode ? (
          /* CHẾ ĐỘ LUYỆN LẠI CÂU SAI */
          <section className="space-y-6">
            <div className="card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-900">Luyện lại câu sai</h2>
                <p className="text-sm text-slate-500 mt-1" aria-live="polite">
                  {retryChecked
                    ? `Kết quả luyện tập: ${retryScore}/${wrongList.length} câu đúng`
                    : `Đã trả lời ${Object.keys(retryAnswers).length}/${wrongList.length} câu`}
                </p>
              </div>
              <div className="flex gap-2">
                {!retryChecked ? (
                  <button
                    onClick={() => setRetryChecked(true)}
                    disabled={Object.keys(retryAnswers).length === 0}
                    className="btn-success px-6"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Kiểm tra
                  </button>
                ) : (
                  <button
                    onClick={() => { setRetryAnswers({}); setRetryChecked(false); }}
                    className="btn-secondary px-6"
                  >
                    <RotateCcw className="w-4 h-4" /> Làm lại
                  </button>
                )}
                <button onClick={() => setRetryMode(false)} className="btn-secondary px-4" aria-label="Thoát luyện tập">
                  <X className="w-4 h-4" /> Thoát
                </button>
              </div>
            </div>

            {wrongList.map((q, retryIndex) => {
              const picked = retryAnswers[q.questionId];
              const showResult = retryChecked && picked;
              const pickedCorrect = picked === q.correctAnswer;
              return (
                <div key={q.questionId} className="card md:p-8">
                  <div className="flex gap-4 mb-6">
                    <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                      showResult
                        ? pickedCorrect ? 'bg-success-100 text-success-700' : 'bg-danger-100 text-danger-700'
                        : 'bg-primary-100 text-primary-700'
                    }`}>
                      {retryIndex + 1}
                    </div>
                    <p className="flex-1 pt-1 text-lg text-slate-900 font-medium">{q.questionText}</p>
                  </div>
                  <div className="space-y-3 pl-14">
                    {parseOptions(q.options).map((optionText, optIdx) => {
                      const letter = letterOf(optionText, optIdx);
                      const isPicked = picked === letter;
                      const isRight = letter === q.correctAnswer;
                      let cls = 'border-slate-200 bg-white text-slate-700 hover:border-primary-300';
                      if (retryChecked && isRight) cls = 'border-success-300 bg-success-50 text-success-800 font-medium';
                      else if (retryChecked && isPicked && !isRight) cls = 'border-danger-300 bg-danger-50 text-danger-800 font-medium';
                      else if (isPicked) cls = 'border-primary-600 bg-primary-50/50 text-primary-900 font-medium';
                      return (
                        <button
                          key={optIdx}
                          type="button"
                          disabled={retryChecked}
                          onClick={() => setRetryAnswers(prev => ({ ...prev, [q.questionId]: letter }))}
                          className={`w-full flex items-center p-4 rounded-xl border-2 text-left transition-all ${cls} disabled:cursor-default`}
                        >
                          <span className="w-7 h-7 rounded-full border-2 flex items-center justify-center mr-4 shrink-0 font-bold text-sm border-current">
                            {letter}
                          </span>
                          <span className="text-base">{stripOptionPrefix(optionText)}</span>
                        </button>
                      );
                    })}
                  </div>
                  {showResult && !pickedCorrect && q.explanation && (
                    <p className="mt-4 ml-14 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-inner p-4">
                      {q.explanation}
                    </p>
                  )}
                </div>
              );
            })}
          </section>
        ) : (
          <>
            {/* TOOLBAR LỌC CÂU HỎI */}
            <div className="card p-4 sticky top-16 z-30 flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm trong nội dung câu hỏi..."
                  aria-label="Tìm câu hỏi"
                  className="input pl-10"
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  Kết quả
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className="input sm:w-auto">
                    <option value="all">Tất cả</option>
                    <option value="correct">Đúng</option>
                    <option value="wrong">Sai</option>
                    <option value="skipped">Bỏ trống</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  Part
                  <select value={partFilter} onChange={(e) => setPartFilter(Number(e.target.value))} className="input sm:w-auto">
                    <option value={0}>Tất cả</option>
                    {parts.map((p) => <option key={p} value={p}>Part {p}</option>)}
                  </select>
                </label>
              </div>
            </div>

            <p className="text-sm text-slate-500" aria-live="polite">
              Hiển thị {filtered.length}/{data.details.length} câu — {correctCount} đúng, {data.details.length - correctCount} sai.
            </p>

            {/* QUESTIONS LIST */}
            <section className="space-y-12">
              {filtered.length === 0 && (
                <div className="card p-12 text-center">
                  <p className="font-semibold text-slate-800">Không có câu nào khớp bộ lọc.</p>
                  <p className="text-sm text-slate-500 mt-1">Thử đổi kết quả, Part hoặc từ khóa tìm kiếm.</p>
                </div>
              )}
              {filtered.map(({ detail: q, originalIndex: index }) => {
            const parsedOptions = parseOptions(q.options);
            const prevQ = index > 0 ? data.details[index - 1] : undefined;

            // Check if context (media/passage) should be shown
            const isNewGroup = !prevQ ||
              (q.audioUrl !== prevQ.audioUrl) ||
              (q.passageText !== prevQ.passageText) ||
              (q.imageUrl !== prevQ.imageUrl);

            const hasMedia = isNewGroup && (q.audioUrl || q.passageText || q.imageUrl);

            const isExpanded = expandedExplanations.has(q.questionId);
            const vocabOpen = vocabFormFor === q.questionId;
            const vocabSaved = savedVocabIds.has(q.questionId);

            return (
              <div key={q.questionId} className="space-y-6">

                {/* Context Block */}
                {hasMedia && (
                  <div className="card md:p-8">
                    <h4 className="text-sm font-bold text-primary-600 mb-6 flex items-center gap-2 uppercase tracking-wider">
                      <FileText className="w-4 h-4" /> Part {q.partNumber} Context
                    </h4>

                    {q.audioUrl && (
                      <div className="mb-6">
                        <audio controls controlsList="nodownload" className="w-full h-12 outline-none">
                          <source src={q.audioUrl} type="audio/mpeg" />
                          Trình duyệt của bạn không hỗ trợ thẻ audio.
                        </audio>
                      </div>
                    )}

                    {q.imageUrl && (
                      <div className="mb-6 flex justify-center">
                        <img src={q.imageUrl} alt="Context" className="max-w-full h-auto rounded-xl border border-slate-200 shadow-sm" />
                      </div>
                    )}

                    {q.passageText && (
                      <div className="max-w-none text-slate-800 whitespace-pre-wrap font-reading text-lg leading-relaxed bg-slate-50 p-6 md:p-8 rounded-inner border border-slate-100">
                        {q.passageText}
                      </div>
                    )}
                  </div>
                )}

                {/* Question Block */}
                <div className="card md:p-8 relative overflow-hidden">

                  {/* Status Badge */}
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${q.isCorrect ? 'bg-success-500' : 'bg-danger-500'}`}></div>

                  <div className="flex gap-4 mb-6">
                    <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                      q.isCorrect ? 'bg-success-100 text-success-700' : 'bg-danger-100 text-danger-700'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <p className="text-lg text-slate-900 font-medium">
                          {q.questionText}
                        </p>
                        <div className="shrink-0 flex items-center gap-1.5 font-medium text-sm">
                           {q.isCorrect ? (
                             <span className="flex items-center text-success-600 bg-success-50 px-2.5 py-1 rounded-md">
                               <CheckCircle2 className="w-4 h-4 mr-1.5" /> Đúng
                             </span>
                           ) : (
                             <span className="flex items-center text-danger-600 bg-danger-50 px-2.5 py-1 rounded-md">
                               <XCircle className="w-4 h-4 mr-1.5" /> Sai
                             </span>
                           )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="space-y-3 pl-14">
                    {parsedOptions.map((optionText, optIdx) => {
                      const letter = letterOf(optionText, optIdx);
                      const isCorrectAnswer = letter === q.correctAnswer;
                      const isSelectedAnswer = letter === q.selectedOption;

                      let optionClass = "border-slate-100 bg-white text-slate-700";
                      let icon = null;

                      if (isCorrectAnswer) {
                        // The right answer is always highlighted green
                        optionClass = "border-success-300 bg-success-50 text-success-800 font-medium";
                        icon = <CheckCircle2 className="w-5 h-5 text-success-600 absolute right-4" />;
                      } else if (isSelectedAnswer && !isCorrectAnswer) {
                        // If user selected it and it's wrong, red
                        optionClass = "border-danger-300 bg-danger-50 text-danger-800 font-medium";
                        icon = <XCircle className="w-5 h-5 text-danger-500 absolute right-4" />;
                      } else {
                        // Unselected wrong answer
                        optionClass = "border-slate-100 bg-white text-slate-500 opacity-60";
                      }

                      return (
                        <div
                          key={optIdx}
                          className={`relative flex items-center p-4 rounded-xl border-2 transition-all ${optionClass}`}
                        >
                          <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center mr-4 shrink-0 font-bold text-sm ${
                            isCorrectAnswer ? 'border-success-500 text-success-700 bg-success-100' :
                            (isSelectedAnswer && !isCorrectAnswer) ? 'border-danger-500 text-danger-700 bg-danger-100' :
                            'border-slate-300 text-slate-400'
                          }`}>
                            {letter}
                          </div>
                          <span className="text-base pr-10">
                            {stripOptionPrefix(optionText)}
                          </span>
                          {icon}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation Toggle + Vocab */}
                  <div className="mt-8 pl-14 flex flex-wrap gap-2">
                    <button
                      onClick={() => toggleExplanation(q.questionId)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                        isExpanded ? 'bg-primary-50 text-primary-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <MessageCircle className="w-4 h-4" />
                      {isExpanded ? 'Ẩn giải thích' : 'Xem giải thích chi tiết'}
                    </button>

                    {vocabSaved ? (
                      <span className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-success-50 text-success-700">
                        <BookmarkPlus className="w-4 h-4" /> Đã lưu vào từ vựng
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          setVocabFormFor(vocabOpen ? null : q.questionId);
                          setVocabWord('');
                          setVocabMeaning('');
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                      >
                        <BookmarkPlus className="w-4 h-4" />
                        Lưu từ vựng
                      </button>
                    )}
                  </div>

                  {(q.vocabWords || []).length > 0 && (
                    <div className="mt-3 ml-14 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-slate-400 mr-1">Từ vựng trong câu:</span>
                      {(q.vocabWords || []).map((w) => {
                        const wkey = `${q.questionId}:${w.id}`;
                        const done = savedVocabIds.has(wkey);
                        return (
                          <button
                            key={w.id}
                            type="button"
                            disabled={done}
                            title={w.meaning + (w.example ? ` — VD: ${w.example}` : '')}
                            onClick={() => saveLinkedWord(q.questionId, w)}
                            className={`badge border transition-colors ${done ? 'bg-success-50 text-success-700 border-success-200' : 'bg-primary-50 text-primary-700 border-primary-200 hover:bg-primary-100'}`}
                          >
                            {done ? <CheckCircle2 className="w-3 h-3" /> : <BookmarkPlus className="w-3 h-3" />}
                            {w.word}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {isExpanded && (
                    <div className="mt-4 ml-14 p-5 bg-primary-50/50 rounded-xl border border-primary-100">
                      <h5 className="flex items-center gap-2 text-sm font-bold text-primary-800 mb-2">
                        <HelpCircle className="w-4 h-4" /> Giải thích:
                      </h5>
                      <p className="text-slate-700 leading-relaxed text-sm">
                        {q.explanation || 'Chưa có lời giải thích chi tiết cho câu hỏi này.'}
                      </p>
                    </div>
                  )}

                  {vocabOpen && !vocabSaved && (
                    <div className="mt-4 ml-14 p-4 bg-slate-50 rounded-inner border border-slate-200 flex flex-col sm:flex-row gap-2">
                      <input
                        value={vocabWord}
                        onChange={(e) => setVocabWord(e.target.value)}
                        placeholder="Từ/cụm từ"
                        aria-label="Từ vựng cần lưu"
                        className="input"
                      />
                      <input
                        value={vocabMeaning}
                        onChange={(e) => setVocabMeaning(e.target.value)}
                        placeholder="Nghĩa tiếng Việt"
                        aria-label="Nghĩa tiếng Việt"
                        className="input"
                      />
                      <button
                        onClick={() => saveVocab(q.questionId)}
                        disabled={vocabSaving || !vocabWord.trim() || !vocabMeaning.trim()}
                        className="btn-success px-5 whitespace-nowrap"
                      >
                        {vocabSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Lưu'}
                      </button>
                    </div>
                  )}

                </div>
              </div>
            );
          })}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
