import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateSectionScores, convertToToeicScore } from './scoring';

test('clamps raw correct answers before converting score', () => {
  assert.equal(convertToToeicScore(-2, 100), 5);
  assert.equal(convertToToeicScore(120, 100), 495);
  assert.equal(convertToToeicScore(0, 0), 5);
});

test('calculates separate listening and reading scores', () => {
  assert.deepEqual(calculateSectionScores(50, 100, 75, 100), {
    listeningScore: 250,
    readingScore: 373,
    totalScore: 623,
  });
});
