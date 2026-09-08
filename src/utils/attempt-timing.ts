/**
 * Server-authoritative exam timing.
 * deadlineAt (chốt lúc startTest) là nguồn sự thật duy nhất cho đồng hồ.
 * Client chỉ hiển thị, mọi quyết định hết giờ / nộp muộn đều tính từ server clock.
 */

/** Số giây cho phép nộp trễ sau deadline (độ trễ mạng + race auto-submit). */
export const SUBMIT_GRACE_SEC = 120;

/** Ngưỡng cheat: đạt mức này thì sync yêu cầu FE nộp bài ngay. */
export const CHEAT_FORCE_SUBMIT_THRESHOLD = 5;

/** Ngưỡng cheat: đạt mức này thì bài nộp bị gắn cờ để giáo viên xem lại. */
export const CHEAT_FLAG_THRESHOLD = 3;

/** Hạn nộp của lượt thi: ưu tiên deadlineAt, fallback startedAt + duration (lượt cũ). */
export function resolveDeadline(
  attempt: { startedAt: Date; deadlineAt: Date | null },
  durationSec: number,
): Date {
  if (attempt.deadlineAt) return new Date(attempt.deadlineAt);
  return new Date(attempt.startedAt.getTime() + durationSec * 1000);
}

/** Số giây còn lại theo giờ server (âm = đã quá hạn). */
export function serverTimeRemaining(deadline: Date, now: Date = new Date()): number {
  return Math.floor((deadline.getTime() - now.getTime()) / 1000);
}

/** Cheat count đơn điệu tăng: không cho client giảm số đã ghi nhận. */
export function mergeCheatCount(stored: number, incoming: unknown): number {
  const parsed = Number(incoming);
  return Math.max(stored, Number.isFinite(parsed) ? Math.floor(parsed) : 0);
}
