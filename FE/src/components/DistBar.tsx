import React from 'react';

export type DistMap = Record<string, number>;

/** Badge % đúng: xanh/vàng/đỏ theo ngưỡng, xám khi chưa có lượt trả lời. */
export function AccuracyBadge({ accuracy, answered }: { accuracy: number | null; answered: number }) {
  if (accuracy === null || answered === 0) {
    return (
      <span className="badge bg-slate-100 text-slate-500" title="Chưa có lượt trả lời">
        Chưa có dữ liệu
      </span>
    );
  }
  const style =
    accuracy >= 70
      ? { background: 'var(--color-success-50)', color: 'var(--color-success-700)' }
      : accuracy >= 40
        ? { background: 'var(--color-warning-50)', color: 'var(--color-warning-700)' }
        : { background: 'var(--color-danger-50)', color: 'var(--color-danger-700)' };
  return (
    <span className="badge whitespace-nowrap" style={style} title={`${accuracy}% đúng trên ${answered} lượt`}>
      {accuracy}% đúng
    </span>
  );
}

const SEG_COLORS: Record<string, string> = {
  A: 'var(--color-primary-400)',
  B: 'var(--color-info-400)',
  C: 'var(--color-success-300)',
  D: 'var(--color-warning-300)',
  blank: 'var(--color-slate-200)',
};

/** Thanh phân bố đáp án A/B/C/D (+bỏ trống): đáp án đúng viền đậm để thấy bẫy có "dính" không. */
export function DistBar({ dist, correct }: { dist: DistMap; correct: string }) {
  const total = ['A', 'B', 'C', 'D', 'blank'].reduce((sum, k) => sum + (dist[k] || 0), 0);
  if (!total) return <span className="text-xs text-slate-400">—</span>;
  return (
    <div className="min-w-0">
      <div className="flex h-3 rounded-full overflow-hidden bg-slate-100 gap-px" role="img" aria-label={`Phân bố đáp án, đúng là ${correct}`}>
        {['A', 'B', 'C', 'D', 'blank'].map((key) => {
          const count = dist[key] || 0;
          if (!count) return null;
          const label = key === 'blank' ? 'Bỏ trống' : `Đáp án ${key}`;
          return (
            <div
              key={key}
              title={`${label}: ${count} lượt (${Math.round((count / total) * 100)}%)`}
              style={{
                width: `${(count / total) * 100}%`,
                background: SEG_COLORS[key],
                outline: key === correct ? '2px solid var(--color-slate-700)' : undefined,
                outlineOffset: '-2px',
                minWidth: count ? '6px' : undefined,
              }}
            />
          );
        })}
      </div>
      <div className="flex gap-2 mt-1 text-[10px] text-slate-500">
        {['A', 'B', 'C', 'D'].map((key) => (
          <span key={key} className={key === correct ? 'font-bold text-slate-800' : ''} title={key === correct ? 'Đáp án đúng' : `Đáp án ${key}`}>
            {key}{key === correct ? '✓' : ''}: {dist[key] || 0}
          </span>
        ))}
        {(dist.blank || 0) > 0 && <span title="Bỏ trống">∅: {dist.blank}</span>}
      </div>
    </div>
  );
}
