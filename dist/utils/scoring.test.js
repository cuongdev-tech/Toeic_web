"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const scoring_1 = require("./scoring");
(0, node_test_1.default)('clamps raw correct answers before converting score', () => {
    strict_1.default.equal((0, scoring_1.convertToToeicScore)(-2, 100), 5);
    strict_1.default.equal((0, scoring_1.convertToToeicScore)(120, 100), 495);
    strict_1.default.equal((0, scoring_1.convertToToeicScore)(0, 0), 5);
});
(0, node_test_1.default)('calculates separate listening and reading scores', () => {
    strict_1.default.deepEqual((0, scoring_1.calculateSectionScores)(50, 100, 75, 100), {
        listeningScore: 250,
        readingScore: 373,
        totalScore: 623,
    });
});
