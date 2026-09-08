import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL, fetchApi } from '../lib/api';
import { PlusCircle, FileText, CheckCircle, Loader2, Edit, Unlink } from 'lucide-react';

export default function AdminTests() {
  // State cho Đề thi mới
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(120);
  
  // State quản lý chung
  const [loading, setLoading] = useState(false);
  const [createdTestId, setCreatedTestId] = useState<string | null>(null);
  
  // State cho danh sách đề thi có sẵn
  const [existingTests, setExistingTests] = useState<any[]>([]);
  const [selectedExistingId, setSelectedExistingId] = useState('');

  // Form state cho câu hỏi
  const [partNumber, setPartNumber] = useState(1);
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState(['A. ', 'B. ', 'C. ', 'D. ']);
  const [correctAnswer, setCorrectAnswer] = useState('A');
  const [explanation, setExplanation] = useState('');
  const [importing, setImporting] = useState(false);
  const [importReport, setImportReport] = useState<string | null>(null);

  // Câu hỏi hiện có trong đề đã chọn (để xem nhanh + gỡ khỏi đề)
  const [testQuestions, setTestQuestions] = useState<any[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  const loadTestQuestions = async (testId: string) => {
    setLoadingQuestions(true);
    try {
      const res = await fetchApi(`/admin/tests/${testId}/details`);
      if (res.success || res.status === 'success') {
        setTestQuestions(res.data?.questions || []);
      }
    } catch (err) {
      console.error('Lỗi tải câu hỏi của đề:', err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Tải danh sách đề thi cũ khi vào trang
  useEffect(() => {
    const loadTests = async () => {
      try {
        const res = await fetchApi('/admin/tests');
        if (res.success) {
          // Tùy cấu trúc API trả về, lấy mảng data
          const testsArray = res.data?.tests || res.data || [];
          setExistingTests(testsArray);
        }
      } catch (err) {
        console.error('Lỗi tải danh sách đề:', err);
      }
    };
    loadTests();
  }, []);

  // Xử lý tạo đề thi mới
  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetchApi('/admin/tests', {
        method: 'POST',
        body: JSON.stringify({ title, description, duration })
      });
      if (res.success) {
        alert('Tạo đề thi thành công! Giờ bạn có thể thêm câu hỏi bên dưới.');
        setCreatedTestId(res.data.test.id);
        setTestQuestions([]);
      } else {
        throw new Error(res.message);
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi tạo đề thi');
    } finally {
      setLoading(false);
    }
  };

  // Xử lý chọn đề thi có sẵn
  const handleSelectExistingTest = () => {
    if (!selectedExistingId) {
      alert('Vui lòng chọn một đề thi từ danh sách!');
      return;
    }
    setCreatedTestId(selectedExistingId);
    loadTestQuestions(selectedExistingId);
  };

  const handleTogglePublish = async () => {
    const test = existingTests.find((item) => item.id === selectedExistingId);
    if (!test) return;
    try {
      await fetchApi(`/admin/tests/${test.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: test.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED' }),
      });
      setExistingTests((items) => items.map((item) => item.id === test.id ? { ...item, status: test.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED' } : item));
    } catch (error: any) {
      alert(error.message || 'Không thể đổi trạng thái đề thi.');
    }
  };

  // Xử lý thêm câu hỏi
  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdTestId) return;
    setLoading(true);
    try {
      const res = await fetchApi(`/admin/tests/${createdTestId}/questions`, {
        method: 'POST',
        body: JSON.stringify({
          partNumber: Number(partNumber),
          questionText,
          options,
          correctAnswer,
          explanation
        })
      });
      if (res.success) {
        alert('Thêm câu hỏi thành công!');
        setQuestionText('');
        setExplanation('');
        if (createdTestId) loadTestQuestions(createdTestId);
      } else {
        throw new Error(res.message);
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi thêm câu hỏi');
    } finally {
      setLoading(false);
    }
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

  const handleImportCsv = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !createdTestId) return;
    setImporting(true);
    setImportReport(null);
    try {
      const lines = (await file.text()).split(/\r?\n/).filter((line) => line.trim());
      if (lines.length < 2) throw new Error('CSV phải có header và ít nhất một câu hỏi.');
      const rows = lines.slice(1).map(parseCsvLine);
      let ok = 0;
      const failures: string[] = [];
      for (let i = 0; i < rows.length; i++) {
        const [questionText, optionA, optionB, optionC, optionD, correctAnswer, explanationText, part] = rows[i];
        const lineNo = i + 2;
        if (!questionText || !['A', 'B', 'C', 'D'].includes(correctAnswer)) {
          failures.push(`Dòng ${lineNo}: thiếu nội dung hoặc đáp án không phải A-D.`);
          continue;
        }
        try {
          await fetchApi(`/admin/tests/${createdTestId}/questions`, {
            method: 'POST',
            body: JSON.stringify({ partNumber: Number(part) || 1, questionText, options: [optionA, optionB, optionC, optionD], correctAnswer, explanation: explanationText || '' }),
          });
          ok += 1;
        } catch (err: any) {
          failures.push(`Dòng ${lineNo}: ${err.message || 'lỗi không rõ'}.`);
        }
      }
      setImportReport(
        `Import xong: ${ok}/${rows.length} câu thành công${failures.length ? `. Lỗi:\n${failures.slice(0, 10).join('\n')}${failures.length > 10 ? `\n... và ${failures.length - 10} dòng nữa.` : ''}` : '.'}`,
      );
      loadTestQuestions(createdTestId);
    } catch (error: any) {
      alert(error.message || 'Không thể import CSV.');
    } finally {
      event.target.value = '';
      setImporting(false);
    }
  };

  const handleUnlinkQuestion = async (questionId: string) => {
    if (!createdTestId || !window.confirm('Gỡ câu hỏi khỏi đề này? (Câu hỏi vẫn giữ lại trong kho)')) return;
    try {
      await fetchApi(`/admin/tests/${createdTestId}/questions/${questionId}`, { method: 'DELETE' });
      loadTestQuestions(createdTestId);
    } catch (error: any) {
      alert(error.message || 'Không thể gỡ câu hỏi.');
    }
  };

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !createdTestId) return;
    const formData = new FormData();
    formData.append('file', file);
    setImporting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/admin/tests/${createdTestId}/questions/import-excel`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Không thể import Excel.');
      alert(`Đã import ${data.data?.imported || 0} câu hỏi từ Excel.`);
    } catch (error: any) { alert(error.message || 'Không thể import Excel.'); }
    finally { event.target.value = ''; setImporting(false); }
  };

  return (
    <div className="page page-md font-sans">
      <h1 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
        <FileText className="text-primary-600" /> Quản Trị Đề Thi TOEIC
      </h1>

      {!createdTestId ? (
        <div className="space-y-6">
          {/* TÍNH NĂNG MỚI: CHỌN ĐỀ THI ĐÃ CÓ */}
          <div className="card space-y-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Edit className="w-5 h-5 text-primary-500" /> Tiếp tục chỉnh sửa đề thi có sẵn
            </h2>
            <div className="flex gap-4">
              <select 
                value={selectedExistingId}
                onChange={(e) => setSelectedExistingId(e.target.value)}
                className="input flex-1"
              >
                <option value="">-- Chọn đề thi bạn muốn thêm câu hỏi --</option>
                {existingTests.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.title} (ID: {t.id})</option>
                ))}
              </select>
              <button 
                onClick={handleSelectExistingTest}
                className="btn-admin px-6 py-3"
              >
                Chọn đề này
              </button>
              <button type="button" onClick={handleTogglePublish} className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-inner border border-primary-200 text-primary-600 text-sm font-medium transition-colors hover:bg-primary-50">
                {existingTests.find((item) => item.id === selectedExistingId)?.status === 'PUBLISHED' ? 'Đưa về nháp' : 'Publish'}
              </button>
            </div>
          </div>

          {/* HOẶC TẠO MỚI (GIỮ NGUYÊN NHƯ CŨ) */}
          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 text-sm font-medium">HOẶC TẠO MỚI</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <form onSubmit={handleCreateTest} className="card space-y-4">
            <h2 className="text-lg font-bold text-slate-800">Khởi tạo thông tin đề thi mới</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tiêu đề đề thi</label>
              <input 
                type="text" 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                className="input"
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả</label>
              <textarea 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Thời gian làm bài (phút)</label>
              <input 
                type="number" 
                value={duration} 
                onChange={e => setDuration(Number(e.target.value))} 
                className="input"
                required 
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary w-full py-3"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />} Tạo Đề Thi & Tiếp Tục
            </button>
          </form>
        </div>
      ) : (
        /* BƯỚC 2: THÊM CÂU HỎI VÀO ĐỀ THI ĐÃ CHỌN */
        <div className="space-y-6">
          <div className="bg-success-50 border border-success-200 p-4 rounded-inner flex items-center justify-between">
            <span className="text-success-800 font-medium flex items-center gap-2">
              <CheckCircle className="w-5 h-5" /> Đang thêm câu hỏi cho đề thi (ID: {createdTestId})
            </span>
            <button 
              onClick={() => setCreatedTestId(null)} 
              className="text-sm text-primary-600 font-semibold hover:underline"
            >
              ← Quay lại chọn đề khác
            </button>
          </div>

          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">
                Câu hỏi hiện có ({loadingQuestions ? '...' : testQuestions.length})
              </h2>
              <Link to={`/admin/tests/${createdTestId}/edit`} className="text-sm text-primary-600 font-semibold hover:underline">
                Mở trình sửa đầy đủ (nhóm, media, transcript) →
              </Link>
            </div>
            {loadingQuestions ? (
              <p className="text-sm text-slate-500">Đang tải...</p>
            ) : testQuestions.length === 0 ? (
              <p className="text-sm text-slate-500">Đề chưa có câu hỏi nào. Thêm bên dưới hoặc import CSV/Excel.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {testQuestions.map((q: any) => (
                  <div key={q.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm flex justify-between items-center gap-2">
                    <span className="min-w-0">
                      <strong>{q.orderIndex}.</strong> <span className="break-words">{q.questionText}</span>{' '}
                      <span className="text-slate-500 whitespace-nowrap">(Part {q.partNumber} — {q.correctAnswer})</span>
                    </span>
                    <button
                      type="button"
                      title="Gỡ khỏi đề (giữ trong kho)"
                      onClick={() => handleUnlinkQuestion(q.id)}
                      className="p-1.5 shrink-0 text-slate-400 hover:text-warning-600 rounded-lg hover:bg-warning-50"
                    >
                      <Unlink className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleAddQuestion} className="card space-y-4">
            <h2 className="text-lg font-bold text-slate-800">Bước 2: Thêm câu hỏi</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Part số mấy?</label>
                <select 
                  value={partNumber} 
                  onChange={e => setPartNumber(Number(e.target.value))}
                  className="input"
                >
                  {[1, 2, 3, 4, 5, 6, 7].map(p => <option key={p} value={p}>Part {p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Đáp án đúng</label>
                <select 
                  value={correctAnswer} 
                  onChange={e => setCorrectAnswer(e.target.value)}
                  className="input"
                >
                  {['A', 'B', 'C', 'D'].map(opt => <option key={opt} value={opt}>Đáp án {opt}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nội dung câu hỏi</label>
              <textarea 
                value={questionText} 
                onChange={e => setQuestionText(e.target.value)} 
                placeholder="Nhập câu hỏi..." 
                className="input"
                required 
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Các lựa chọn đáp án</label>
              {options.map((opt, idx) => (
                <input 
                  key={idx}
                  type="text"
                  value={opt}
                  onChange={e => {
                    const newOpts = [...options];
                    newOpts[idx] = e.target.value;
                    setOptions(newOpts);
                  }}
                  className="w-full p-2.5 border border-slate-200 rounded-lg outline-none text-sm"
                  required
                />
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Lời giải chi tiết</label>
              <textarea 
                value={explanation} 
                onChange={e => setExplanation(e.target.value)} 
                placeholder="Giải thích vì sao chọn đáp án đó..." 
                className="input"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="btn-admin w-full py-3"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />} <PlusCircle className="w-5 h-5" /> Lưu và Thêm Câu Tiếp Theo
            </button>
            <div className="border-t border-slate-100 pt-4"><label className="block text-sm font-medium text-slate-700 mb-2">Import CSV hàng loạt</label><p className="text-xs text-slate-500 mb-2">Header: questionText, optionA, optionB, optionC, optionD, correctAnswer, explanation, partNumber</p><input type="file" accept=".csv,text/csv" disabled={importing} onChange={handleImportCsv} className="text-sm" />{importReport && <pre className="mt-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-inner p-3 whitespace-pre-wrap">{importReport}</pre>}</div>
            <div className="border-t border-slate-100 pt-4"><label className="block text-sm font-medium text-slate-700 mb-2">Import Excel</label><p className="text-xs text-slate-500 mb-2">Cột: questionText, optionA, optionB, optionC, optionD, correctAnswer, explanation, partNumber, difficulty, tags</p><input type="file" accept=".xlsx,.xls,.csv" disabled={importing} onChange={handleImportExcel} className="text-sm" /></div>
          </form>
        </div>
      )}
    </div>
  );
}