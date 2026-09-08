import React, { useEffect, useState } from 'react';
import { fetchApi } from '../lib/api';
import { BookOpen, Check, ChevronDown, Loader2, Plus, Volume2 } from 'lucide-react';

interface TopicSummary {
  id: string;
  title: string;
  description: string | null;
  total: number;
  added: number;
  preview: string[];
}

interface TopicWord {
  id: string;
  word: string;
  meaning: string;
  example: string | null;
  added: boolean;
}

/** Tab Khám phá: duyệt kho từ theo chủ đề của admin, thêm 1 chạm về sổ tay. */
export default function TopicExplorer({ onChanged }: { onChanged: () => void }) {
  const [topics, setTopics] = useState<TopicSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [words, setWords] = useState<Record<string, TopicWord[]>>({});
  const [loadingWords, setLoadingWords] = useState(false);
  const [copying, setCopying] = useState<string | null>(null);

  const loadTopics = async () => {
    try {
      const res = await fetchApi('/vocab/topics');
      setTopics(res.data?.topics || []);
    } catch {
      setTopics([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTopics();
  }, []);

  const toggleTopic = async (id: string) => {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    if (words[id]) return;
    setLoadingWords(true);
    try {
      const res = await fetchApi(`/vocab/topics/${id}`);
      setWords((prev) => ({ ...prev, [id]: res.data?.topic?.words || [] }));
    } catch {
      setWords((prev) => ({ ...prev, [id]: [] }));
    } finally {
      setLoadingWords(false);
    }
  };

  const refreshAfterCopy = () => {
    loadTopics();
    onChanged();
  };

  const copyWord = async (topicId: string, wordId: string) => {
    setCopying(`w-${wordId}`);
    try {
      await fetchApi(`/vocab/topic-words/${wordId}/copy`, { method: 'POST' });
      const res = await fetchApi(`/vocab/topics/${topicId}`);
      setWords((prev) => ({ ...prev, [topicId]: res.data?.topic?.words || [] }));
      refreshAfterCopy();
    } catch (e: any) {
      alert(e.message || 'Không thể thêm từ.');
    } finally {
      setCopying(null);
    }
  };

  const copyAll = async (topicId: string) => {
    setCopying(`t-${topicId}`);
    try {
      const res = await fetchApi(`/vocab/topics/${topicId}/copy`, { method: 'POST' });
      const { added = 0, skipped = 0 } = res.data || {};
      alert(added ? `Đã thêm ${added} từ mới vào sổ tay${skipped ? ` (${skipped} từ đã có từ trước).` : '.'}` : 'Các từ trong chủ đề này đã có đủ trong sổ tay.');
      const detail = await fetchApi(`/vocab/topics/${topicId}`);
      setWords((prev) => ({ ...prev, [topicId]: detail.data?.topic?.words || [] }));
      refreshAfterCopy();
    } catch (e: any) {
      alert(e.message || 'Không thể thêm chủ đề.');
    } finally {
      setCopying(null);
    }
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  };

  if (loading) return <div className="p-10 text-center text-slate-500">Đang tải kho từ theo chủ đề...</div>;

  if (!topics.length) {
    return (
      <div className="card p-12 text-center space-y-3">
        <BookOpen className="w-10 h-10 text-primary-400 mx-auto" />
        <p className="text-lg font-semibold text-slate-800">Chưa có chủ đề nào.</p>
        <p className="text-sm text-slate-500">Quản trị viên sẽ sớm biên soạn các chủ đề từ vựng TOEIC tại đây.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {topics.map((topic) => {
        const open = openId === topic.id;
        const done = topic.total > 0 && topic.added >= topic.total;
        const pct = topic.total ? Math.round((topic.added / topic.total) * 100) : 0;
        return (
          <div key={topic.id} className="card p-0 overflow-hidden">
            <button type="button" onClick={() => toggleTopic(topic.id)} className="w-full p-5 flex items-center gap-4 text-left hover:bg-slate-50 transition-colors">
              <span
                className="inline-flex items-center justify-center w-11 h-11 rounded-xl shrink-0"
                style={done ? { background: 'var(--color-success-50)', color: 'var(--color-success-600)' } : { background: 'var(--color-primary-50)', color: 'var(--color-primary-600)' }}
              >
                {done ? <Check className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-bold text-slate-900">{topic.title}</span>
                <span className="block text-xs text-slate-500 mt-0.5 truncate">
                  {topic.description || `${topic.total} từ • ${topic.preview.join(', ')}`}
                </span>
                <span className="block h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2 max-w-60">
                  <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: done ? 'var(--color-success-500)' : 'var(--color-primary-500)' }} />
                </span>
              </span>
              <span className="badge bg-slate-100 text-slate-600 whitespace-nowrap">{topic.added}/{topic.total}</span>
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
              <div className="border-t border-slate-100 p-4 space-y-2 bg-slate-50/50">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => copyAll(topic.id)}
                    disabled={copying === `t-${topic.id}` || done}
                    className="btn-primary px-4 py-2 text-sm"
                  >
                    {copying === `t-${topic.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {done ? 'Đã đủ cả chủ đề' : 'Thêm cả chủ đề'}
                  </button>
                </div>
                {loadingWords && !words[topic.id] ? (
                  <p className="text-sm text-slate-500 text-center py-4">Đang tải từ...</p>
                ) : (
                  (words[topic.id] || []).map((w) => (
                    <div key={w.id} className="bg-white rounded-inner border border-slate-200 p-3 flex items-center gap-3">
                      <button type="button" onClick={() => speak(w.word)} className="p-1.5 text-slate-400 hover:text-primary-600" title="Nghe phát âm" aria-label={`Nghe ${w.word}`}>
                        <Volume2 className="w-4 h-4" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900">{w.word}</p>
                        <p className="text-sm text-slate-600">{w.meaning}</p>
                        {w.example && <p className="text-xs text-slate-400 italic mt-0.5">“{w.example}”</p>}
                      </div>
                      {w.added ? (
                        <span className="badge shrink-0" style={{ background: 'var(--color-success-50)', color: 'var(--color-success-700)' }}>
                          <Check className="w-3.5 h-3.5" /> Đã có
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => copyWord(topic.id, w.id)}
                          disabled={copying === `w-${w.id}`}
                          className="btn-secondary px-3 py-1.5 text-xs shrink-0"
                        >
                          {copying === `w-${w.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Thêm
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
