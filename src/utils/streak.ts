/**
 * Chuỗi ngày học liên tục (Streak) — logic dùng chung cho Dashboard
 * và trang Huy hiệu để hai nơi không bao giờ tính lệch nhau.
 */

export interface StreakInput {
  startedAt: Date;
  submittedAt: Date | null;
}

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  todayDone: boolean;
}

export function toDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function computeStreak(attempts: StreakInput[], now: Date = new Date()): StreakResult {
  // Chuẩn hoá về YYYY-MM-DD theo giờ địa phương của server, loại trùng ngày.
  const activeDays = Array.from(
    new Set(attempts.map((a) => toDayKey(new Date(a.submittedAt ?? a.startedAt)))),
  ).sort();
  const daySet = new Set(activeDays);

  const todayKey = toDayKey(now);
  const todayDone = daySet.has(todayKey);

  // Streak hiện tại: đếm ngược từ hôm nay (hoặc hôm qua nếu hôm nay chưa học).
  let currentStreak = 0;
  const cursor = new Date(now);
  if (!todayDone) cursor.setDate(cursor.getDate() - 1); // cho phép giữ streak trong ngày
  while (true) {
    const key = toDayKey(cursor);
    if (daySet.has(key)) {
      currentStreak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
    if (currentStreak > 3650) break; // chốt chặn an toàn
  }

  // Streak dài nhất: quét 1 lần qua danh sách ngày đã sắp xếp.
  let longestStreak = 0;
  let run = 0;
  let prevTime: number | null = null;
  for (const key of activeDays) {
    const t = new Date(`${key}T00:00:00`).getTime();
    run = prevTime !== null && t - prevTime === 86400000 ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    prevTime = t;
  }

  return { currentStreak, longestStreak, todayDone };
}
