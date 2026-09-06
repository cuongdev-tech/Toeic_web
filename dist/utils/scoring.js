"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertToToeicScore = convertToToeicScore;
exports.calculateSectionScores = calculateSectionScores;
function convertToToeicScore(correct, total) {
    if (total <= 0)
        return 5;
    const safeCorrect = Math.min(total, Math.max(0, correct));
    return Math.min(495, Math.max(5, 5 + Math.round((safeCorrect / total) * 490)));
}
function calculateSectionScores(listeningCorrect, listeningTotal, readingCorrect, readingTotal) {
    const listeningScore = convertToToeicScore(listeningCorrect, listeningTotal);
    const readingScore = convertToToeicScore(readingCorrect, readingTotal);
    return { listeningScore, readingScore, totalScore: listeningScore + readingScore };
}
