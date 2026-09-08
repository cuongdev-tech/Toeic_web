import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeStreak } from './streak';

const at = (iso: string) => ({ startedAt: new Date(iso), submittedAt: new Date(iso) });
const NOW = new Date('2026-09-07T12:00:00');

describe('computeStreak', () => {
  it('trả về 0 khi chưa từng nộp bài', () => {
    assert.deepEqual(computeStreak([], NOW), { currentStreak: 0, longestStreak: 0, todayDone: false });
  });

  it('giữ streak khi hôm nay chưa học nhưng hôm qua có học', () => {
    const res = computeStreak([at('2026-09-06T10:00:00'), at('2026-09-05T10:00:00')], NOW);
    assert.equal(res.currentStreak, 2);
    assert.equal(res.longestStreak, 2);
    assert.equal(res.todayDone, false);
  });

  it('đếm tiếp từ hôm nay và tính kỷ lục dài nhất', () => {
    const res = computeStreak(
      [at('2026-09-07T08:00:00'), at('2026-09-06T08:00:00'), at('2026-09-01T08:00:00')],
      NOW,
    );
    assert.equal(res.currentStreak, 2);
    assert.equal(res.longestStreak, 2);
    assert.equal(res.todayDone, true);
  });

  it('đứt streak khi bỏ ngày và loại trùng ngày', () => {
    const res = computeStreak(
      [at('2026-09-07T08:00:00'), at('2026-09-07T20:00:00'), at('2026-09-05T08:00:00')],
      NOW,
    );
    assert.equal(res.currentStreak, 1);
    assert.equal(res.longestStreak, 1);
  });
});
