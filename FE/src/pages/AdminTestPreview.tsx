import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Eye } from 'lucide-react';
import { fetchApi } from '../lib/api';
import { AccuracyBadge } from '../components/DistBar';

export default function AdminTestPreview() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [accuracyByQuestion, setAccuracyByQuestion] = useState<Record<string, { accuracy: number | null; answered: number }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchApi(`/admin/tests/${testId}/details`),
      fetchApi(`/admin/tests/${testId}/question-stats`).catch(() => null),
    ])
      .then(([details, stats]) => {
        setData(details.data);
        const map: Record<string, { accuracy: number | null; answered: number }> = {};
        for (const s of stats?.data?.stats || []) {
          map[s.questionId] = { accuracy: s.accuracy, answered: s.answered };
        }
        setAccuracyByQuestion(map);
      })
      .finally(() => setLoading(false));
  }, [testId]);
  if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-primary-600" /></div>;
  if (!data) return <p className="p-10 text-center">Không tải được đề thi.</p>;

  return <div className="page page-lg space-y-6"><div className="flex items-center justify-between"><button onClick={() => navigate(`/admin/tests/${testId}/edit`)} className="flex items-center gap-2 text-sm text-slate-600"><ArrowLeft className="w-4 h-4" /> Quay lại chỉnh sửa</button><span className={`badge ${data.test.status === 'PUBLISHED' ? 'bg-success-50 text-success-700' : 'bg-warning-50 text-warning-700'}`}>{data.test.status}</span></div><div><h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2"><Eye className="text-primary-600" /> {data.test.title}</h1><p className="text-slate-500 mt-2">{data.test.description}</p><p className="text-sm text-slate-500 mt-1">Thời gian: {data.test.duration} phút</p></div><div className="space-y-6">{data.groups.map((group: any, groupIndex: number) => <section key={group.id} className="card space-y-4"><h2 className="font-bold text-primary-700">Nhóm {groupIndex + 1} - Part {group.partNumber}</h2>{group.audioUrl && <audio controls src={group.audioUrl} className="w-full" />}{group.imageUrl && <img src={group.imageUrl} alt="Question group" className="max-h-64 rounded-lg" />}{group.passageText && <p className="whitespace-pre-wrap bg-slate-50 rounded-inner p-4 text-slate-700">{group.passageText}</p>}{group.questions.map((question: any, index: number) => <div key={question.id} className="border-t border-slate-100 pt-4"><div className="flex items-start justify-between gap-3"><p className="font-medium text-slate-900">{index + 1}. {question.questionText}</p><AccuracyBadge accuracy={accuracyByQuestion[question.id]?.accuracy ?? null} answered={accuracyByQuestion[question.id]?.answered ?? 0} /></div><div className="grid sm:grid-cols-2 gap-2 mt-3">{(Array.isArray(question.options) ? question.options : []).map((option: any, optionIndex: number) => <div key={optionIndex} className={`rounded-inner border p-3 text-sm ${String(option).startsWith(question.correctAnswer) ? 'border-success-300 bg-success-50' : 'border-slate-200'}`}>{String(option)}</div>)}</div><p className="text-xs text-slate-500 mt-2">Đáp án: {question.correctAnswer}{question.explanation ? ` - ${question.explanation}` : ''}</p></div>)}</section>)}</div></div>;
}
