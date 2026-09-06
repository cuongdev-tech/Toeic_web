import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchApi } from '../lib/api';
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
  const timeLeftRef = useRef<number>(0);
  const cheatCountRef = useRef<number>(0);

  // Đồng bộ Ref với State
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);
  useEffect(() => { cheatCountRef.current = cheatCount; }, [cheatCount]);

  const draftKey = `toeic-draft-${testId}`;

  // --- 1. KHỞI TẠO PHÒNG THI (MOUNT) ---
  useEffect(() => {
    const initRoom = async () => {
      try {
        // 1. Lấy thông tin đề thi
        const testRes = await fetchApi(`/tests/${testId}`);
        if (!testRes.success) throw new Error(testRes.message);
        
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
        if (!startRes.success) throw new Error(startRes.message);
        const attempt = startRes.data;
        const initialTime = attempt.timeRemaining ?? data.duration * 60;
        let restoredAnswers = (attempt.answers || []).filter((answer: AnswerState) => answer.selectedOption);
        try {
          const draft = JSON.parse(localStorage.getItem(draftKey) || '{}');
          if (Array.isArray(draft.answers) && draft.answers.length > restoredAnswers.length) restoredAnswers = draft.answers;
          if (Array.isArray(draft.savedQuestionIds)) setSavedQuestionIds(draft.savedQuestionIds);
        } catch { /* Ignore a corrupted offline draft and use server state. */ }
        setTimeLeft(initialTime);
        timeLeftRef.current = initialTime;
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

  // --- 3. ĐỒNG HỒ ĐẾM NGƯỢC ---
  useEffect(() => {
    if (loading || !attemptId || submitting) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit(true); // Hết giờ -> Tự động nộp
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, attemptId, submitting]);

  useEffect(() => {
    if (!testId || !attemptId || submitting) return;
    localStorage.setItem(draftKey, JSON.stringify({ answers, timeLeft, cheatCount, savedQuestionIds, updatedAt: Date.now() }));
  }, [answers, timeLeft, cheatCount, savedQuestionIds, testId, attemptId, submitting]);

  useEffect(() => {
    if (!attemptId || submitting) return;

    const saveBeforeExit = () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      void fetch(`http://localhost:5000/api/v1/tests/attempts/${attemptId}/sync`, {
        method: 'PATCH',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          timeRemaining: timeLeftRef.current,
          cheatWarningCount: cheatCountRef.current,
          answers: answersRef.current,
        }),
      });
    };

    window.addEventListener('beforeunload', saveBeforeExit);
    return () => window.removeEventListener('beforeunload', saveBeforeExit);
  }, [attemptId, submitting]);

  // --- 4. AUTO-SAVE NGẦM (BACKGROUND SYNC) MỖI 30S ---
  useEffect(() => {
    if (loading || !attemptId || submitting) return;

    const syncInterval = setInterval(() => {
      fetchApi(`/tests/attempts/${attemptId}/sync`, {
        method: 'PATCH',
        body: JSON.stringify({
          timeRemaining: timeLeftRef.current,
          cheatWarningCount: cheatCountRef.current,
          answers: answersRef.current
        })
      }).catch(err => console.error('Lỗi Auto-save ngầm:', err)); // Silent fail
    }, 30000); // 30 giây

    return () => clearInterval(syncInterval);
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

  const handleSubmit = async (autoSubmit = false) => {
    if (!attemptId) return;
    setShowSubmitModal(false);
    setSubmitting(true);

    try {
      await fetchApi(`/tests/attempts/${attemptId}/sync`, {
        method: 'PATCH',
        body: JSON.stringify({
          timeRemaining: Math.max(1, timeLeftRef.current),
          cheatWarningCount: cheatCountRef.current,
          answers: answersRef.current,
        }),
      });
      const res = await fetchApi(`/tests/attempts/${attemptId}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          answers: answersRef.current,
          cheatCount: cheatCountRef.current
        })
      });

if (res.success) {
        setShowSubmitModal(false);
        navigate(`/tests/review/${attemptId}`);
        localStorage.removeItem(draftKey);
      } else {
        throw new Error(res.message);
      } // Dòng 191 (Đảm bảo sau chữ này không còn dấu nháy ` nào)
    } catch (err: any) { 
      alert(err.message || 'Lỗi trong quá trình nộp bài.');
      setSubmitting(false); 
    }
};
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

  const parseOptions = (optionsStr: string | string[]): string[] => {
    if (Array.isArray(optionsStr)) return optionsStr;
    try {
      return JSON.parse(optionsStr);
    } catch {
      return [];
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
        <p className="text-lg font-medium text-slate-600">Đang khởi tạo phòng thi...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* --- HEADER --- */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                if(window.confirm('Bạn có chắc muốn thoát? Kết quả làm bài sẽ không được lưu!')) {
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
            <div className={`flex items-center gap-2 font-mono text-xl font-bold px-4 py-1.5 rounded-lg ${timeLeft < 300 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-700'}`}>
              <Clock className="w-5 h-5" />
              {formatTime(timeLeft)}
            </div>
            
            <button 
              onClick={() => setShowSubmitModal(true)}
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
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
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm sticky top-20 z-30">
                    <h4 className="text-sm font-bold text-indigo-600 mb-4 flex items-center gap-2 uppercase tracking-wider">
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
                      <div className="prose prose-slate max-w-none text-slate-700 whitespace-pre-wrap font-serif text-lg leading-relaxed bg-slate-50 p-6 rounded-xl border border-slate-100">
                        {q.group.passageText}
                      </div>
                    )}
                  </div>
                )}

                {/* Câu hỏi trắc nghiệm */}
                <div id={`question-${q.id}`} className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm scroll-mt-24">
                  <div className="flex gap-4">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-lg text-slate-900 font-medium mb-6">
                        {q.questionText}
                      </p>
                      <button type="button" onClick={() => saveQuestionAsVocabulary(q)} disabled={savedQuestionIds.includes(q.id)} className="mb-4 text-xs text-indigo-600 disabled:text-emerald-600">
                        {savedQuestionIds.includes(q.id) ? 'Đã lưu vào từ vựng' : 'Lưu từ/cụm từ'}
                      </button>
                      <div className="space-y-3">
                        {parsedOptions.map((optionText, optIdx) => {
                          const letter = optionText.charAt(0); // A, B, C, D
                          const isSelected = getSelectedOption(q.id) === letter;
                          return (
                            <label 
                              key={optIdx} 
                              className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                isSelected 
                                  ? 'border-indigo-600 bg-indigo-50/50' 
                                  : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50'
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
                                isSelected ? 'border-indigo-600' : 'border-slate-300'
                              }`}>
                                {isSelected && <div className="w-3 h-3 rounded-full bg-indigo-600" />}
                              </div>
                              <span className={`text-base ${isSelected ? 'text-indigo-900 font-medium' : 'text-slate-700'}`}>
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
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center justify-between sticky top-0 bg-white pb-2 z-10 border-b border-slate-100">
              Bảng trả lời
              <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
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
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-200' 
                        : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-400 hover:text-indigo-600'
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
               Đã làm: <span className="text-indigo-600 font-bold">{answers.length}/{questions.length}</span>
             </div>
             <button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="text-indigo-600 font-medium text-sm flex items-center gap-1"
             >
                Trở lên đầu
             </button>
           </div>
        </div>
      </main>

      {/* --- MODAL XÁC NHẬN NỘP BÀI --- */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
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
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 rounded-xl transition-colors disabled:opacity-50"
              >
                Tiếp tục làm
              </button>
              <button 
                onClick={() => handleSubmit(false)}
                disabled={submitting}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-xl transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-red-100">
            <div className="bg-red-50 p-6 text-center border-b border-red-100 relative">
               <button 
                 onClick={() => setShowCheatModal(false)}
                 className="absolute top-4 right-4 text-red-400 hover:text-red-600 transition-colors"
               >
                 <X className="w-5 h-5" />
               </button>
               <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                 <AlertTriangle className="w-8 h-8" />
               </div>
               <h3 className="text-xl font-bold text-red-900 mb-1">Cảnh báo vi phạm!</h3>
            </div>
            <div className="p-6">
              <p className="text-slate-600 text-center mb-6">
                Hệ thống phát hiện bạn vừa <b>rời khỏi màn hình làm bài</b>. 
                <br/><br/>
                Số lần vi phạm: <span className="font-bold text-red-600 text-lg">{cheatCount}</span>
                <br/><br/>
                <span className="text-sm">Hành vi này đã được tự động lưu lại. Vui lòng tập trung làm bài!</span>
              </p>
              <button 
                onClick={() => setShowCheatModal(false)}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 rounded-xl transition-colors"
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

