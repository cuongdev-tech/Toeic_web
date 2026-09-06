import { Request, Response } from 'express';
import { prisma } from '../config/prisma'; 
import { AttemptStatus } from '@prisma/client';

export const AnalyticsController = {
  // 1. Thống kê tổng quan (Điểm cao nhất, trung bình, tổng bài thi)
  getOverview: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id as string;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      // Lấy tất cả các lần thi đã nộp của user
      const attempts = await prisma.testAttempt.findMany({
        where: {
          userId: userId,
          status: AttemptStatus.SUBMITTED,
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
      const totalScore = scores.reduce((acc: number, cur: number) => acc + cur, 0);
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
    } catch (error: any) {
      console.error('[Analytics Overview Error]:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // 2. Phân tích điểm yếu (giữ nguyên logic hiện tại của bạn)
  getWeaknesses: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id as string;
      
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const userAnswers = await prisma.attemptAnswer.findMany({
        where: {
          attempt: {
            userId: userId,
            status: AttemptStatus.SUBMITTED,
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

      const partStats: Record<number, { correct: number; total: number }> = {};
      const tagStats: Record<string, { correct: number; total: number }> = {};

      userAnswers.forEach((ans) => {
        const isCorrect = ans.isCorrect === true;
        const part = ans.question.partNumber;
        const tags = ans.question.tags || [];

        if (!partStats[part]) partStats[part] = { correct: 0, total: 0 };
        partStats[part].total += 1;
        if (isCorrect) partStats[part].correct += 1;

        tags.forEach((tag: string) => {
          if (!tagStats[tag]) tagStats[tag] = { correct: 0, total: 0 };
          tagStats[tag].total += 1;
          if (isCorrect) tagStats[tag].correct += 1;
        });
      });

      const formatForChart = (
        statsMap: Record<string | number, { correct: number; total: number }>,
        prefix = ''
      ) => {
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

    } catch (error: any) {
      console.error('[Analytics Error]:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Lỗi server khi phân tích điểm yếu.',
        error: error.message 
      });
    }
  },
};