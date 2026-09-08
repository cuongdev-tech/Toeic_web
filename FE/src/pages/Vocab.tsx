import React, { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import { BookOpen, Plus, Layers, List, Sparkles, Trash2, Edit2, Search, Download, Compass } from 'lucide-react';
import Flashcard from '../components/Flashcard';
import TopicExplorer from '../components/TopicExplorer';

export default function Vocab() {
  const [vocabs, setVocabs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'flashcard' | 'list' | 'explore'>('flashcard');
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [dueOnly, setDueOnly] = useState(true);

  // Flashcard state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Add/Edit form state
  const [word, setWord] = useState('');
  const [meaning, setMeaning] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);

  const loadVocabs = async () => {
    try {
      const pending = JSON.parse(localStorage.getItem('toeic-pending-vocab') || '[]');
      if (pending.length) {
        const remaining = [];
        for (const item of pending) {
          try { await fetchApi('/vocab', { method: 'POST', body: JSON.stringify(item) }); } catch { remaining.push(item); }
        }
        localStorage.setItem('toeic-pending-vocab', JSON.stringify(remaining));
      }
      let queryStr = '';
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedLevel !== '') params.append('level', selectedLevel);
      if (dueOnly && tab === 'flashcard') params.append('due', 'true');
      if (params.toString()) queryStr = `?${params.toString()}`;

      const res = await fetchApi(`/vocab${queryStr}`);
      if (res.success || res.status === 'success') {
        setVocabs(res.data?.vocabs || []);
        setCurrentIndex(0);
      }
    } catch (error) {
      console.error('Lỗi tải từ vựng:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVocabs();
  }, [searchQuery, selectedLevel, dueOnly, tab]);

  const exportCsv = () => {
    const csv = ['word,meaning,status,nextReviewDate', ...vocabs.map((v) => [v.word, v.meaning, v.status, v.nextReviewDate].map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'toeic-vocabulary.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
  };

  const importCsv = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const rows = (await file.text()).split(/\r?\n/).filter((line) => line.trim()).slice(1);
      let imported = 0;
      for (const row of rows) {
        const [importedWord, importedMeaning] = parseCsvLine(row);
        if (!importedWord || !importedMeaning) continue;
        await fetchApi('/vocab', { method: 'POST', body: JSON.stringify({ word: importedWord, meaning: importedMeaning }) });
        imported += 1;
      }
      alert(`Đã import ${imported} từ vựng.`);
      loadVocabs();
    } catch (error: any) {
      alert(error.message || 'Không thể import CSV.');
    } finally {
      event.target.value = '';
      setImporting(false);
    }
  };

  const pronounce = (text: string) => {
    if ('speechSynthesis' in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  };

  const handleSaveVocab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word || !meaning) return;
    setSubmitting(true);
    try {
      if (editingId) {
        await fetchApi(`/vocab/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify({ word, meaning })
        });
        alert('Cập nhật từ vựng thành công!');
        setEditingId(null);
      } else {
        await fetchApi('/vocab', {
          method: 'POST',
          body: JSON.stringify({ word, meaning })
        });
        alert('Thêm từ vựng thành công!');
      }
      setWord('');
      setMeaning('');
      loadVocabs();
    } catch (error: any) {
      alert(error.message || 'Lỗi thao tác từ vựng');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (v: any) => {
    setEditingId(v.id);
    setWord(v.word);
    setMeaning(v.meaning);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa từ này?')) return;
    try {
      await fetchApi(`/vocab/${id}`, { method: 'DELETE' });
      loadVocabs();
    } catch (error) {
      alert('Lỗi khi xóa từ vựng');
    }
  };

  const handleSeedDefault = async () => {
    try {
      const res = await fetchApi('/vocab/seed', { method: 'POST' });
      if (res.success || res.status === 'success') {
        alert('Đã nạp bộ từ vựng mẫu TOEIC thành công!');
        loadVocabs();
      }
    } catch (error) {
      alert('Lỗi nạp từ vựng mẫu');
    }
  };

  const handleReview = async (isRemembered: boolean) => {
    const currentVocab = vocabs[currentIndex];
    if (!currentVocab) return;

    try {
      await fetchApi(`/vocab/${currentVocab.id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ isRemembered })
      });
      
      setIsFlipped(false);
      if (currentIndex < vocabs.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setCurrentIndex(0);
        loadVocabs();
        alert('Đã hoàn thành vòng ôn tập!');
      }
    } catch (error) {
      console.error('Lỗi ôn tập:', error);
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-500 font-medium">Đang tải danh sách từ vựng...</div>;

  return (
    <div className="page page-md space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="text-primary-600" /> Sổ tay Từ vựng TOEIC
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSeedDefault}
            className="flex items-center gap-1.5 px-3 py-2 bg-success-50 text-success-600 rounded-xl text-sm font-medium hover:bg-success-100 transition-colors"
          >
            <Download className="w-4 h-4" /> Nạp từ mẫu TOEIC
          </button>
          <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors">
            <Download className="w-4 h-4" /> Xuất CSV
          </button>
          <label className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors cursor-pointer"><Download className="w-4 h-4" /> Nhập CSV<input type="file" accept=".csv,text/csv" disabled={importing} onChange={importCsv} className="hidden" /></label>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setTab('flashcard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === 'flashcard' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-4 h-4" /> Flashcard
            </button>
            <button
              onClick={() => setTab('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === 'list' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-4 h-4" /> Danh sách ({vocabs.length})
            </button>
            <button
              onClick={() => setTab('explore')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === 'explore' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Compass className="w-4 h-4" /> Khám phá
            </button>
          </div>
        </div>
      </div>

      {tab !== 'explore' && (
        <>
      {/* Form thêm / sửa từ vựng */}
      <form onSubmit={handleSaveVocab} className="card p-5 flex flex-col md:flex-row gap-4 items-center">
        <input
          type="text"
          placeholder="Từ vựng tiếng Anh (ví dụ: evaluate)"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          className="input"
          required
        />
        <input
          type="text"
          placeholder="Ý nghĩa tiếng Việt (ví dụ: đánh giá)"
          value={meaning}
          onChange={(e) => setMeaning(e.target.value)}
          className="input"
          required
        />
        <div className="flex gap-2 w-full md:w-auto">
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary flex-1 md:flex-none px-6 py-3"
          >
            <Plus className="w-4 h-4" /> {editingId ? 'Cập nhật' : 'Thêm từ mới'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => { setEditingId(null); setWord(''); setMeaning(''); }}
              className="btn-secondary"
            >
              Hủy
            </button>
          )}
        </div>
      </form>

      {/* Bộ công cụ Tìm kiếm và Lọc */}
      <div className="card p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm từ vựng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-sm font-medium text-slate-500 whitespace-nowrap">Cấp độ:</span>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="input md:w-auto"
          >
            <option value="">Tất cả cấp độ</option>
            <option value="0">Level 0 (Mới / Cần ôn)</option>
            <option value="1">Level 1</option>
            <option value="2">Level 2</option>
            <option value="3">Level 3+</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-600 whitespace-nowrap"><input type="checkbox" checked={dueOnly} onChange={(event) => setDueOnly(event.target.checked)} className="accent-primary-600" /> Cần ôn hôm nay</label>
        </div>
      </div>
        </>
      )}

      {tab === 'explore' ? (
        <TopicExplorer onChanged={loadVocabs} />
      ) : vocabs.length === 0 ? (
        <div className="card p-12 text-center space-y-3">
          <Sparkles className="w-10 h-10 text-primary-400 mx-auto" />
          <p className="text-lg font-semibold text-slate-800">Không tìm thấy từ vựng nào!</p>
          <p className="text-sm text-slate-500">Hãy thử tìm kiếm từ khóa khác, bấm "Nạp từ mẫu TOEIC" hoặc thêm từ mới vào sổ tay.</p>
        </div>
      ) : tab === 'flashcard' ? (
        /* Giao diện Flashcard ôn tập — component lật 3D, tối ưu mobile */
        <div className="flex flex-col items-center px-1 sm:px-0">
          <Flashcard
            key={vocabs[currentIndex]?.id ?? currentIndex}
            card={vocabs[currentIndex]}
            index={currentIndex}
            total={vocabs.length}
            flipped={isFlipped}
            onFlip={() => setIsFlipped((prev) => !prev)}
            onPronounce={pronounce}
            onKnown={() => handleReview(true)}
            onUnknown={() => handleReview(false)}
          />
        </div>
      ) : (
        /* Giao diện Danh sách từ vựng */
        <div className="bg-surface border border-slate-200 rounded-card shadow-card overflow-hidden">
          <div className="divide-y divide-slate-100">
            {vocabs.map((v) => (
              <div key={v.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <h3 className="font-bold text-slate-900">{v.word}</h3>
                  <p className="text-sm text-slate-600">{v.meaning}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium">
                    Level {v.status}
                  </span>
                  <button
                    onClick={() => handleEdit(v)}
                    className="p-2 text-slate-400 hover:text-primary-600 transition-colors rounded-lg hover:bg-primary-50"
                    title="Sửa từ"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(v.id)}
                    className="p-2 text-slate-400 hover:text-danger-600 transition-colors rounded-lg hover:bg-danger-50"
                    title="Xóa từ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}