import React from 'react';
import { CheckCircle2, RotateCw, Volume2, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';

export interface FlashcardItem {
  id: string;
  word: string;
  meaning: string;
  status: number;
}

interface FlashcardProps {
  card: FlashcardItem;
  flipped: boolean;
  onFlip: () => void;
  onKnown: () => void;
  onUnknown: () => void;
  onPronounce?: (text: string) => void;
  index: number;
  total: number;
  disabled?: boolean;
}

/**
 * Flashcard học từ vựng — mobile-first.
 * - Khung `.flashcard` tạo perspective, `.flashcard-inner` xoay rotateY(180deg) khi flipped.
 * - Mặt trước/sau dùng `.card` + `.badge` có sẵn, màu từ biến @theme.
 * - Nút "Đã thuộc" = .btn-success (var(--color-success-600)), "Chưa thuộc" = .btn-danger (var(--color-danger-600)).
 * - Touch target >= 48px, hỗ trợ bàn phím (Enter/Space để lật).
 */
export default function Flashcard({
  card,
  flipped,
  onFlip,
  onKnown,
  onUnknown,
  onPronounce,
  index,
  total,
  disabled = false,
}: FlashcardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onFlip();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-4">
      {/* Tiến độ */}
      <div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-500">
            Thẻ {total === 0 ? 0 : index + 1} / {total}
          </span>
          <span className="badge" style={{ background: 'var(--color-primary-50)', color: 'var(--color-primary-700)' }}>
            Cấp độ nhớ: {card.status}
          </span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuenow={index + 1} aria-valuemin={1} aria-valuemax={total}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${total ? Math.round(((index + 1) / total) * 100) : 0}%`, background: 'var(--color-primary-600)' }}
          />
        </div>
      </div>

      {/* Thẻ lật 3D — chạm/click hoặc Enter/Space để lật */}
      <div
        role="button"
        tabIndex={0}
        aria-pressed={flipped}
        aria-label={flipped ? `Nghĩa của từ ${card.word}` : `Từ vựng ${card.word}, kích hoạt để xem nghĩa`}
        onClick={onFlip}
        onKeyDown={handleKeyDown}
        className={cn('flashcard outline-none', flipped && 'flipped')}
      >
        <div className="flashcard-inner min-h-[300px] sm:min-h-[340px]">
          {/* Mặt trước: từ vựng */}
          <div className="flashcard-face flashcard-front card items-center justify-center text-center gap-3">
            <p className="section-label">Từ vựng</p>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 break-words leading-tight">
              {card.word}
            </h2>
            {onPronounce && (
              <button
                type="button"
                aria-label={`Nghe phát âm từ ${card.word}`}
                onClick={(e) => { e.stopPropagation(); onPronounce(card.word); }}
                className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2.5 min-h-[44px] rounded-full transition-colors"
                style={{ color: 'var(--color-primary-600)', background: 'var(--color-primary-50)' }}
              >
                <Volume2 className="w-4 h-4" /> Nghe phát âm
              </button>
            )}
            <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5 mt-1">
              <RotateCw className="w-3.5 h-3.5" /> Chạm vào thẻ để lật xem nghĩa
            </p>
          </div>

          {/* Mặt sau: nghĩa */}
          <div className="flashcard-face flashcard-back card items-center justify-center text-center gap-3">
            <p className="section-label">Ý nghĩa</p>
            <h2 className="text-3xl sm:text-4xl font-bold break-words leading-snug" style={{ color: 'var(--color-primary-700)' }}>
              {card.meaning}
            </h2>
            <p className="text-sm text-slate-400">{card.word}</p>
            <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
              <RotateCw className="w-3.5 h-3.5" /> Chạm để lật lại
            </p>
          </div>
        </div>
      </div>

      {/* Hai nút đánh giá — luôn 2 cột để ngón cái dễ với, cao >= 48px */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onUnknown}
          disabled={disabled}
          className="btn-danger w-full min-h-[52px] text-sm sm:text-base"
        >
          <XCircle className="w-5 h-5 shrink-0" />
          <span>
            Chưa thuộc
            <span className="block text-[11px] font-normal opacity-80">Ôn lại sớm</span>
          </span>
        </button>
        <button
          type="button"
          onClick={onKnown}
          disabled={disabled}
          className="btn-success w-full min-h-[52px] text-sm sm:text-base"
        >
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>
            Đã thuộc
            <span className="block text-[11px] font-normal opacity-80">Giãn cách</span>
          </span>
        </button>
      </div>
    </div>
  );
}
