import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHEAT_FLAG_THRESHOLD,
  CHEAT_FORCE_SUBMIT_THRESHOLD,
  SUBMIT_GRACE_SEC,
  mergeCheatCount,
  resolveDeadline,
  serverTimeRemaining,
} from './attempt-timing';

describe('attempt-timing (server-authoritative)', () => {
  it('ưu tiên deadlineAt, fallback startedAt + duration cho lượt cũ', () => {
    const startedAt = new Date('2026-09-07T10:00:00Z');
    const deadlineAt = new Date('2026-09-07T12:00:00Z');
    assert.equal(resolveDeadline({ startedAt, deadlineAt }, 7200).getTime(), deadlineAt.getTime());
    assert.equal(
      resolveDeadline({ startedAt, deadlineAt: null }, 3600).getTime(),
      new Date('2026-09-07T11:00:00Z').getTime(),
    );
  });

  it('tính số giây còn lại, âm khi quá hạn', () => {
    const deadline = new Date('2026-09-07T12:00:00Z');
    assert.equal(serverTimeRemaining(deadline, new Date('2026-09-07T11:59:00Z')), 60);
    assert.ok(serverTimeRemaining(deadline, new Date('2026-09-07T12:02:00Z')) < 0);
  });

  it('cheat count không bao giờ giảm (client không thể xóa vi phạm)', () => {
    assert.equal(mergeCheatCount(3, 1), 3);
    assert.equal(mergeCheatCount(3, 5), 5);
    assert.equal(mergeCheatCount(2, 'abc'), 2);
  });

  it('ngưỡng chính sách hợp lý (flag < force, grace đủ cho auto-submit)', () => {
    assert.ok(CHEAT_FLAG_THRESHOLD < CHEAT_FORCE_SUBMIT_THRESHOLD);
    assert.ok(SUBMIT_GRACE_SEC >= 60);
  });
});
