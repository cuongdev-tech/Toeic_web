-- Server-authoritative exam deadline (startedAt + duration at start).
ALTER TABLE "test_attempts" ADD COLUMN "deadlineAt" TIMESTAMP(3);

