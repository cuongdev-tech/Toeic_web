import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  BookX,
  Check,
  Compass,
  Copy,
  Flame,
  Layers,
  PenLine,
  Timer,
  TrendingUp,
  UserPlus,
} from 'lucide-react';

const FEATURES = [
  {
    icon: <Timer className="w-6 h-6" />,
    title: 'Thi thử tính giờ thật',
    desc: 'Đồng hồ do server quản lý, tự nộp khi hết giờ, chống gian lận chuyển tab.',
    tint: { background: 'var(--color-primary-50)', color: 'var(--color-primary-600)' },
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: 'Chấm điểm + phân tích yếu',
    desc: 'Điểm Listening/Reading chuẩn 990, accuracy chi tiết tới từng Part.',
    tint: { background: 'var(--color-info-50)', color: 'var(--color-info-600)' },
  },
  {
    icon: <BookX className="w-6 h-6" />,
    title: 'Sổ tay câu sai',
    desc: 'Mọi câu từng sai gom một chỗ, làm đúng ở bài sau tự đánh dấu đã vững.',
    tint: { background: 'var(--color-danger-50)', color: 'var(--color-danger-600)' },
  },
  {
    icon: <Layers className="w-6 h-6" />,
    title: 'Flashcard từ vựng',
    desc: 'Thẻ lật 3D, nhắc ôn giãn cách, kho từ theo chủ đề TOEIC.',
    tint: { background: 'var(--color-success-50)', color: 'var(--color-success-600)' },
  },
  {
    icon: <Flame className="w-6 h-6" />,
    title: 'Streak, BXH & huy hiệu',
    desc: 'Chuỗi ngày học, bảng xếp hạng, 12 huy hiệu giữ lửa mỗi ngày.',
    tint: { background: 'var(--color-warning-50)', color: 'var(--color-warning-600)' },
  },
  {
    icon: <Compass className="w-6 h-6" />,
    title: 'Lộ trình ôn mỗi ngày',
    desc: 'Dashboard chỉ thẳng 3 Part yếu nhất + đề phù hợp để luyện ngay.',
    tint: { background: 'var(--color-primary-50)', color: 'var(--color-primary-700)' },
  },
];

const SAMPLE_TESTS = [
  {
    title: 'TOEIC Sprint 30 — Luyện đề ngắn',
    desc: 'Đề ngắn phủ Part 2/3/5/6/7. Luyện hằng ngày giữ streak.',
    meta: '30 phút • 19 câu',
  },
  {
    title: 'TOEIC Listening Focus 45',
    desc: 'Part 2/3/4, mỗi đoạn hội thoại kèm transcript đối chiếu.',
    meta: '45 phút • 13 câu',
  },
  {
    title: 'TOEIC Reading Focus 60',
    desc: 'Part 5/6/7 với giải thích ngữ pháp chi tiết từng câu.',
    meta: '60 phút • 18 câu',
  },
];

const DEMO_ACCOUNTS = [
  { label: 'Học viên', email: 'an@toeic.local', password: 'Student123!' },
  { label: 'Quản trị', email: 'admin@toeic.local', password: 'Admin123!' },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Sao chép ${text}`}
      className="p-1.5 rounded-md text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-success-600" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function Landing() {
  return (
    <div className="w-full">
      {/* HERO */}
      <section className="relative overflow-hidden bg-admin-950 text-white">
        <div className="absolute -left-24 -top-32 h-80 w-80 rounded-full border-[36px] border-primary-400/20" />
        <div className="absolute -right-20 -bottom-28 h-72 w-72 rounded-full border-[28px] border-warning-500/20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <span className="badge bg-white/10 text-warning-300 border border-white/15">
            Luyện TOEIC thông minh • Miễn phí
          </span>
          <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
            Chinh phục TOEIC<br className="hidden sm:block" /> theo cách của bạn
          </h1>
          <p className="mt-5 max-w-2xl mx-auto text-base sm:text-lg leading-8 text-slate-300">
            Thi thử tính giờ chuẩn 990 điểm, phân tích điểm yếu tới từng Part,
            sổ câu sai và lộ trình ôn mỗi ngày — tất cả trong một nơi.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 rounded-inner bg-white px-8 py-3.5 font-bold text-admin-950 hover:bg-primary-50 transition-colors"
            >
              Bắt đầu miễn phí <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 rounded-inner border border-white/25 px-8 py-3.5 font-semibold text-white hover:bg-white/10 transition-colors"
            >
              Tôi đã có tài khoản
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-slate-300">
            {[['3', 'đề thi thực chiến'], ['50+', 'câu hỏi có giải thích'], ['7', 'Parts TOEIC'], ['990', 'thang điểm chuẩn']].map(([num, label]) => (
              <div key={label} className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-white">{num}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TÍNH NĂNG */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <p className="section-label text-center">Vì sao học ở TOEIC Master?</p>
        <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 text-center">Mọi thứ bạn cần để tăng điểm</h2>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6 transition-all hover:-translate-y-1 hover:shadow-card-hover">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4" style={f.tint}>
                {f.icon}
              </span>
              <h3 className="font-bold text-slate-900 text-lg">{f.title}</h3>
              <p className="text-sm text-slate-500 mt-1.5 leading-6">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3 BƯỚC */}
      <section style={{ background: 'var(--color-primary-50)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 text-center">Bắt đầu trong 3 bước</h2>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: <UserPlus className="w-6 h-6" />, title: 'Đăng ký 30 giây', desc: 'Chỉ cần email và họ tên, không cần thẻ.' },
              { icon: <PenLine className="w-6 h-6" />, title: 'Làm 1 đề Sprint', desc: '30 phút là đủ để hệ thống hiểu trình độ bạn.' },
              { icon: <TrendingUp className="w-6 h-6" />, title: 'Ôn theo lộ trình', desc: 'Dashboard chỉ 3 Part yếu nhất để luyện mỗi ngày.' },
            ].map((s, i) => (
              <div key={s.title} className="bg-white rounded-card border border-primary-100 p-6 text-center">
                <span className="badge mx-auto" style={{ background: 'var(--color-primary-600)', color: '#fff' }}>Bước {i + 1}</span>
                <span className="mx-auto mt-4 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-50 text-primary-600">{s.icon}</span>
                <h3 className="font-bold text-slate-900 mt-3">{s.title}</h3>
                <p className="text-sm text-slate-500 mt-1">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ĐỀ MẪU */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <p className="section-label text-center">Kho đề thực chiến</p>
        <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 text-center">Làm thử các đề này sau khi đăng ký</h2>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
          {SAMPLE_TESTS.map((t) => (
            <div key={t.title} className="card p-6 flex flex-col">
              <span className="badge border border-warning-200 bg-warning-50 text-warning-700 w-fit">Mock Test</span>
              <h3 className="font-bold text-slate-900 text-lg mt-3">{t.title}</h3>
              <p className="text-sm text-slate-500 mt-1.5 flex-1">{t.desc}</p>
              <p className="text-xs font-semibold text-slate-400 mt-3">{t.meta}</p>
              <Link to="/register" className="btn-primary w-full mt-4">
                Đăng ký để làm bài <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* DÙNG THỬ NHANH */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">
        <div className="card md:p-8" style={{ background: 'var(--color-background)' }}>
          <h2 className="font-bold text-slate-900 text-lg">Muốn xem nhanh bên trong?</h2>
          <p className="text-sm text-slate-500 mt-1">Đăng nhập bằng tài khoản demo, không cần đăng ký:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {DEMO_ACCOUNTS.map((a) => (
              <div key={a.email} className="bg-white rounded-inner border border-slate-200 p-4 text-sm">
                <p className="font-bold text-slate-900">{a.label}</p>
                <p className="flex items-center gap-1.5 text-slate-600 mt-1.5 font-mono text-[13px]">
                  {a.email} <CopyButton text={a.email} />
                </p>
                <p className="flex items-center gap-1.5 text-slate-600 font-mono text-[13px]">
                  {a.password} <CopyButton text={a.password} />
                </p>
              </div>
            ))}
          </div>
          <Link to="/login" className="btn-secondary mt-4">
            Tới trang đăng nhập <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* CTA CUỐI */}
      <section className="bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center text-white">
          <h2 className="text-2xl sm:text-3xl font-bold">Hôm nay là ngày tốt để bắt đầu chuỗi streak đầu tiên</h2>
          <p className="mt-2 text-primary-100">Miễn phí • Không cần thẻ • 30 giây đăng ký</p>
          <Link
            to="/register"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-inner bg-white px-10 py-3.5 font-bold text-primary-700 hover:bg-primary-50 transition-colors"
          >
            Tạo tài khoản ngay <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
