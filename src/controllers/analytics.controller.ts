import { Request, Response } from 'express';
import { prisma } from '../config/prisma'; 
import { AttemptStatus } from '@prisma/client';
import { computeStreak } from '../utils/streak';

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

  // 3. Sổ tay câu sai: gom các câu từng trả lời sai qua mọi lượt đã nộp.
  // resolved = lần gặp gần nhất trả lời ĐÚNG (tự tính từ lịch sử, không cần bảng phụ).
  // Query: ?status=all|unresolved|resolved&part=1..7&search=&limit=100
  getMistakes: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id as string;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const status = typeof req.query.status === 'string' ? req.query.status : 'unresolved';
      const part = Number(req.query.part) || 0;
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
      const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100));

      const answers = await prisma.attemptAnswer.findMany({
        where: {
          attempt: { userId, status: AttemptStatus.SUBMITTED },
          isCorrect: { not: null },
          ...(part >= 1 && part <= 7 ? { question: { partNumber: part } } : {}),
          ...(search ? { question: { questionText: { contains: search, mode: 'insensitive' } } } : {}),
        },
        include: {
          question: {
            select: {
              id: true, questionText: true, options: true, correctAnswer: true,
              explanation: true, partNumber: true, tags: true, difficulty: true,
            },
          },
          attempt: {
            select: {
              submittedAt: true,
              test: { select: { id: true, title: true } },
            },
          },
        },
        orderBy: { attempt: { submittedAt: 'desc' } },
        take: 3000,
      });

      // Mới nhất trước nên lần đầu gặp mỗi questionId chính là kết quả gần nhất.
      const byQuestion = new Map<string, {
        question: (typeof answers)[number]['question'];
        timesSeen: number;
        wrongCount: number;
        lastCorrect: boolean;
        lastSelected: string | null;
        lastTestTitle: string;
        lastAt: Date | null;
      }>();
      for (const ans of answers) {
        const entry = byQuestion.get(ans.questionId);
        if (!entry) {
          byQuestion.set(ans.questionId, {
            question: ans.question,
            timesSeen: 1,
            wrongCount: ans.isCorrect ? 0 : 1,
            lastCorrect: ans.isCorrect === true,
            lastSelected: ans.selectedOption,
            lastTestTitle: ans.attempt.test.title,
            lastAt: ans.attempt.submittedAt,
          });
        } else {
          entry.timesSeen += 1;
          if (!ans.isCorrect) entry.wrongCount += 1;
        }
      }

      const all = [...byQuestion.values()]
        .filter((entry) => entry.wrongCount > 0)
        .map((entry) => ({
          questionId: entry.question.id,
          questionText: entry.question.questionText,
          options: entry.question.options,
          correctAnswer: entry.question.correctAnswer,
          explanation: entry.question.explanation,
          partNumber: entry.question.partNumber,
          tags: entry.question.tags,
          difficulty: entry.question.difficulty,
          timesSeen: entry.timesSeen,
          wrongCount: entry.wrongCount,
          resolved: entry.lastCorrect,
          lastSelected: entry.lastSelected,
          lastTestTitle: entry.lastTestTitle,
          lastAt: entry.lastAt,
        }));

      const summary = {
        total: all.length,
        unresolved: all.filter((m) => !m.resolved).length,
        resolved: all.filter((m) => m.resolved).length,
      };

      const filtered = all
        .filter((m) => (status === 'resolved' ? m.resolved : status === 'all' ? true : !m.resolved))
        .sort((a, b) => {
          // Câu chưa vững sai nhiều lên trước; câu đã vững xếp theo mới nhất.
          if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
          if (!a.resolved) return b.wrongCount - a.wrongCount;
          return new Date(b.lastAt || 0).getTime() - new Date(a.lastAt || 0).getTime();
        })
        .slice(0, limit);

      return res.status(200).json({ success: true, data: { mistakes: filtered, summary } });
    } catch (error: any) {
      console.error('[Mistakes Error]:', error);
      return res.status(500).json({ success: false, message: 'Lỗi server khi tải sổ tay câu sai.' });
    }
  },

  // 4. Huy hiệu thành tích: tính toàn bộ từ dữ liệu sẵn có (không cần bảng mới).
  // icon là key để FE map sang lucide, progress/target để vẽ thanh tiến độ.
  getAchievements: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id as string;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const [attempts, answers] = await Promise.all([
        prisma.testAttempt.findMany({
          where: { userId, status: AttemptStatus.SUBMITTED },
          select: { totalScore: true, submittedAt: true, skillAnalytics: true },
          orderBy: { submittedAt: 'desc' },
        }),
        prisma.attemptAnswer.findMany({
          where: { attempt: { userId, status: AttemptStatus.SUBMITTED }, isCorrect: { not: null } },
          select: { questionId: true, isCorrect: true, attempt: { select: { submittedAt: true } } },
          orderBy: { attempt: { submittedAt: 'desc' } },
          take: 3000,
        }),
      ]);

      const scores = attempts.map((a) => a.totalScore || 0);
      const best = scores.length ? Math.max(...scores) : 0;
      const { longestStreak } = computeStreak(
        attempts.map((a) => ({ startedAt: a.submittedAt ?? new Date(), submittedAt: a.submittedAt })),
      );

      // Số câu "đã vững": từng sai nhưng lần gặp gần nhất đúng.
      // answers xếp mới-nhất-trước nên lần đầu gặp mỗi câu là kết quả gần nhất.
      const everWrong = new Set<string>();
      const latestMap = new Map<string, boolean>();
      for (const ans of answers) {
        if (!latestMap.has(ans.questionId)) latestMap.set(ans.questionId, ans.isCorrect === true);
        if (!ans.isCorrect) everWrong.add(ans.questionId);
      }
      let resolvedMistakes = 0;
      for (const qid of everWrong) {
        if (latestMap.get(qid)) resolvedMistakes += 1;
      }

      const hasPerfect = attempts.some((a) => {
        const analytics = a.skillAnalytics as Record<string, { correct: number; total: number }> | null;
        if (!analytics || typeof analytics !== 'object') return false;
        const parts = Object.values(analytics);
        return parts.length > 0 && parts.every((p) => p.total > 0 && p.correct === p.total);
      });
      const isNightOwl = attempts.some((a) => {
        if (!a.submittedAt) return false;
        const h = new Date(a.submittedAt).getHours();
        return h >= 22 || h < 5;
      });

      const defs = [
        { id: 'first-blood', name: 'Khởi động', description: 'Nộp bài thi đầu tiên', category: 'Khởi đầu', icon: 'flag', target: 1, progress: attempts.length },
        { id: 'regular-10', name: 'Đều đặn', description: 'Hoàn thành 10 bài thi', category: 'Khởi đầu', icon: 'calendar', target: 10, progress: attempts.length },
        { id: 'marathon-50', name: 'Marathon 50', description: 'Hoàn thành 50 bài thi', category: 'Khởi đầu', icon: 'medal', target: 50, progress: attempts.length },
        { id: 'score-600', name: 'Vượt 600', description: 'Điểm cao nhất từ 600 trở lên', category: 'Điểm số', icon: 'star', target: 600, progress: best },
        { id: 'score-750', name: 'Chạm 750', description: 'Điểm cao nhất từ 750 trở lên', category: 'Điểm số', icon: 'crown', target: 750, progress: best },
        { id: 'score-900', name: 'Gần tuyệt đối', description: 'Điểm cao nhất từ 900 trở lên', category: 'Điểm số', icon: 'gem', target: 900, progress: best },
        { id: 'streak-7', name: 'Tuần rực lửa', description: 'Học liên tục 7 ngày', category: 'Kiên trì', icon: 'flame', target: 7, progress: longestStreak },
        { id: 'streak-30', name: 'Tháng không nghỉ', description: 'Học liên tục 30 ngày', category: 'Kiên trì', icon: 'zap', target: 30, progress: longestStreak },
        { id: 'fixer-5', name: 'Thợ sửa lỗi', description: 'Làm vững lại 5 câu từng sai', category: 'Câu sai', icon: 'wrench', target: 5, progress: resolvedMistakes },
        { id: 'fixer-20', name: 'Bậc thầy sửa lỗi', description: 'Làm vững lại 20 câu từng sai', category: 'Câu sai', icon: 'shield', target: 20, progress: resolvedMistakes },
        { id: 'perfectionist', name: 'Bài thi hoàn hảo', description: 'Đúng 100% một bài thi', category: 'Thử thách', icon: 'target', target: 1, progress: hasPerfect ? 1 : 0 },
        { id: 'night-owl', name: 'Cú đêm', description: 'Nộp bài sau 22h', category: 'Thử thách', icon: 'moon', target: 1, progress: isNightOwl ? 1 : 0 },
      ];

      const achievements = defs.map((d) => ({ ...d, progress: Math.min(d.progress, d.target), unlocked: d.progress >= d.target }));
      return res.status(200).json({
        success: true,
        data: {
          achievements,
          summary: { total: achievements.length, unlocked: achievements.filter((a) => a.unlocked).length },
        },
      });
    } catch (error: any) {
      console.error('[Achievements Error]:', error);
      return res.status(500).json({ success: false, message: 'Lỗi server khi tải huy hiệu.' });
    }
  },
};