import React, { useState, useEffect } from 'react';
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
  HelpCircle
} from 'lucide-react';

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
}

interface ReviewData {
  listeningScore: number;
  readingScore: number;
  totalScore: number;
  cheatCount: number;
  details: ReviewDetail[];
}

export default function TestReview() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  
  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedExplanations, setExpandedExplanations] = useState<Set<string>>(new Set());

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
        <p className="text-lg font-medium text-slate-600">Đang tải kết quả bài làm...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
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
        <section className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex flex-col items-center justify-center p-4 bg-indigo-50 rounded-xl border border-indigo-100">
              <span className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-1">Tổng điểm</span>
              <span className="text-4xl font-extrabold text-indigo-900">{data.totalScore}<span className="text-lg text-indigo-400 font-medium">/990</span></span>
            </div>
            <div className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-xl border border-blue-100">
              <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-1">Listening</span>
              <span className="text-3xl font-bold text-blue-900">{data.listeningScore}<span className="text-base text-blue-400 font-medium">/495</span></span>
            </div>
            <div className="flex flex-col items-center justify-center p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <span className="text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-1">Reading</span>
              <span className="text-3xl font-bold text-emerald-900">{data.readingScore}<span className="text-base text-emerald-400 font-medium">/495</span></span>
            </div>
            <div className={`flex flex-col items-center justify-center p-4 rounded-xl border ${data.cheatCount > 0 ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
              <div className="flex items-center gap-1 mb-1">
                {data.cheatCount > 0 && <AlertTriangle className="w-4 h-4 text-red-600" />}
                <span className={`text-sm font-semibold uppercase tracking-wider ${data.cheatCount > 0 ? 'text-red-600' : 'text-slate-500'}`}>
                  Vi phạm
                </span>
              </div>
              <span className={`text-3xl font-bold ${data.cheatCount > 0 ? 'text-red-700' : 'text-slate-700'}`}>
                {data.cheatCount} <span className="text-base font-medium opacity-50">lần</span>
              </span>
            </div>
          </div>
        </section>

        {/* QUESTIONS LIST */}
        <section className="space-y-12">
          {data.details.map((q, index) => {
            const parsedOptions = parseOptions(q.options);
            const prevQ = data.details[index - 1];
            
            // Check if context (media/passage) should be shown
            const isNewGroup = !prevQ || 
              (q.audioUrl !== prevQ.audioUrl) || 
              (q.passageText !== prevQ.passageText) || 
              (q.imageUrl !== prevQ.imageUrl);
              
            const hasMedia = isNewGroup && (q.audioUrl || q.passageText || q.imageUrl);

            const isExpanded = expandedExplanations.has(q.questionId);

            return (
              <div key={q.questionId} className="space-y-6">
                
                {/* Context Block */}
                {hasMedia && (
                  <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm">
                    <h4 className="text-sm font-bold text-indigo-600 mb-6 flex items-center gap-2 uppercase tracking-wider">
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
                      <div className="prose prose-slate max-w-none text-slate-800 whitespace-pre-wrap font-serif text-lg leading-relaxed bg-slate-50 p-6 md:p-8 rounded-xl border border-slate-100">
                        {q.passageText}
                      </div>
                    )}
                  </div>
                )}

                {/* Question Block */}
                <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
                  
                  {/* Status Badge */}
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${q.isCorrect ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  
                  <div className="flex gap-4 mb-6">
                    <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                      q.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
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
                             <span className="flex items-center text-green-600 bg-green-50 px-2.5 py-1 rounded-md">
                               <CheckCircle2 className="w-4 h-4 mr-1.5" /> Đúng
                             </span>
                           ) : (
                             <span className="flex items-center text-red-600 bg-red-50 px-2.5 py-1 rounded-md">
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
                      const letter = optionText.charAt(0);
                      const isCorrectAnswer = letter === q.correctAnswer;
                      const isSelectedAnswer = letter === q.selectedOption;
                      
                      let optionClass = "border-slate-100 bg-white text-slate-700";
                      let icon = null;
                      
                      if (isCorrectAnswer) {
                        // The right answer is always highlighted green
                        optionClass = "border-green-300 bg-green-50 text-green-800 font-medium";
                        icon = <CheckCircle2 className="w-5 h-5 text-green-600 absolute right-4" />;
                      } else if (isSelectedAnswer && !isCorrectAnswer) {
                        // If user selected it and it's wrong, red
                        optionClass = "border-red-300 bg-red-50 text-red-800 font-medium";
                        icon = <XCircle className="w-5 h-5 text-red-500 absolute right-4" />;
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
                            isCorrectAnswer ? 'border-green-500 text-green-700 bg-green-100' : 
                            (isSelectedAnswer && !isCorrectAnswer) ? 'border-red-500 text-red-700 bg-red-100' : 
                            'border-slate-300 text-slate-400'
                          }`}>
                            {letter}
                          </div>
                          <span className="text-base pr-10">
                            {optionText.substring(3)} {/* Remove "A. " from display as we have the letter circle */}
                          </span>
                          {icon}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation Toggle */}
                  <div className="mt-8 pl-14">
                    <button
                      onClick={() => toggleExplanation(q.questionId)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                        isExpanded ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <MessageCircle className="w-4 h-4" />
                      {isExpanded ? 'Ẩn giải thích' : 'Xem giải thích chi tiết'}
                    </button>
                    
                    {isExpanded && (
                      <div className="mt-4 p-5 bg-indigo-50/50 rounded-xl border border-indigo-100 animate-in fade-in slide-in-from-top-2 duration-200">
                        <h5 className="flex items-center gap-2 text-sm font-bold text-indigo-800 mb-2">
                          <HelpCircle className="w-4 h-4" /> Giải thích:
                        </h5>
                        <p className="text-slate-700 leading-relaxed text-sm">
                          {q.explanation || 'Chưa có lời giải thích chi tiết cho câu hỏi này.'}
                        </p>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}
