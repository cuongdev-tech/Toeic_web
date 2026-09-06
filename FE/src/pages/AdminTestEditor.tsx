import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL, fetchApi } from '../lib/api';
import { Plus, ArrowLeft, FileAudio, FileText, Trash2 } from 'lucide-react';

export default function AdminTestEditor() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();

  const [test, setTest] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state cho Bước 1: Tạo Question Group
  const [partNumber, setPartNumber] = useState(3);
  const [passageText, setPassageText] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [transcriptInput, setTranscriptInput] = useState('');

  // Form state cho Bước 2: Thêm câu hỏi con vào group
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState(['A. ', 'B. ', 'C. ', 'D. ']);
  const [correctAnswer, setCorrectAnswer] = useState('A');
  const [explanation, setExplanation] = useState('');

  const loadTestData = async () => {
    try {
      const res = await fetchApi(`/admin/tests/${testId}/details`);
      if (res.success || res.status === 'success') {
        setTest(res.data.test);
        setGroups(res.data.groups || []);
      }
    } catch (error) {
      console.error('Lỗi tải dữ liệu đề thi:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (testId) loadTestData();
  }, [testId]);

  // Xử lý tạo Cụm câu hỏi (Group)
  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let parsedTranscript = [];
      if (transcriptInput) {
        parsedTranscript = JSON.parse(transcriptInput);
      }

      const res = await fetchApi(`/admin/question-groups`, {
        method: 'POST',
        body: JSON.stringify({
          testId,
          partNumber: Number(partNumber),
          passageText: [6, 7].includes(Number(partNumber)) ? passageText : null,
          audioUrl: [3, 4].includes(Number(partNumber)) ? audioUrl : null,
          transcript: parsedTranscript
        })
      });

      if (res.success || res.status === 'success') {
        alert('Tạo nhóm câu hỏi thành công!');
        setPassageText('');
        setAudioUrl('');
        setTranscriptInput('');
        loadTestData();
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi định dạng JSON Transcript hoặc tạo nhóm thất bại.');
    }
  };

  // Xử lý thêm câu hỏi vào Group
  const handleAddQuestion = async (e: React.FormEvent, groupId: string, groupPart: number) => {
    e.preventDefault();
    try {
      const res = await fetchApi(`/admin/questions`, {
        method: 'POST',
        body: JSON.stringify({
          groupId,
          partNumber: groupPart,
          questionText,
          options,
          correctAnswer,
          explanation
        })
      });

      if (res.success || res.status === 'success') {
        alert('Thêm câu hỏi thành công!');
        setQuestionText('');
        setOptions(['A. ', 'B. ', 'C. ', 'D. ']);
        setExplanation('');
        loadTestData();
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi thêm câu hỏi.');
    }
  };

  const handleMediaUpload = async (event: React.ChangeEvent<HTMLInputElement>, groupId: string, field: 'audio' | 'image') => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append(field, file);
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/admin/question-groups/${groupId}/media`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: formData });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Không thể upload media.');
    loadTestData();
    event.target.value = '';
  };

  const handleMediaDelete = async (groupId: string, field: 'audioUrl' | 'imageUrl') => {
    if (!window.confirm('Bạn có chắc muốn xóa media này?')) return;
    await fetchApi(`/admin/question-groups/${groupId}/media`, { method: 'DELETE', body: JSON.stringify({ field }) });
    loadTestData();
  };

  if (loading) return <div className="p-10 text-center text-slate-500">Đang tải trình quản trị đề thi...</div>;

  return (
    <div className="max-w-5xl mx-auto p-6 font-sans space-y-8">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <button 
          onClick={() => navigate('/admin')}
          className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-indigo-600"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách quản trị
        </button>
        <h1 className="text-xl font-bold text-slate-900">Quản trị Đề thi: {test?.title}</h1>
        <button onClick={() => navigate(`/admin/tests/${testId}/preview`)} className="text-sm text-indigo-600 font-medium">Xem preview</button>
      </div>

      {/* BƯỚC 1: TẠO CỤM CÂU HỎI (TỰ ĐỘNG ĐỔI GIAO DIỆN THEO PART) */}
      <form onSubmit={handleAddGroup} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <FileAudio className="text-indigo-600 w-5 h-5" /> Bước 1: Tạo Cụm Câu Hỏi / Nhóm Mới
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Part số mấy?</label>
            <select 
              value={partNumber} 
              onChange={(e) => setPartNumber(Number(e.target.value))}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-600"
            >
              <option value={1}>Part 1 (Mô tả tranh)</option>
              <option value={2}>Part 2 (Hỏi - đáp)</option>
              <option value={3}>Part 3 (Hội thoại ngắn)</option>
              <option value={4}>Part 4 (Bài nói chuyện ngắn)</option>
              <option value={5}>Part 5 (Điền từ ngữ pháp)</option>
              <option value={6}>Part 6 (Điền vào đoạn văn)</option>
              <option value={7}>Part 7 (Đọc hiểu đoạn)</option>
            </select>
          </div>

          <div className="flex items-end">
            <span className="text-xs text-indigo-600 font-medium bg-indigo-50 p-3 rounded-xl w-full text-center">
              {([3, 4].includes(partNumber)) ? '🎧 Part nghe: Yêu cầu Link Audio & Transcript' : ([6, 7].includes(partNumber)) ? '📖 Part đọc: Yêu cầu Đoạn văn (Passage)' : '📝 Part câu hỏi đơn'}
            </span>
          </div>
        </div>

        {/* Hiện ô nhập Audio nếu là Part 3 hoặc 4 */}
        {[3, 4].includes(partNumber) && (
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Đường dẫn Audio URL</label>
            <input 
              type="text" 
              placeholder="https://example.com/audio.mp3"
              value={audioUrl}
              onChange={(e) => setAudioUrl(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-600"
            />
          </div>
        )}

        {/* Hiện ô nhập đoạn văn (Passage) nếu là Part 6 hoặc 7 */}
        {[6, 7].includes(partNumber) && (
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Đoạn văn bản / Passage Text (Cho Part 6 & 7)</label>
            <textarea 
              rows={4}
              placeholder="Nhập nội dung đoạn văn đọc hiểu..."
              value={passageText}
              onChange={(e) => setPassageText(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-600 font-serif"
            />
          </div>
        )}

        {/* Transcript JSON cho Part 3, 4 */}
        {[3, 4].includes(partNumber) && (
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Transcript JSON (Đồng bộ âm thanh)</label>
            <textarea 
              rows={2}
              placeholder='[{"speaker": "Man", "text": "Hello", "vi": "Xin chào"}]'
              value={transcriptInput}
              onChange={(e) => setTranscriptInput(e.target.value)}
              className="w-full p-3 font-mono bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600"
            />
          </div>
        )}

        <button 
          type="submit" 
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-3 rounded-xl text-sm transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Tạo Nhóm / Cụm Câu Hỏi
        </button>
      </form>

      {/* DANH SÁCH NHÓM & BƯỚC 2: THÊM CÂU HỎI CON */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-slate-900">Danh Sách Nhóm Câu Hỏi & Thêm Câu Hỏi Con</h2>
        
        {groups.map((group, gIdx) => (
          <div key={group.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full">
                Nhóm {gIdx + 1} - Part {group.partNumber}
              </span>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                {group.audioUrl && <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded">Có Audio</span>}
                {group.passageText && <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded">Có Passage</span>}
              </div>
            </div>

            {group.audioUrl && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <audio controls src={group.audioUrl} className="w-full h-10" />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <label className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-slate-600">Upload audio<input type="file" accept="audio/*" className="hidden" onChange={(event) => handleMediaUpload(event, group.id, 'audio')} /></label>
              <label className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-slate-600">Upload image<input type="file" accept="image/*" className="hidden" onChange={(event) => handleMediaUpload(event, group.id, 'image')} /></label>
              {group.audioUrl && <button type="button" onClick={() => handleMediaDelete(group.id, 'audioUrl')} className="text-red-600">Xóa audio</button>}
              {group.imageUrl && <button type="button" onClick={() => handleMediaDelete(group.id, 'imageUrl')} className="text-red-600">Xóa image</button>}
            </div>

            {group.passageText && (
              <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed font-serif whitespace-pre-wrap">
                {group.passageText}
              </p>
            )}

            {/* Danh sách câu hỏi đã có trong nhóm */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase">Các câu hỏi thuộc nhóm này ({group.questions?.length || 0}):</h4>
              {group.questions?.map((q: any, qIdx: number) => (
                <div key={q.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm flex justify-between items-center">
                  <span><strong>{qIdx + 1}.</strong> {q.questionText} (Đáp án đúng: {q.correctAnswer})</span>
                </div>
              ))}
            </div>

            {/* Form thêm câu hỏi con vào nhóm */}
            <form onSubmit={(e) => handleAddQuestion(e, group.id, group.partNumber)} className="p-4 bg-indigo-50/30 rounded-xl border border-indigo-100 space-y-3">
              <h4 className="text-xs font-bold text-indigo-700 uppercase">Bước 2: Thêm câu hỏi vào nhóm này</h4>
              <input 
                type="text" 
                placeholder="Nội dung câu hỏi..."
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-600"
                required
              />
              <div className="grid grid-cols-2 gap-2">
                {options.map((opt, oIdx) => (
                  <input 
                    key={oIdx}
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...options];
                      newOpts[oIdx] = e.target.value;
                      setOptions(newOpts);
                    }}
                    className="p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-600"
                    required
                  />
                ))}
              </div>
              <div className="flex gap-4 items-center">
                <select 
                  value={correctAnswer} 
                  onChange={(e) => setCorrectAnswer(e.target.value)}
                  className="p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-600"
                >
                  <option value="A">Đáp án đúng: A</option>
                  <option value="B">Đáp án đúng: B</option>
                  <option value="C">Đáp án đúng: C</option>
                  <option value="D">Đáp án đúng: D</option>
                </select>
                <input 
                  type="text"
                  placeholder="Giải thích chi tiết..."
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-600"
                />
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-medium">
                  Thêm câu hỏi
                </button>
              </div>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}