"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsController = void 0;
const prisma_1 = require("../config/prisma");
const client_1 = require("@prisma/client");
exports.AnalyticsController = {
    // 1. Thống kê tổng quan (Điểm cao nhất, trung bình, tổng bài thi)
    getOverview: async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            }
            // Lấy tất cả các lần thi đã nộp của user
            const attempts = await prisma_1.prisma.testAttempt.findMany({
                where: {
                    userId: userId,
                    status: client_1.AttemptStatus.SUBMITTED,
                },
                orderBy: { startedAt: 'asc' },
            });
            const totalTestsTaken = attempts.length;
            if (totalTestsTaken === 0) {
                return res.status(200).json({
                    success: true,
                    message: 'Chưa có lịch sử làm bài.',
                    data: { totalTestsTaken: 0, highestScore: 0, averageScore: 0, scoreHistory: [] }
                });
            }
            const scores = attempts.map((attempt) => attempt.totalScore || 0);
            const highestScore = Math.max(...scores);
            const totalScore = scores.reduce((acc, cur) => acc + cur, 0);
            const averageScore = Math.round(totalScore / totalTestsTaken);
            // Lịch sử điểm số theo thời gian (dùng vẽ biểu đồ đường xu hướng)
            const scoreHistory = attempts.map((attempt) => ({
                date: attempt.startedAt,
                score: attempt.totalScore || 0,
            }));
            return res.status(200).json({
                success: true,
                message: 'Lấy dữ liệu tổng quan thành công',
                data: {
                    totalTestsTaken,
                    highestScore,
                    averageScore,
                    scoreHistory,
                },
            });
        }
        catch (error) {
            console.error('[Analytics Overview Error]:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    },
    // 2. Phân tích điểm yếu (giữ nguyên logic hiện tại của bạn)
    getWeaknesses: async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            }
            const userAnswers = await prisma_1.prisma.attemptAnswer.findMany({
                where: {
                    attempt: {
                        userId: userId,
                        status: client_1.AttemptStatus.SUBMITTED,
                    },
                    isCorrect: { not: null },
                },
                include: {
                    question: {
                        select: {
                            partNumber: true,
                            tags: true,
                        },
                    },
                },
            });
            if (userAnswers.length === 0) {
                return res.status(200).json({
                    success: true,
                    message: 'Chưa có đủ dữ liệu để phân tích.',
                    data: null,
                });
            }
            const partStats = {};
            const tagStats = {};
            userAnswers.forEach((ans) => {
                const isCorrect = ans.isCorrect === true;
                const part = ans.question.partNumber;
                const tags = ans.question.tags || [];
                if (!partStats[part])
                    partStats[part] = { correct: 0, total: 0 };
                partStats[part].total += 1;
                if (isCorrect)
                    partStats[part].correct += 1;
                tags.forEach((tag) => {
                    if (!tagStats[tag])
                        tagStats[tag] = { correct: 0, total: 0 };
                    tagStats[tag].total += 1;
                    if (isCorrect)
                        tagStats[tag].correct += 1;
                });
            });
            const formatForChart = (statsMap, prefix = '') => {
                return Object.entries(statsMap).map(([key, data]) => {
                    const percentage = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
                    return {
                        subject: prefix ? `${prefix} ${key}` : key,
                        score: percentage,
                        fullMark: 100,
                        rawCorrect: data.correct,
                        rawTotal: data.total,
                    };
                });
            };
            const radarDataByPart = formatForChart(partStats, 'Part');
            const radarDataByTag = formatForChart(tagStats);
            return res.status(200).json({
                success: true,
                message: 'Lấy dữ liệu phân tích thành công',
                data: {
                    radarChartByPart: radarDataByPart,
                    radarChartByTag: radarDataByTag,
                    totalQuestionsAttempted: userAnswers.length,
                },
            });
        }
        catch (error) {
            console.error('[Analytics Error]:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server khi phân tích điểm yếu.',
                error: error.message
            });
        }
    },
};
