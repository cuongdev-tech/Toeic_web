import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface ChartLoadingProps {
  label?: string;
  className?: string;
}

/**
 * Spinner chờ tải biểu đồ — nhỏ gọn, dùng màu primary từ @theme.
 * Dùng làm fallback cho Suspense khi lazy-load Recharts.
 */
export default function ChartLoading({ label = 'Đang tải biểu đồ...', className }: ChartLoadingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn('flex min-h-[16rem] w-full flex-col items-center justify-center gap-3 rounded-card border border-slate-200 bg-surface p-6', className)}
    >
      <Loader2 className="h-7 w-7 animate-spin text-primary-600" aria-hidden="true" />
      <p className="text-sm font-medium text-slate-500">{label}</p>
    </div>
  );
}
