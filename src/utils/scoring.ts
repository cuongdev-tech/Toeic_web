export function convertToToeicScore(correct: number, total: number): number {
  if (total <= 0) return 5;
  const safeCorrect = Math.min(total, Math.max(0, correct));
  return Math.min(495, Math.max(5, 5 + Math.round((safeCorrect / total) * 490)));
}

export function calculateSectionScores(
  listeningCorrect: number,
  listeningTotal: number,
  readingCorrect: number,
  readingTotal: number,
) {
  const listeningScore = convertToToeicScore(listeningCorrect, listeningTotal);
  const readingScore = convertToToeicScore(readingCorrect, readingTotal);
  return { listeningScore, readingScore, totalScore: listeningScore + readingScore };
}
