import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL, fetchApi } from '../lib/api';
import { Plus, ArrowLeft, BookOpen, FileAudio, FileText, Trash2, Pencil, Save, X, Unlink, Eye, BarChart3 } from 'lucide-react';
import { AccuracyBadge, DistBar } from '../components/DistBar';

/* Form dùng chung cho Thêm + Sửa câu hỏi (state riêng từng instance — fix bug
   form thêm dùng chung state cho mọi group ở bản cũ). */
interface QuestionPayload {
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: string;
  tags: string[];
}

function toPlainOptions(options: unknown): string[] {
  const arr = Array.isArray(options) ? options : [];
  const texts = arr.map((opt) => {
    if (typeof opt === 'string') return opt.replace(/^\s*\(?[A-D][\.\):\-]\s*/, '');
    if (opt && typeof opt === 'object') {
      const o = opt as Record<string, unknown>;
      const text = typeof o.text === 'string' ? o.text : '';
      return text.replace(/^\s*\(?[A-D][\.\):\-]\s*/, '');
    }
    return '';
  });
  while (texts.length < 4) texts.push('');
  return texts.slice(0, 4);
}

function QuestionForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: any;
  submitLabel: string;
  onSubmit: (payload: QuestionPayload) => Promise<void>;
  onCancel?: () => void;
}) {
  const [questionText, setQuestionText] = useState<string>(initial?.questionText || '');
  const [options, setOptions] = useState<string[]>(toPlainOptions(initial?.options));
  const [correctAnswer, setCorrectAnswer] = useState<string>(initial?.correctAnswer || 'A');
  const [explanation, setExplanation] = useState<string>(initial?.explanation || '');
  const [difficulty, setDifficulty] = useState<string>(initial?.difficulty || 'MEDIUM');
  const [tagsInput, setTagsInput] = useState<string>(Array.isArray(initial?.tags) ? initial.tags.join(', ') : '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (options.some((o) => !o.trim())) {
      alert('Vui lòng nhập đủ 4 lựa chọn đáp án.');
      return;
    }
    setSaving(true);
    try {
      const letters = ['A', 'B', 'C', 'D'];
      await onSubmit({
        questionText: questionText.trim(),
        options: options.map((text, i) => `${letters[i]}. ${text.trim()}`),
        correctAnswer,
        explanation: explanation.trim(),
        difficulty,
        tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-primary-50/30 rounded-xl border border-primary-100 space-y-3">
      <textarea
        placeholder="Nội dung câu hỏi..."
        value={questionText}
        onChange={(e) => setQuestionText(e.target.value)}
        className="input"
        required
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {options.map((opt, oIdx) => (
          <div key={oIdx} className="flex items-center gap-2">
            <span className="w-7 h-7 shrink-0 rounded-full bg-white border border-slate-300 flex items-center justify-center text-xs font-bold text-slate-600">
              {['A', 'B', 'C', 'D'][oIdx]}
            </span>
            <input
              type="text"
              value={opt}
              onChange={(e) => {
                const next = [...options];
                next[oIdx] = e.target.value;
                setOptions(next);
              }}
              className="input text-xs"
              required
            />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <select value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)} className="input w-auto text-xs" aria-label="Đáp án đúng">
          {['A', 'B', 'C', 'D'].map((v) => <option key={v} value={v}>Đáp án đúng: {v}</option>)}
        </select>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="input w-auto text-xs" aria-label="Độ khó">
          <option value="EASY">Dễ</option>
          <option value="MEDIUM">Trung bình</option>
          <option value="HARD">Khó</option>
        </select>
        <input
          type="text"
          placeholder="Tags (cách nhau bởi dấu phẩy)"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          className="input flex-1 text-xs min-w-40"
        />
      </div>
      <input
        type="text"
        placeholder="Giải thích chi tiết..."
        value={explanation}
        onChange={(e) => setExplanation(e.target.value)}
        className="input text-xs"
      />
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-success px-4 py-2 text-xs">
          {saving ? 'Đang lưu...' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-secondary px-4 py-2 text-xs">
            <X className="w-3.5 h-3.5" /> Hủy
          </button>
        )}
      </div>
    </form>
  );
}

/* Đọc JSON có kiểm tra lỗi để hiển thị inline thay vì alert mù. */
async function authedJson(path: string, method: string, body?: unknown): Promise<{ ok: boolean; status: number; data: any }> {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data: any = {};
  try {
    data = await response.json();
  } catch { /* response rỗng */ }
  return { ok: response.ok, status: response.status, data };
}

export default function AdminTestEditor() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();

  const [test, setTest] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [orderedQuestions, setOrderedQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state cho Bước 1: Tạo Question Group
  const [partNumber, setPartNumber] = useState(3);
  const [passageText, setPassageText] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [transcriptInput, setTranscriptInput] = useState('');

  // Trạng thái sửa inline
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [attachingQuestionId, setAttachingQuestionId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupDraft, setGroupDraft] = useState<any>({});
  const [groupError, setGroupError] = useState('');

  const loadTestData = async () => {
    try {
      const res = await fetchApi(`/admin/tests/${testId}/details`);
      if (res.success || res.status === 'success') {
        setTest(res.data.test);
        setGroups(res.data.groups || []);
        setOrderedQuestions(res.data.questions || []);
      }
    } catch (error) {
      console.error('Lỗi tải dữ liệu đề thi:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (testId) loadTestData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Thêm câu hỏi con vào group (dùng endpoint gắn testId để khỏi trôi khỏi đề)
  const handleAddQuestionToGroup = async (groupId: string, groupPart: number, payload: QuestionPayload) => {
    const group = groups.find((g) => g.id === groupId);
    const res = await fetchApi(`/admin/tests/${testId}/questions`, {
      method: 'POST',
      body: JSON.stringify({ groupId, partNumber: group?.partNumber ?? groupPart, ...payload }),
    });
    if (res.success || res.status === 'success') {
      loadTestData();
    } else {
      throw new Error(res.message);
    }
  };

  const handleUpdateQuestion = async (questionId: string, payload: QuestionPayload) => {
    await fetchApi(`/admin/questions/${questionId}`, { method: 'PUT', body: JSON.stringify(payload) });
    setEditingQuestionId(null);
    loadTestData();
  };

  // Xóa vĩnh viễn khỏi kho. BE chặn 409 khi đã có lượt thi → hỏi xóa buộc.
  const handleDeleteQuestion = async (questionId: string) => {
    if (!window.confirm('Xóa vĩnh viễn câu hỏi này khỏi kho? (Câu hỏi sẽ mất khỏi mọi đề)')) return;
    const first = await authedJson(`/admin/questions/${questionId}`, 'DELETE');
    if (first.ok) {
      loadTestData();
      return;
    }
    if (first.status === 409) {
      const count = first.data?.data?.answerCount ?? '?';
      if (window.confirm(`${first.data?.message || 'Câu hỏi đã có lượt thi.'}\n\nBạn có chắc muốn XÓA BUỘC? Lịch sử bài thi cũ sẽ bị ảnh hưởng.`)) {
        const forced = await authedJson(`/admin/questions/${questionId}?force=true`, 'DELETE');
        if (!forced.ok) throw new Error(forced.data?.message || 'Không thể xóa câu hỏi.');
        loadTestData();
      }
      return;
    }
    throw new Error(first.data?.message || 'Không thể xóa câu hỏi.');
  };

  const handleUnlinkQuestion = async (questionId: string) => {
    if (!window.confirm('Gỡ câu hỏi khỏi đề này? (Câu hỏi vẫn giữ lại trong kho)')) return;
    await fetchApi(`/admin/tests/${testId}/questions/${questionId}`, { method: 'DELETE' });
    loadTestData();
  };

  const startEditGroup = (group: any) => {
    setEditingGroupId(group.id);
    setGroupError('');
    setGroupDraft({
      title: group.title || '',
      partNumber: group.partNumber,
      passageText: group.passageText || '',
      audioUrl: group.audioUrl || '',
      imageUrl: group.imageUrl || '',
      transcriptText: group.transcript ? JSON.stringify(group.transcript, null, 2) : '',
    });
  };

  const handleSaveGroup = async (groupId: string) => {
    setGroupError('');
    let transcript: unknown;
    if (groupDraft.transcriptText?.trim()) {
      try {
        transcript = JSON.parse(groupDraft.transcriptText);
      } catch {
        setGroupError('Transcript không phải JSON hợp lệ. Kiểm tra dấu ngoặc/phẩy.');
        return;
      }
      if (!Array.isArray(transcript)) {
        setGroupError('Transcript phải là một mảng JSON (ví dụ: [{"startTime": 1.2, "text": "..."}]).');
        return;
      }
    }
    await fetchApi(`/admin/question-groups/${groupId}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: groupDraft.title?.trim() || null,
        partNumber: Number(groupDraft.partNumber),
        passageText: groupDraft.passageText?.trim() || null,
        audioUrl: groupDraft.audioUrl?.trim() || null,
        imageUrl: groupDraft.imageUrl?.trim() || null,
        ...(groupDraft.transcriptText?.trim() ? { transcript } : { transcript: [] }),
      }),
    });
    setEditingGroupId(null);
    loadTestData();
  };

  const handleDeleteGroup = async (groupId: string, questionCount: number) => {
    if (!window.confirm(`Xóa nhóm này? ${questionCount} câu hỏi bên trong sẽ giữ lại thành câu rời (không mất).`)) return;
    await fetchApi(`/admin/question-groups/${groupId}`, { method: 'DELETE' });
    loadTestData();
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

  const standalone = orderedQuestions.filter((q) => !q.groupId);

  const renderQuestionRow = (q: any, label: string) => (
    <div key={q.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm space-y-2">
      <div className="flex justify-between items-center gap-2">
        <span className="min-w-0"><strong>{label}.</strong> <span className="break-words">{q.questionText}</span> <span className="text-slate-500">(Đáp án: {q.correctAnswer})</span></span>
        <span className="flex shrink-0 gap-1">
          <button
            type="button"
            title="Gắn từ vựng vào câu hỏi"
            onClick={() => setAttachingQuestionId(attachingQuestionId === q.id ? null : q.id)}
            className="p-1.5 text-slate-400 hover:text-success-600 rounded-lg hover:bg-success-50"
          >
            <BookOpen className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Sửa câu hỏi"
            onClick={() => setEditingQuestionId(editingQuestionId === q.id ? null : q.id)}
            className="p-1.5 text-slate-400 hover:text-primary-600 rounded-lg hover:bg-primary-50"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Gỡ khỏi đề (giữ trong kho)"
            onClick={() => handleUnlinkQuestion(q.id).catch((e: any) => alert(e.message))}
            className="p-1.5 text-slate-400 hover:text-warning-600 rounded-lg hover:bg-warning-50"
          >
            <Unlink className="w-4 h-4" />
          </button>
          <button
            type="button"
            title="Xóa vĩnh viễn khỏi kho"
            onClick={() => handleDeleteQuestion(q.id).catch((e: any) => alert(e.message))}
            className="p-1.5 text-slate-400 hover:text-danger-600 rounded-lg hover:bg-danger-50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </span>
      </div>
      {editingQuestionId === q.id && (
        <QuestionForm
          initial={q}
          submitLabel="Lưu thay đổi"
          onCancel={() => setEditingQuestionId(null)}
          onSubmit={(payload) => handleUpdateQuestion(q.id, payload).catch((e: any) => alert(e.message || 'Không thể cập nhật.'))}
        />
      )}
      {attachingQuestionId === q.id && (
        <WordAttachPanel questionId={q.id} links={q.vocabLinks || []} onChanged={loadTestData} />
      )}
    </div>
  );

  return (
    <div className="page page-lg space-y-8">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary-600"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách quản trị
        </button>
        <h1 className="text-xl font-bold text-slate-900">Quản trị Đề thi: {test?.title}</h1>
        <button onClick={() => navigate(`/admin/tests/${testId}/preview`)} className="text-sm text-primary-600 font-medium flex items-center gap-1">
          <Eye className="w-4 h-4" /> Xem preview
        </button>
      </div>

      {/* BƯỚC 1: TẠO CỤM CÂU HỎI (TỰ ĐỘNG ĐỔI GIAO DIỆN THEO PART) */}
      <form onSubmit={handleAddGroup} className="card space-y-4">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <FileAudio className="text-primary-600 w-5 h-5" /> Bước 1: Tạo Cụm Câu Hỏi / Nhóm Mới
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Part số mấy?</label>
            <select
              value={partNumber}
              onChange={(e) => setPartNumber(Number(e.target.value))}
              className="input"
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
            <span className="text-xs text-primary-600 font-medium bg-primary-50 p-3 rounded-xl w-full text-center">
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
              className="input"
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
              className="input font-reading"
            />
          </div>
        )}

        {/* Transcript JSON cho Part 3, 4 */}
        {[3, 4].includes(partNumber) && (
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Transcript JSON (Đồng bộ âm thanh)</label>
            <textarea
              rows={2}
              placeholder='[{"startTime": 1.2, "endTime": 3.5, "text": "Hello"}]'
              value={transcriptInput}
              onChange={(e) => setTranscriptInput(e.target.value)}
              className="input font-mono text-xs"
            />
          </div>
        )}

        <button
          type="submit"
          className="btn-admin"
        >
          <Plus className="w-4 h-4" /> Tạo Nhóm / Cụm Câu Hỏi
        </button>
      </form>

      {/* CÂU RỜI: câu thuộc đề nhưng không nằm trong group nào */}
      {standalone.length > 0 && (
        <div className="card space-y-3">
          <h2 className="text-base font-bold text-slate-800">
            Câu rời không thuộc nhóm ({standalone.length})
          </h2>
          <p className="text-xs text-slate-500">Thường là Part 1/2/5 tạo nhanh từ trang Quản trị đề thi.</p>
          {standalone.map((q: any) => renderQuestionRow(q, String(q.orderIndex)))}
        </div>
      )}

      {/* DANH SÁCH NHÓM & BƯỚC 2: THÊM CÂU HỎI CON */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-slate-900">Danh Sách Nhóm Câu Hỏi & Thêm Câu Hỏi Con</h2>

        {groups.map((group, gIdx) => (
          <div key={group.id} className="card space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 gap-2">
              <span className="text-xs font-bold bg-primary-50 text-primary-600 px-3 py-1 rounded-full">
                Nhóm {gIdx + 1} - Part {group.partNumber}{group.title ? ` — ${group.title}` : ''}
              </span>
              <div className="flex items-center gap-1">
                {group.audioUrl && <span className="badge bg-info-50 text-info-600">Có Audio</span>}
                {group.passageText && <span className="bg-success-50 text-success-600 px-2 py-0.5 rounded text-xs">Có Passage</span>}
                <button
                  type="button"
                  title="Sửa nhóm (media, passage, transcript)"
                  onClick={() => (editingGroupId === group.id ? setEditingGroupId(null) : startEditGroup(group))}
                  className="p-1.5 text-slate-400 hover:text-primary-600 rounded-lg hover:bg-primary-50"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  title="Xóa nhóm (câu hỏi giữ lại thành câu rời)"
                  onClick={() => handleDeleteGroup(group.id, group.questions?.length || 0).catch((e: any) => alert(e.message))}
                  className="p-1.5 text-slate-400 hover:text-danger-600 rounded-lg hover:bg-danger-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {editingGroupId === group.id && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Tên nội bộ</label>
                    <input value={groupDraft.title || ''} onChange={(e) => setGroupDraft({ ...groupDraft, title: e.target.value })} className="input text-sm" placeholder="VD: Hội thoại tại nhà ga" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Part</label>
                    <select value={groupDraft.partNumber} onChange={(e) => setGroupDraft({ ...groupDraft, partNumber: Number(e.target.value) })} className="input text-sm">
                      {[1, 2, 3, 4, 5, 6, 7].map((p) => <option key={p} value={p}>Part {p}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Audio URL</label>
                  <input value={groupDraft.audioUrl || ''} onChange={(e) => setGroupDraft({ ...groupDraft, audioUrl: e.target.value })} className="input text-sm font-mono" placeholder="https://..." />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Image URL</label>
                  <input value={groupDraft.imageUrl || ''} onChange={(e) => setGroupDraft({ ...groupDraft, imageUrl: e.target.value })} className="input text-sm font-mono" placeholder="https://..." />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Passage (Part 6/7)</label>
                  <textarea rows={3} value={groupDraft.passageText || ''} onChange={(e) => setGroupDraft({ ...groupDraft, passageText: e.target.value })} className="input text-sm font-reading" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Transcript JSON (mảng)</label>
                  <textarea
                    rows={4}
                    value={groupDraft.transcriptText || ''}
                    onChange={(e) => setGroupDraft({ ...groupDraft, transcriptText: e.target.value })}
                    className="input font-mono text-xs"
                    placeholder='[{"startTime": 1.2, "endTime": 3.5, "text": "Hello"}]'
                  />
                </div>
                {groupError && <p className="text-sm text-danger-600">{groupError}</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => handleSaveGroup(group.id).catch((e: any) => setGroupError(e.message))} className="btn-admin px-4 py-2 text-xs">
                    <Save className="w-3.5 h-3.5" /> Lưu nhóm
                  </button>
                  <button type="button" onClick={() => setEditingGroupId(null)} className="btn-secondary px-4 py-2 text-xs">Hủy</button>
                </div>
              </div>
            )}

            {group.audioUrl && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <audio controls src={group.audioUrl} className="w-full h-10" />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <label className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-slate-600">Upload audio<input type="file" accept="audio/*" className="hidden" onChange={(event) => handleMediaUpload(event, group.id, 'audio')} /></label>
              <label className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-slate-600">Upload image<input type="file" accept="image/*" className="hidden" onChange={(event) => handleMediaUpload(event, group.id, 'image')} /></label>
              {group.audioUrl && <button type="button" onClick={() => handleMediaDelete(group.id, 'audioUrl')} className="text-danger-600">Xóa audio</button>}
              {group.imageUrl && <button type="button" onClick={() => handleMediaDelete(group.id, 'imageUrl')} className="text-danger-600">Xóa image</button>}
            </div>

            {group.passageText && (
              <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-inner border border-slate-100 leading-relaxed font-reading whitespace-pre-wrap">
                {group.passageText}
              </p>
            )}

            {/* Danh sách câu hỏi đã có trong nhóm */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase">Các câu hỏi thuộc nhóm này ({group.questions?.length || 0}):</h4>
              {(group.questions || []).map((q: any, qIdx: number) => renderQuestionRow(q, String(qIdx + 1)))}
            </div>

            {/* Form thêm câu hỏi con vào nhóm (state riêng từng group) */}
            <div>
              <h4 className="text-xs font-bold text-primary-700 uppercase mb-2">Bước 2: Thêm câu hỏi vào nhóm này</h4>
              <QuestionForm
                key={`add-${group.id}`}
                submitLabel="Thêm câu hỏi"
                onSubmit={(payload) => handleAddQuestionToGroup(group.id, group.partNumber, payload)}
              />
            </div>
          </div>
        ))}
      </div>

      <QuestionStatsSection testId={testId || ''} />
    </div>
  );
}

/** Panel gắn từ vựng (kho chung) vào câu hỏi — tạo cầu nối gợi ý bài từ theo Part yếu. */
function WordAttachPanel({ questionId, links, onChanged }: { questionId: string; links: any[]; onChanged: () => void }) {
  const [topics, setTopics] = useState<any[]>([]);
  const [topicId, setTopicId] = useState('');
  const [words, setWords] = useState<any[]>([]);
  const [wordId, setWordId] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchApi('/admin/vocab-topics').then((r) => setTopics(r.data?.topics || [])).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!topicId) {
      setWords([]);
      setWordId('');
      return;
    }
    fetchApi(`/admin/vocab-topics/${topicId}/words`).then((r) => setWords(r.data?.words || [])).catch(() => undefined);
  }, [topicId]);

  const attachedIds = new Set((links || []).map((l: any) => l.word?.id || l.wordId));

  const attach = async () => {
    if (!wordId) return;
    setBusy(true);
    try {
      await fetchApi(`/admin/questions/${questionId}/words`, { method: 'POST', body: JSON.stringify({ wordId }) });
      setWordId('');
      onChanged();
    } catch (e: any) {
      alert(e.message || 'Không gắn được từ.');
    } finally {
      setBusy(false);
    }
  };

  const detach = async (wid: string) => {
    try {
      await fetchApi(`/admin/questions/${questionId}/words/${wid}`, { method: 'DELETE' });
      onChanged();
    } catch (e: any) {
      alert(e.message || 'Không gỡ được từ.');
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {(links || []).length === 0 && <span className="text-xs text-slate-400">Chưa gắn từ nào.</span>}
        {(links || []).map((l: any) => (
          <span key={l.word?.id || l.wordId} className="badge bg-primary-50 text-primary-700" title={l.word?.meaning}>
            {l.word?.word || l.wordId}
            <button type="button" onClick={() => detach(l.word?.id || l.wordId)} className="ml-1 hover:text-danger-600 font-bold" title="Gỡ từ">×</button>
          </span>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <select value={topicId} onChange={(e) => setTopicId(e.target.value)} className="input text-xs sm:w-auto" aria-label="Chọn chủ đề">
          <option value="">— Chọn chủ đề —</option>
          {topics.map((t: any) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
        <select value={wordId} onChange={(e) => setWordId(e.target.value)} disabled={!topicId} className="input text-xs flex-1" aria-label="Chọn từ">
          <option value="">— Chọn từ —</option>
          {words.filter((w: any) => !attachedIds.has(w.id)).map((w: any) => <option key={w.id} value={w.id}>{w.word} — {w.meaning}</option>)}
        </select>
        <button type="button" onClick={attach} disabled={!wordId || busy} className="btn-secondary px-3 py-2 text-xs whitespace-nowrap">
          <Plus className="w-3.5 h-3.5" /> Gắn từ
        </button>
      </div>
    </div>
  );
}

/** Phân tích độ khó: tỷ lệ đúng + phân bố đáp án từng câu (chỉ tính lượt đã nộp). */
function QuestionStatsSection({ testId }: { testId: string }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!testId) return;
    fetchApi(`/admin/tests/${testId}/question-stats`)
      .then((res) => setStats(res.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [testId]);

  if (loading) return <div className="card text-sm text-slate-500">Đang tải phân tích độ khó...</div>;
  if (!stats) return null;

  const summary = stats.summary || {};
  const short = (text: string) => (text.length > 60 ? `${text.slice(0, 60)}…` : text);

  return (
    <section className="card space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary-600" /> Phân tích độ khó câu hỏi
        </h2>
        <span className="badge bg-primary-50 text-primary-700">{stats.submittedCount || 0} lượt nộp</span>
      </div>

      {summary.answeredQuestions ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="bg-slate-50 rounded-inner p-3">
              <p className="text-xs text-slate-500">Độ chính xác trung bình</p>
              <p className="text-xl font-bold text-slate-900">{summary.avgAccuracy}%</p>
            </div>
            <div className="bg-danger-50 rounded-inner p-3">
              <p className="text-xs text-danger-600 font-semibold">Khó nhất</p>
              {(summary.hardest || []).map((q: any) => (
                <p key={q.questionId} className="text-xs text-slate-700 mt-1">#{q.orderIndex} {short(q.questionText)} ({q.accuracy}%)</p>
              ))}
            </div>
            <div className="rounded-inner p-3" style={{ background: 'var(--color-success-50)' }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--color-success-700)' }}>Dễ nhất</p>
              {(summary.easiest || []).map((q: any) => (
                <p key={q.questionId} className="text-xs text-slate-700 mt-1">#{q.orderIndex} {short(q.questionText)} ({q.accuracy}%)</p>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <th className="py-2 pr-3 font-semibold w-10">#</th>
                  <th className="py-2 pr-3 font-semibold">Câu hỏi</th>
                  <th className="py-2 pr-3 font-semibold whitespace-nowrap">Độ đúng</th>
                  <th className="py-2 font-semibold min-w-44">Phân bố đáp án (viền đậm = đúng)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(stats.stats || []).map((s: any) => (
                  <tr key={s.questionId} className="hover:bg-slate-50 align-top">
                    <td className="py-3 pr-3 text-slate-500">{s.orderIndex}</td>
                    <td className="py-3 pr-3">
                      <p className="text-slate-800 max-w-72" title={s.questionText}>{short(s.questionText)}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Part {s.partNumber} • {s.answered} lượt trả lời</p>
                    </td>
                    <td className="py-3 pr-3"><AccuracyBadge accuracy={s.accuracy} answered={s.answered} /></td>
                    <td className="py-3"><DistBar dist={s.dist} correct={s.correctAnswer} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="text-sm text-slate-500">
          Chưa có lượt nộp nào cho đề này — bảng phân bố đáp án sẽ hiện sau khi học viên làm bài.
        </p>
      )}
    </section>
  );
}
