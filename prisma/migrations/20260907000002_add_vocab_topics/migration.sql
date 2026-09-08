-- Kho tu vung chung theo chu de: admin bien soan, hoc vien them 1 cham ve so tay.
CREATE TABLE "vocab_topics" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "vocab_topics_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "topic_words" (
    "id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "meaning" TEXT NOT NULL,
    "example" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "topicId" TEXT NOT NULL,
    CONSTRAINT "topic_words_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "topic_words_topicId_idx" ON "topic_words"("topicId");

ALTER TABLE "topic_words" ADD CONSTRAINT "topic_words_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "vocab_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

