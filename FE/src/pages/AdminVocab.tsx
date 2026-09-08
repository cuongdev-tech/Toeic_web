import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchApi } from '../lib/api';
import { ArrowLeft, BookOpen, Loader2, Pencil, Plus, Save, Trash2, X } from 'lucide-react';

interface Topic {
  id: string;
  title: string;
  description: string | null;
  _count?: { words: number };
}

interface TopicWord {
  id: string;
  word: string;
  meaning: string;
  example: string | null;
}

export default function AdminVocab() {
  const navigate = useNavigate();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [words, setWords] = useState<TopicWord[]>([]);
  const [loadingWords, setLoadingWords] = useState(false);

  // Form chủ đề
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [savingTopic, setSavingTopic] = useState(false);

  // Form từ
  const [word, setWord] = useState('');
  const [meaning, setMeaning] = useState('');
  const [example, setExample] = useState('');
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [savingWord, setSavingWord] = useState(false);

  const loadTopics = async (keepSelection = true) => {
    try {
      const res = await fetchApi('/admin/vocab-topics');
      const list: Topic[] = res.data?.topics || [];
      setTopics(list);
      if (!keepSelection || (selectedId && !list.some((t) => t.id === selectedId))) {
        setSelectedId(list[0]?.id ?? null);
      }
    } catch {
      setTopics([]);
    } finally {
      setLoading(false);
    }
  };

  const loadWords = async (topicId: string) => {
    setLoadingWords(true);
    try {
      const res = await fetchApi(`/admin/vocab-topics/${topicId}/words`);
      setWords(res.data?.words || []);
    } catch {
      setWords([]);
    } finally {
      setLoadingWords(false);
    }
  };

  useEffect(() => {
    loadTopics(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedId) loadWords(selectedId);
    else setWords([]);
  }, [selectedId]);

  const resetTopicForm = () => {
    setTitle('');
    setDescription('');
    setEditingTopicId(null);
  };

  const submitTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTopic(true);
    try {
      if (editingTopicId) {
        await fetchApi(`/admin/vocab-topics/${editingTopicId}`, {
          method: 'PUT',
          body: JSON.stringify({ title, description }),
        });
      } else {
        const res = await fetchApi('/admin/vocab-topics', {
          method: 'POST',
          body: JSON.stringify({ title, description }),
        });
        setSelectedId(res.data?.topic?.id ?? null);
      }
      resetTopicForm();
      await loadTopics();
    } catch (err: any) {
      alert(err.message || 'Không thể lưu chủ đề.');
    } finally {
      setSavingTopic(false);
    }
  };

  const deleteTopic = async (id: string, wordCount: number) => {
    if (!window.confirm(`Xóa chủ đề này cùng ${wordCount} từ bên trong? Học viên giữ lại các từ đã thêm vào sổ tay.`)) return;
    try {
      await fetchApi(`/admin/vocab-topics/${id}`, { method: 'DELETE' });
      if (selectedId === id) setSelectedId(null);
      resetTopicForm();
      await loadTopics();
    } catch (err: any) {
      alert(err.message || 'Không thể xóa chủ đề.');
    }
  };

  const resetWordForm = () => {
    setWord('');
    setMeaning('');
    setExample('');
    setEditingWordId(null);
  };

  const submitWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    setSavingWord(true);
    try {
      if (editingWordId) {
        await fetchApi(`/admin/vocab-topics/words/${editingWordId}`, {
          method: 'PUT',
          body: JSON.stringify({ word, meaning, example }),
        });
      } else {
        await fetchApi(`/admin/vocab-topics/${selectedId}/words`, {
          method: 'POST',
          body: JSON.stringify({ word, meaning, example }),
        });
      }
      resetWordForm();
      await Promise.all([loadWords(selectedId), loadTopics()]);
    } catch (err: any) {
      alert(err.message || 'Không thể lưu từ.');
    } finally {
      setSavingWord(false);
    }
  };

  const deleteWord = async (id: string) => {
    if (!window.confirm('Xóa từ này khỏi chủ đề?')) return;
    try {
      await fetchApi(`/admin/vocab-topics/words/${id}`, { method: 'DELETE' });
      if (selectedId) await Promise.all([loadWords(selectedId), loadTopics()]);
    } catch (err: any) {
      alert(err.message || 'Không thể xóa từ.');
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-500">Đang tải kho từ vựng...</div>;

  const selected = topics.find((t) => t.id === selectedId);

  return (
    <div className="page page-lg space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary-600">
          <ArrowLeft className="w-4 h-4" /> Quản lý đề thi
        </button>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="text-primary-600" /> Kho từ vựng theo chủ đề
        </h1>
        <span className="badge bg-primary-50 text-primary-700">{topics.length} chủ đề</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Cột trái: danh sách + form chủ đề */}
        <div className="space-y-4">
          <form onSubmit={submitTopic} className="card space-y-3">
            <h2 className="font-bold text-slate-900">{editingTopicId ? 'Sửa chủ đề' : 'Chủ đề mới'}</h2>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Văn phòng & Công việc" required className="input" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả ngắn" rows={2} className="input" />
            <div className="flex gap-2">
              <button disabled={savingTopic} className="btn-admin px-4 py-2 text-sm">
                {savingTopic ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingTopicId ? 'Lưu' : 'Tạo chủ đề'}
              </button>
              {editingTopicId && (
                <button type="button" onClick={resetTopicForm} className="btn-secondary px-4 py-2 text-sm">Hủy</button>
              )}
            </div>
          </form>

          <div className="card p-3 space-y-1">
            {topics.length === 0 && <p className="text-sm text-slate-500 p-3">Chưa có chủ đề nào. Tạo chủ đề đầu tiên ở trên.</p>}
            {topics.map((t) => (
              <div
                key={t.id}
                className={`rounded-inner p-3 flex items-center gap-2 cursor-pointer transition-colors ${selectedId === t.id ? 'bg-primary-50 border border-primary-200' : 'hover:bg-slate-50 border border-transparent'}`}
                onClick={() => setSelectedId(t.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{t.title}</p>
                  <p className="text-xs text-slate-500">{t._count?.words ?? 0} từ</p>
                </div>
                <button
                  type="button"
                  title="Sửa chủ đề"
                  onClick={(e) => { e.stopPropagation(); setEditingTopicId(t.id); setTitle(t.title); setDescription(t.description || ''); }}
                  className="p-1.5 text-slate-400 hover:text-primary-600 rounded-lg hover:bg-primary-50"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Xóa chủ đề"
                  onClick={(e) => { e.stopPropagation(); deleteTopic(t.id, t._count?.words ?? 0); }}
                  className="p-1.5 text-slate-400 hover:text-danger-600 rounded-lg hover:bg-danger-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Cột phải: từ trong chủ đề */}
        <div className="lg:col-span-2 card space-y-4">
          {!selected ? (
            <p className="text-sm text-slate-500 p-6 text-center">Chọn một chủ đề bên trái để quản lý từ.</p>
          ) : (
            <>
              <h2 className="font-bold text-slate-900">Từ trong “{selected.title}” ({words.length})</h2>
              <form onSubmit={submitWord} className="p-4 bg-primary-50/30 rounded-xl border border-primary-100 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input value={word} onChange={(e) => setWord(e.target.value)} placeholder="Từ (VD: deadline)" required className="input text-sm" />
                <input value={meaning} onChange={(e) => setMeaning(e.target.value)} placeholder="Nghĩa (VD: hạn chót)" required className="input text-sm" />
                <input value={example} onChange={(e) => setExample(e.target.value)} placeholder="Câu ví dụ (tùy chọn)" className="input text-sm sm:col-span-2" />
                <div className="flex gap-2 sm:col-span-2">
                  <button disabled={savingWord} className="btn-success px-4 py-2 text-xs">
                    {savingWord ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    {editingWordId ? 'Lưu từ' : 'Thêm từ'}
                  </button>
                  {editingWordId && (
                    <button type="button" onClick={resetWordForm} className="btn-secondary px-4 py-2 text-xs">
                      <X className="w-3.5 h-3.5" /> Hủy
                    </button>
                  )}
                </div>
              </form>
              {loadingWords ? (
                <p className="text-sm text-slate-500 text-center py-6">Đang tải...</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {words.map((w) => (
                    <div key={w.id} className="py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900">{w.word} <span className="font-normal text-slate-600">— {w.meaning}</span></p>
                        {w.example && <p className="text-xs text-slate-400 italic mt-0.5">“{w.example}”</p>}
                      </div>
                      <button
                        type="button"
                        title="Sửa từ"
                        onClick={() => { setEditingWordId(w.id); setWord(w.word); setMeaning(w.meaning); setExample(w.example || ''); }}
                        className="p-1.5 text-slate-400 hover:text-primary-600 rounded-lg hover:bg-primary-50"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        title="Xóa từ"
                        onClick={() => deleteWord(w.id)}
                        className="p-1.5 text-slate-400 hover:text-danger-600 rounded-lg hover:bg-danger-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
