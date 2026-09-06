import React, { useState, useEffect, useRef } from 'react';
import { fetchApi } from '../lib/api';
import { Play, Pause, FileText, Volume2, Sparkles } from 'lucide-react';

interface TranscriptViewerProps {
  groupId: string;
}

export default function TranscriptViewer({ groupId }: TranscriptViewerProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [unclearLines, setUnclearLines] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem(`transcript-unclear-${groupId}`) || '[]'); } catch { return []; }
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const loadTranscript = async () => {
      try {
        const res = await fetchApi(`/question-groups/${groupId}/transcript`);
        if (res.success || res.status === 'success') {
          setData(res.data);
          const savedUnclear = JSON.parse(localStorage.getItem(`transcript-unclear-${groupId}`) || '[]');
          setUnclearLines(savedUnclear);
          const history = JSON.parse(localStorage.getItem('transcript-history') || '[]');
          localStorage.setItem('transcript-history', JSON.stringify([...new Set([...history, groupId])]));
        }
      } catch (err) {
        console.error('Lỗi tải transcript:', err);
      } finally {
        setLoading(false);
      }
    };
    if (groupId) loadTranscript();
  }, [groupId]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const seekToLine = (item: any, index: number) => {
    if (!audioRef.current || typeof item.startTime !== 'number') return;
    audioRef.current.currentTime = item.startTime;
    setActiveIndex(index);
    void audioRef.current.play();
    setIsPlaying(true);
  };

  const toggleUnclear = (index: number) => {
    const next = unclearLines.includes(index) ? unclearLines.filter((line) => line !== index) : [...unclearLines, index];
    setUnclearLines(next);
    localStorage.setItem(`transcript-unclear-${groupId}`, JSON.stringify(next));
  };

  if (loading) return <div className="p-6 text-center text-slate-500">Đang tải nội dung âm thanh và transcript...</div>;
  if (!data) return <div className="p-6 text-center text-slate-400">Không tìm thấy dữ liệu nhóm câu hỏi.</div>;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600" /> Nội dung đoạn hội thoại / Đoạn văn
        </h3>
        {data.audioUrl && (
          <div className="flex items-center gap-3 bg-indigo-50 px-4 py-2 rounded-xl">
            <audio 
              ref={audioRef} 
              src={data.audioUrl} 
              onEnded={() => setIsPlaying(false)}
              onTimeUpdate={(event) => {
                const currentTime = event.currentTarget.currentTime;
                const index = data.transcript.findIndex((item: any) =>
                  typeof item.startTime === 'number' && currentTime >= item.startTime &&
                  (typeof item.endTime !== 'number' || currentTime <= item.endTime)
                );
                if (index >= 0) setActiveIndex(index);
              }}
            />
            <button 
              onClick={togglePlay}
              className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 transition-colors shadow-sm"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <span className="text-sm font-medium text-indigo-900 flex items-center gap-1">
              <Volume2 className="w-4 h-4" /> Audio bài nghe
            </span>
          </div>
        )}
      </div>

      {/* Hiển thị đoạn vănpassageText (nếu có) */}
      {data.passageText && (
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-slate-700 leading-relaxed whitespace-pre-line text-sm">
          {data.passageText}
        </div>
      )}

      {/* Hiển thị danh sách Transcript chi tiết */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Transcript chi tiết</h4>
        {(!data.transcript || data.transcript.length === 0) ? (
          <p className="text-sm text-slate-400 italic">Chưa có transcript chi tiết cho đoạn này.</p>
        ) : (
          <div className="space-y-2.5">
            {data.transcript.map((item: any, index: number) => (
              <button type="button" key={index} onClick={() => seekToLine(item, index)} className={`w-full text-left p-3.5 rounded-xl border transition-all flex gap-3 ${activeIndex === index ? 'border-indigo-300 bg-indigo-50' : 'border-slate-100 hover:border-indigo-100 bg-white'}`}>
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg h-fit">
                  {item.speaker || `Speaker ${index + 1}`}
                </span>
                <div className="flex-1 space-y-1">
                  <p className="text-sm text-slate-800 font-medium">{item.text || item.en}</p>
                  {item.vi && <p className="text-xs text-slate-500">{item.vi}</p>}
                </div>
                <span role="button" tabIndex={0} onClick={(event) => { event.stopPropagation(); toggleUnclear(index); }} className={`text-xs whitespace-nowrap ${unclearLines.includes(index) ? 'text-rose-600 font-semibold' : 'text-slate-400'}`}>{unclearLines.includes(index) ? 'Chưa hiểu' : 'Đánh dấu'}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}