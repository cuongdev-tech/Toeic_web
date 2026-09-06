-- Add the optional owning test relation for question groups.
ALTER TABLE "question_groups" ADD COLUMN "testId" TEXT;

CREATE INDEX "question_groups_testId_idx" ON "question_groups"("testId");

ALTER TABLE "question_groups"
  ADD CONSTRAINT "question_groups_testId_fkey"
  FOREIGN KEY ("testId") REFERENCES "tests"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
