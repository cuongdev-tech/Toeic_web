-- Gan tu vung vao cau hoi (N-N) de goi y bai tu theo Part yeu.
CREATE TABLE "question_words" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "question_words_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "question_words_questionId_wordId_key" ON "question_words"("questionId", "wordId");
CREATE INDEX "question_words_questionId_idx" ON "question_words"("questionId");
CREATE INDEX "question_words_wordId_idx" ON "question_words"("wordId");

ALTER TABLE "question_words" ADD CONSTRAINT "question_words_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "question_words" ADD CONSTRAINT "question_words_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "topic_words"("id") ON DELETE CASCADE ON UPDATE CASCADE;

