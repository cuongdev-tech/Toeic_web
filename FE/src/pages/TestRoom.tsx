import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL, fetchApi } from '../lib/api';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Volume2, 
  Send,
  ChevronLeft,
  X,
  Loader2,
  FileText
} from 'lucide-react';

interface QuestionGroup {
  id?: string;
  partNumber: number;
  audioUrl?: string;
  imageUrl?: string;
  passageText?: string;
}

interface Question {
  id: string;
  groupId?: string;
  partNumber: number;
  questionText: string;
  options: string;
  group?: QuestionGroup;
}

interface AnswerState {
  questionId: string;
  selectedOption: string;
}

export default function TestRoom() {
  const { id: testId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // --- STATES ---
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [testInfo, setTestInfo] = useState<{ title: string; duration: number } | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  
  const [answers, setAnswers] = useState<AnswerState[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [cheatCount, setCheatCount] = useState<number>(0);
  const [savedQuestionIds, setSavedQuestionIds] = useState<string[]>([]);
  
  // Modal states
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showCheatModal, setShowCheatModal] = useState(false);

  // --- REFS (Dành cho Background Sync & Timer không gây re-render) ---
  const answersRef = useRef<AnswerState[]>([]);
  const cheatCountRef = useRef<number>(0);
  // deadlineAt do SERVER chốt (epoch ms, đã bù lệch đồng hồ client/server).
  // Đồng hồ hiển thị suy ra từ mốc này, không tin timeLeft trong localStorage.
  const deadlineAtRef = useRef<number>(0);
  // Lệch đồng hồ client - server (ms), đo lúc start để đếm ngược chính xác.
  const clockSkewRef = useRef<number>(0);
  const submittingRef = useRef<boolean>(false);

  // Đồng bộ Ref với State
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { cheatCountRef.current = cheatCount; }, [cheatCount]);

  const draftKey = `toeic-draft-${testId}`;

  // --- 1. KHỞI TẠO PHÒNG THI (MOUNT) ---
  useEffect(() => {
    const initRoom = async () => {
      try {
        // 1. Lấy thông tin đề thi
        const testRes = await fetchApi(`/tests/${testId}`);
        if (!testRes.success && testRes.status !== 'success') throw new Error(testRes.message || 'Không tải được đề thi.');
        
        const data = testRes.data.test || testRes.data; 
        setTestInfo({ title: data.title, duration: data.duration });
        
        
        const rawQuestions = data.questions || [];
        const formattedQuestions = rawQuestions.map((item: any) => item.question || item);
        setQuestions(formattedQuestions);
        
        // Reuse the existing in-progress attempt when the student returns.
        const startRes = await fetchApi('/tests/attempts/start', {
          method: 'POST',
          body: JSON.stringify({ testId })
        });
        if (!startRes.success && startRes.status !== 'success') throw new Error(startRes.message || 'Không thể bắt đầu lượt thi.');
        const attempt = startRes.data;
        // Chốt deadline theo giờ server (bù lệch đồng hồ client). Fallback cho BE cũ.
        const skew = attempt.serverTime ? Date.now() - new Date(attempt.serverTime).getTime() : 0;
        clockSkewRef.current = skew;
        const deadlineMs = attempt.deadlineAt
          ? new Date(attempt.deadlineAt).getTime()
          : Date.now() - skew + (attempt.timeRemaining ?? data.duration * 60) * 1000;
        deadlineAtRef.current = deadlineMs;
        const initialTime = Math.max(0, Math.floor((deadlineMs - (Date.now() - skew)) / 1000));
        let restoredAnswers = (attempt.answers || []).filter((answer: AnswerState) => answer.selectedOption);
        try {
          const draft = JSON.parse(localStorage.getItem(draftKey) || '{}');
          if (Array.isArray(draft.answers) && draft.answers.length > restoredAnswers.length) restoredAnswers = draft.answers;
          if (Array.isArray(draft.savedQuestionIds)) setSavedQuestionIds(draft.savedQuestionIds);
          // Không phục hồi timeLeft từ draft: đồng hồ duy nhất là deadlineAt của server.
        } catch { /* Ignore a corrupted offline draft and use server state. */ }
        setTimeLeft(initialTime);
        setCheatCount(attempt.cheatWarningCount || 0);
        cheatCountRef.current = attempt.cheatWarningCount || 0;
        setAnswers(restoredAnswers);
        answersRef.current = restoredAnswers;
        setAttemptId(attempt.id);

      } catch (err: any) {
        alert(err.message || 'Lỗi khởi tạo phòng thi! Vui lòng thử lại.');
        navigate('/tests');
      } finally {
        setLoading(false);
      }
    };

    if (testId) initRoom();
  }, [testId, navigate]);

  // --- 2. HỆ THỐNG ANTI-CHEAT ---
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && attemptId) { // Chỉ tính khi đã vào phòng thi thành công
        setCheatCount(prev => prev + 1);
        setShowCheatModal(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [attemptId]);

  // --- 3. NỘP BÀI (idempotent: timer + sync hết giờ + nút nộp cùng gọi) ---
  const handleSubmit = async (autoSubmit = false) => {
    if (!attemptId || submittingRef.current) return;
    submittingRef.current = true;
    setShowSubmitModal(false);
    setSubmitting(true);

    try {
      // Sync cuối (không gửi timeRemaining: server tự tính từ deadlineAt).
      // Sync có thể 409 hết giờ -> vẫn nộp tiếp trong ân hạn 120s của server.
      try {
        await fetchApi(`/tests/attempts/${attemptId}/sync`, {
          method: 'PATCH',
          body: JSON.stringify({
            cheatWarningCount: cheatCountRef.current,
            answers: answersRef.current,
          }),
        });
      } catch (syncErr) {
        console.warn('Sync cuối thất bại, vẫn nộp bài:', syncErr);
      }
      const res = await fetchApi(`/tests/attempts/${attemptId}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          answers: answersRef.current,
          cheatCount: cheatCountRef.current
        })
      });

      if (res.success || res.status === 'success') {
        if (res.data?.isLate) alert('Bài đã hết giờ nhưng vẫn nộp kịp trong thời gian ân hạn của hệ thống.');
        setShowSubmitModal(false);
        navigate(`/tests/review/${attemptId}`);
        localStorage.removeItem(draftKey);
      } else {
        throw new Error(res.message);
      }
    } catch (err: any) {
      const expired = /hết giờ|quá hạn|expired/i.test(err.message || '');
      if (expired || autoSubmit) {
        alert('Bài thi đã hết giờ theo giờ hệ thống. Lượt thi này đã được đóng.');
        navigate('/tests');
        localStorage.removeItem(draftKey);
        return;
      }
      alert(err.message || 'Lỗi trong quá trình nộp bài.');
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  // --- 4. ĐỒNG HỒ ĐẾM NGƯỢC (suy ra từ deadlineAt của server) ---
  useEffect(() => {
    if (loading || !attemptId || submitting) return;

    const tick = () => {
      const remaining = Math.max(0, Math.floor((deadlineAtRef.current - (Date.now() - clockSkewRef.current)) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) void handleSubmit(true); // Hết giờ (giờ server) -> tự động nộp
    };
    tick();
    const timer = setInterval(tick, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, attemptId, submitting]);

  useEffect(() => {
    if (!testId || !attemptId || submitting) return;
    // Chỉ lưu đáp án + cheat + saved; KHÔNG lưu timeLeft (giờ do server quản lý).
    localStorage.setItem(draftKey, JSON.stringify({ answers, cheatCount, savedQuestionIds, updatedAt: Date.now() }));
  }, [answers, cheatCount, savedQuestionIds, testId, attemptId, submitting]);

  useEffect(() => {
    if (!attemptId || submitting) return;

    const saveBeforeExit = () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      void fetch(`${API_BASE_URL}/tests/attempts/${attemptId}/sync`, {
        method: 'PATCH',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cheatWarningCount: cheatCountRef.current,
          answers: answersRef.current,
        }),
      });
    };

    window.addEventListener('beforeunload', saveBeforeExit);
    return () => window.removeEventListener('beforeunload', saveBeforeExit);
  }, [attemptId, submitting]);

  // --- 5. AUTO-SAVE NGẦM (BACKGROUND SYNC) MỖI 30S ---
  useEffect(() => {
    if (loading || !attemptId || submitting) return;

    const syncInterval = setInterval(() => {
      fetchApi(`/tests/attempts/${attemptId}/sync`, {
        method: 'PATCH',
        body: JSON.stringify({
          cheatWarningCount: cheatCountRef.current,
          answers: answersRef.current
        })
      }).then((res) => {
        // Server hết giờ hoặc cheat vượt ngưỡng -> nộp ngay, không chờ timer.
        if (res?.forceSubmit) void handleSubmit(true);
        else if (typeof res?.serverRemaining === 'number') {
          const remaining = Math.max(0, res.serverRemaining);
          setTimeLeft(remaining);
          if (remaining <= 0) void handleSubmit(true);
        }
      }).catch((err) => {
        // fetchApi ném Error khi 409: hết giờ -> tự nộp để kịp ân hạn server.
        if (/hết giờ|expired/i.test(err?.message || '')) void handleSubmit(true);
        else console.error('Lỗi Auto-save ngầm:', err); // Silent fail
      });
    }, 30000); // 30 giây

    return () => clearInterval(syncInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, attemptId, submitting]);

  // --- HANDLERS ---
  const handleSelectAnswer = useCallback((questionId: string, option: string) => {
    setAnswers(prev => {
      const existing = prev.find(a => a.questionId === questionId);
      if (existing) {
        return prev.map(a => a.questionId === questionId ? { ...a, selectedOption: option } : a);
      }
      return [...prev, { questionId, selectedOption: option }];
    });
  }, []);

  const saveQuestionAsVocabulary = async (question: Question) => {
    if (savedQuestionIds.includes(question.id)) return;
    const word = window.prompt('Nhập từ/cụm từ muốn lưu:', question.questionText.slice(0, 80));
    if (!word) return;
    const meaning = window.prompt('Nhập nghĩa tiếng Việt:');
    if (!meaning) return;
    try {
      await fetchApi('/vocab', { method: 'POST', body: JSON.stringify({ word, meaning }) });
    } catch {
      const pending = JSON.parse(localStorage.getItem('toeic-pending-vocab') || '[]');
      localStorage.setItem('toeic-pending-vocab', JSON.stringify([...pending, { word, meaning }]));
    }
    setSavedQuestionIds((current) => [...current, question.id]);
  };

  const getSelectedOption = useCallback((questionId: string) => {
    return answers.find(a => a.questionId === questionId)?.selectedOption;
  }, [answers]);
  // Tiện ích
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const scrollToQuestion = (qId: string) => {
    const el = document.getElementById(`question-${qId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const parseOptions = (optionsInput: unknown): string[] => {
    const normalize = (value: unknown): string => {
      if (typeof value === 'string') return value;
      if (value && typeof value === 'object') {
        const obj = value as Record<string, unknown>;
        const id = typeof obj.id === 'string' ? obj.id : '';
        const text = typeof obj.text === 'string' ? obj.text : (typeof obj.label === 'string' ? obj.label : '');
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
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary-600 mb-4" />
        <p className="text-lg font-medium text-slate-600">Đang khởi tạo phòng thi...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* --- HEADER --- */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                if(window.confirm('Bạn có chắc muốn thoát? Bài làm đã được tự động lưu và có thể tiếp tục trong thời gian thi còn lại.')) {
                  navigate('/tests');
                }
              }}
              className="text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="font-bold text-lg text-slate-900 hidden sm:block">
              {testInfo?.title || 'TOEIC Mock Test'}
            </h1>
          </div>
          
          <div className="flex items-center gap-6">
            <div title="Giờ thi do server quản lý — chỉnh đồng hồ máy không kéo dài được giờ làm bài" className={`flex items-center gap-2 font-mono text-xl font-bold px-4 py-1.5 rounded-lg ${timeLeft < 300 ? 'bg-danger-50 text-danger-600' : 'bg-slate-100 text-slate-700'}`}>
              <Clock className="w-5 h-5" />
              {formatTime(timeLeft)}
            </div>
            
            <button 
              onClick={() => setShowSubmitModal(true)}
              disabled={submitting}
              className="btn-primary px-6 py-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? 'Đang nộp...' : 'Nộp bài'}
            </button>
          </div>
        </div>
      </header>

      {/* --- MAIN LAYOUT --- */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row gap-8">
        
        {/* CỘT TRÁI: NỘI DUNG THI (70%) */}
        <div className="flex-1 w-full lg:w-[70%] space-y-8 pb-32 lg:pb-0">
          {questions.map((q, index) => {
            // Xác định xem câu hỏi này có cần hiển thị Audio hoặc Passage mới không
            const prevQ = questions[index - 1];
            const isNewGroup = !prevQ || prevQ.groupId !== q.groupId;
            const hasMedia = isNewGroup && q.group && (q.group.audioUrl || q.group.passageText || q.group.imageUrl);
            const parsedOptions = parseOptions(q.options);

            return (
              <div key={q.id} className="space-y-6">
                
                {/* Khu vực Nhóm Câu hỏi (Audio / Đoạn văn) */}
                {hasMedia && (
                  <div className="card sticky top-20 z-30">
                    <h4 className="text-sm font-bold text-primary-600 mb-4 flex items-center gap-2 uppercase tracking-wider">
                      <FileText className="w-4 h-4" /> Part {q.partNumber} Context
                    </h4>
                    
                    {q.group?.audioUrl && (
                      <div className="mb-4">
                        <audio controls controlsList="nodownload" className="w-full h-12 outline-none">
                          <source src={q.group.audioUrl} type="audio/mpeg" />
                          Trình duyệt của bạn không hỗ trợ thẻ audio.
                        </audio>
                      </div>
                    )}

                    {q.group?.imageUrl && (
                      <div className="mb-4 flex justify-center">
                        <img src={q.group.imageUrl} alt="Context" className="max-w-full h-auto rounded-lg border border-slate-200" />
                      </div>
                    )}

                    {q.group?.passageText && (
                      <div className="max-w-none text-slate-700 whitespace-pre-wrap font-reading text-lg leading-relaxed bg-slate-50 p-6 rounded-inner border border-slate-100">
                        {q.group.passageText}
                      </div>
                    )}
                  </div>
                )}

                {/* Câu hỏi trắc nghiệm */}
                <div id={`question-${q.id}`} className="card sm:p-8 scroll-mt-24">
                  <div className="flex gap-4">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-lg text-slate-900 font-medium mb-6">
                        {q.questionText}
                      </p>
                      <button type="button" onClick={() => saveQuestionAsVocabulary(q)} disabled={savedQuestionIds.includes(q.id)} className="mb-4 text-xs text-primary-600 disabled:text-success-600">
                        {savedQuestionIds.includes(q.id) ? 'Đã lưu vào từ vựng' : 'Lưu từ/cụm từ'}
                      </button>
                      <div className="space-y-3">
                        {parsedOptions.map((optionText, optIdx) => {
                          const letterMatch = optionText.match(/^\s*\(?([A-D])[\.\):\-]/) || optionText.match(/^\s*([A-D])/);
                          const letter = letterMatch ? letterMatch[1] : String.fromCharCode(65 + optIdx);
                          const isSelected = getSelectedOption(q.id) === letter;
                          return (
                            <label 
                              key={optIdx} 
                              className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                isSelected 
                                  ? 'border-primary-600 bg-primary-50/50' 
                                  : 'border-slate-100 hover:border-primary-200 hover:bg-slate-50'
                              }`}
                            >
                              <input 
                                type="radio" 
                                name={`question-${q.id}`} 
                                className="hidden"
                                checked={isSelected}
                                onChange={() => handleSelectAnswer(q.id, letter)}
                              />
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 shrink-0 transition-colors ${
                                isSelected ? 'border-primary-600' : 'border-slate-300'
                              }`}>
                                {isSelected && <div className="w-3 h-3 rounded-full bg-primary-600" />}
                              </div>
                              <span className={`text-base ${isSelected ? 'text-primary-900 font-medium' : 'text-slate-700'}`}>
                                {optionText}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CỘT PHẢI: BUBBLE SHEET (30% - STICKY) */}
        <div className="w-full lg:w-[30%] hidden lg:block">
          <div className="card sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center justify-between sticky top-0 bg-white pb-2 z-10 border-b border-slate-100">
              Bảng trả lời
              <span className="text-sm font-medium text-primary-600 bg-primary-50 px-3 py-1 rounded-full">
                {answers.length} / {questions.length}
              </span>
            </h3>
            
            <div className="grid grid-cols-5 gap-3">
              {questions.map((q, index) => {
                const hasAnswer = !!getSelectedOption(q.id);
                return (
                  <button
                    key={q.id}
                    onClick={() => scrollToQuestion(q.id)}
                    title={hasAnswer ? `Đã chọn: ${getSelectedOption(q.id)}` : 'Chưa làm'}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all border ${
                      hasAnswer 
                        ? 'bg-primary-600 border-primary-600 text-white shadow-sm shadow-primary-200' 
                        : 'bg-white border-slate-200 text-slate-500 hover:border-primary-400 hover:text-primary-600'
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Mobile Toolbar */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 z-40 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)]">
           <div className="flex items-center justify-between max-w-md mx-auto">
             <div className="text-sm font-medium text-slate-600">
               Đã làm: <span className="text-primary-600 font-bold">{answers.length}/{questions.length}</span>
             </div>
             <button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="text-primary-600 font-medium text-sm flex items-center gap-1"
             >
                Trở lên đầu
             </button>
           </div>
        </div>
      </main>

      {/* --- MODAL XÁC NHẬN NỘP BÀI --- */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="card w-full max-w-sm shadow-xl">
            <div className="w-12 h-12 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Xác nhận nộp bài</h3>
            <p className="text-slate-500 mb-6">
              Bạn đã hoàn thành <b>{answers.length}/{questions.length}</b> câu hỏi. Bạn có chắc chắn muốn nộp bài ngay bây giờ?
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowSubmitModal(false)}
                disabled={submitting}
                className="btn-secondary flex-1"
              >
                Tiếp tục làm
              </button>
              <button 
                onClick={() => handleSubmit(false)}
                disabled={submitting}
                className="btn-primary flex-1"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                Nộp bài
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL ANTI-CHEAT --- */}
      {showCheatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-danger-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-card w-full max-w-md shadow-2xl overflow-hidden border border-danger-100">
            <div className="bg-danger-50 p-6 text-center border-b border-danger-100 relative">
               <button 
                 onClick={() => setShowCheatModal(false)}
                 className="absolute top-4 right-4 text-danger-400 hover:text-danger-600 transition-colors"
               >
                 <X className="w-5 h-5" />
               </button>
               <div className="w-16 h-16 rounded-full bg-danger-100 text-danger-600 flex items-center justify-center mx-auto mb-4">
                 <AlertTriangle className="w-8 h-8" />
               </div>
               <h3 className="text-xl font-bold text-danger-900 mb-1">Cảnh báo vi phạm!</h3>
            </div>
            <div className="p-6">
              <p className="text-slate-600 text-center mb-6">
                Hệ thống phát hiện bạn vừa <b>rời khỏi màn hình làm bài</b>. 
                <br/><br/>
                Số lần vi phạm: <span className="font-bold text-danger-600 text-lg">{cheatCount}</span>
                <br/><br/>
                <span className="text-sm">Hành vi này đã được tự động lưu lại. Từ 5 lần vi phạm, hệ thống sẽ tự động nộp bài. Vui lòng tập trung làm bài!</span>
              </p>
              <button 
                onClick={() => setShowCheatModal(false)}
                className="btn-danger w-full py-3"
              >
                Tôi đã hiểu, quay lại làm bài
              </button>
            </div>
          </div>
        </div>
)}
    </div>
  );
}

