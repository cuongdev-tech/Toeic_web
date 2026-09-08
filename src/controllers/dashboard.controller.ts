import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { Role } from '@prisma/client';
import { computeStreak } from '../utils/streak';

export const DashboardController = {
  getStudentDashboard: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const [recentAttempts, inProgress, submittedAttempts, correctCount, answeredCount, me] = await Promise.all([
        prisma.testAttempt.findMany({
          where: { userId },
          include: { test: { select: { id: true, title: true, duration: true } } },
          orderBy: { startedAt: 'desc' },
          take: 5,
        }),
        prisma.testAttempt.findMany({
          where: { userId, status: 'IN_PROGRESS' },
          include: { test: { select: { id: true, title: true, duration: true } } },
          orderBy: { startedAt: 'desc' },
        }),
        prisma.testAttempt.findMany({
          where: { userId, status: 'SUBMITTED', totalScore: { not: null } },
          select: { totalScore: true, startedAt: true, submittedAt: true },
          orderBy: { startedAt: 'asc' },
        }),
        // Số câu trả lời đúng của học viên (kéo lên giao diện làm tử số accuracy)
        prisma.attemptAnswer.count({
          where: { attempt: { userId, status: 'SUBMITTED' }, isCorrect: true },
        }),
        // Tổng số câu đã trả lời (mẫu số accuracy)
        prisma.attemptAnswer.count({
          where: { attempt: { userId, status: 'SUBMITTED' }, isCorrect: { not: null } },
        }),
        prisma.user.findUnique({ where: { id: userId }, select: { id: true, fullName: true } }),
      ]);

      const scores = submittedAttempts.map((attempt) => attempt.totalScore || 0);
      const last7Days = Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - (6 - index));
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        return {
          date: date.toISOString().slice(0, 10),
          count: submittedAttempts.filter((attempt) => attempt.startedAt >= date && attempt.startedAt < nextDate).length,
        };
      });

      // ---- Chuỗi ngày học liên tục (Streak, logic dùng chung với trang Huy hiệu) ----
      const { currentStreak, longestStreak, todayDone } = computeStreak(submittedAttempts);

      // 7 chấm tròn cho UI (6 ngày trước + hôm nay), khớp weeklyProgress.
      const weekDots = last7Days.map((d) => ({ date: d.date, done: d.count > 0 }));

      // ---- Bảng xếp hạng mini (Top 5 toàn site) ----
      // Xếp theo điểm cao nhất, phụ theo số bài đã nộp. Chỉ tính học viên STUDENT.
      type LeaderRow = { userId: string; fullName: string; highestScore: number; totalCompleted: number };
      const topRows = await prisma.$queryRaw<LeaderRow[]>`
        SELECT u."id" AS "userId", u."fullName" AS "fullName",
               MAX(a."totalScore")::int AS "highestScore",
               COUNT(a."id")::int AS "totalCompleted"
        FROM "users" u
        JOIN "test_attempts" a ON a."userId" = u."id"
        WHERE a."status" = 'SUBMITTED' AND u."role" = 'STUDENT' AND u."isActive" = true
        GROUP BY u."id", u."fullName"
        ORDER BY "highestScore" DESC, "totalCompleted" DESC
        LIMIT 5;
      `;
      const leaderboard = topRows.map((row, i) => ({
        rank: i + 1,
        userId: row.userId,
        fullName: row.fullName,
        highestScore: Number(row.highestScore) || 0,
        totalCompleted: Number(row.totalCompleted) || 0,
        isMe: row.userId === userId,
      }));

      // Hạng của học viên hiện tại (đếm số người có max điểm cao hơn).
      const myBest = scores.length ? Math.max(...scores) : 0;
      const rankRows = await prisma.$queryRaw<Array<{ rank: number }>>`
        SELECT COUNT(*)::int + 1 AS "rank" FROM (
          SELECT MAX(a."totalScore") AS "mx"
          FROM "users" u
          JOIN "test_attempts" a ON a."userId" = u."id"
          WHERE a."status" = 'SUBMITTED' AND u."role" = 'STUDENT' AND u."isActive" = true
          GROUP BY u."id"
          HAVING MAX(a."totalScore") > ${myBest}
        ) t;
      `;
      const currentRank = submittedAttempts.length ? Number(rankRows[0]?.rank ?? 1) : null;

      const totalCorrectAnswers = correctCount;
      const totalAnswered = answeredCount;
      const accuracy = totalAnswered ? Math.round((totalCorrectAnswers / totalAnswered) * 100) : 0;

      // ---- Lộ trình ôn hôm nay: 3 Part yếu nhất + đề phù hợp nhất cho mỗi Part ----
      // Tín hiệu: accuracy theo Part từ mọi lượt đã nộp (cần >= 3 câu mới đủ tin).
      // Đề gợi ý: đề PUBLISHED có nhiều câu thuộc Part đó nhất.
      const [planAnswers, planLinks, myWords, topicWords, attachments] = await Promise.all([
        prisma.attemptAnswer.findMany({
          where: { attempt: { userId, status: 'SUBMITTED' }, isCorrect: { not: null } },
          include: {
            question: { select: { partNumber: true } },
            attempt: { select: { submittedAt: true } },
          },
          orderBy: { attempt: { submittedAt: 'desc' } },
          take: 3000,
        }),
        prisma.testQuestion.findMany({
          where: { test: { status: 'PUBLISHED' } },
          select: {
            testId: true,
            question: { select: { partNumber: true } },
            test: { select: { id: true, title: true, duration: true } },
          },
        }),
        prisma.vocabulary.findMany({ where: { userId }, select: { word: true } }),
        prisma.topicWord.findMany({ select: { id: true, word: true, topicId: true } }),
        prisma.questionWord.findMany({
          select: {
            question: { select: { partNumber: true } },
            word: { select: { topicId: true } },
          },
        }),
      ]);

      const partStats = new Map<number, { correct: number; total: number }>();
      const seenQuestion = new Set<string>();
      const unresolvedByPart = new Map<number, number>();
      for (const ans of planAnswers) {
        const part = ans.question.partNumber;
        const stat = partStats.get(part) ?? { correct: 0, total: 0 };
        stat.total += 1;
        if (ans.isCorrect) stat.correct += 1;
        partStats.set(part, stat);
        // Mới nhất trước nên lần đầu gặp mỗi câu là kết quả gần nhất.
        if (!seenQuestion.has(ans.questionId)) {
          seenQuestion.add(ans.questionId);
          if (!ans.isCorrect) unresolvedByPart.set(part, (unresolvedByPart.get(part) ?? 0) + 1);
        }
      }

      const testsById = new Map<string, { id: string; title: string; duration: number; partCounts: Map<number, number> }>();
      for (const link of planLinks) {
        let entry = testsById.get(link.testId);
        if (!entry) {
          entry = { id: link.test.id, title: link.test.title, duration: link.test.duration, partCounts: new Map() };
          testsById.set(link.testId, entry);
        }
        const part = link.question.partNumber;
        entry.partCounts.set(part, (entry.partCounts.get(part) ?? 0) + 1);
      }

      // Chủ đề gợi ý cho Part yếu: chủ đề có nhiều từ được gắn vào câu hỏi
      // Part đó nhất (admin tạo liên kết bằng cách gắn từ), ưu tiên chủ đề
      // học viên chưa học hết. Chưa có liên kết nào thì gợi ý chủ đề còn dở đầu tiên.
      const mineWords = new Set(myWords.map((v) => v.word.toLowerCase()));
      const topicMeta = new Map<string, { title: string; total: number; added: number }>();
      const topicTitles = new Map<string, string>();
      for (const w of topicWords) {
        const meta = topicMeta.get(w.topicId) ?? { title: '', total: 0, added: 0 };
        meta.total += 1;
        if (mineWords.has(w.word.toLowerCase())) meta.added += 1;
        topicMeta.set(w.topicId, meta);
      }
      const topicList = await prisma.vocabTopic.findMany({
        select: { id: true, title: true },
        orderBy: { createdAt: 'asc' },
      });
      for (const t of topicList) {
        topicTitles.set(t.id, t.title);
        const meta = topicMeta.get(t.id) ?? { title: t.title, total: 0, added: 0 };
        meta.title = t.title;
        topicMeta.set(t.id, meta);
      }
      const attachByPart = new Map<number, Map<string, number>>();
      for (const link of attachments) {
        const part = link.question.partNumber;
        let perPart = attachByPart.get(part);
        if (!perPart) {
          perPart = new Map();
          attachByPart.set(part, perPart);
        }
        perPart.set(link.word.topicId, (perPart.get(link.word.topicId) ?? 0) + 1);
      }
      const suggestTopic = (partNumber: number): { id: string; title: string; remaining: number } | null => {
        const ranked = [...topicMeta.entries()]
          .map(([id, meta]) => ({
            id,
            title: topicTitles.get(id) ?? meta.title,
            remaining: meta.total - meta.added,
            attached: attachByPart.get(partNumber)?.get(id) ?? 0,
          }))
          .filter((t) => t.remaining > 0 && topicMeta.get(t.id)!.total > 0)
          .sort((a, b) => b.attached - a.attached || b.remaining - a.remaining);
        return ranked.length ? { id: ranked[0].id, title: ranked[0].title, remaining: ranked[0].remaining } : null;
      };

      const MIN_ANSWERED_PER_PART = 3;
      const studyPlan = [...partStats.entries()]
        .filter(([, stat]) => stat.total >= MIN_ANSWERED_PER_PART)
        .map(([partNumber, stat]) => {
          let recommendedTest: { id: string; title: string; duration: number; partCount: number } | null = null;
          for (const test of testsById.values()) {
            const partCount = test.partCounts.get(partNumber) ?? 0;
            if (partCount === 0) continue;
            if (!recommendedTest || partCount > recommendedTest.partCount) {
              recommendedTest = { id: test.id, title: test.title, duration: test.duration, partCount };
            }
          }
          return {
            partNumber,
            accuracy: Math.round((stat.correct / stat.total) * 100),
            answered: stat.total,
            correct: stat.correct,
            unresolvedMistakes: unresolvedByPart.get(partNumber) ?? 0,
            recommendedTest,
            suggestedTopic: suggestTopic(partNumber),
          };
        })
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, 3);

      return res.json({
        success: true,
        data: {
          overview: {
            totalCompleted: submittedAttempts.length,
            highestScore: myBest,
            averageScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0,
            totalCorrectAnswers,
            totalAnswered,
            accuracy,
          },
          streak: { currentStreak, longestStreak, todayDone, weekDots },
          leaderboard,
          currentRank,
          studyPlan,
          me: me ?? { id: userId, fullName: 'Bạn' },
          recentAttempts,
          inProgress,
          weeklyProgress: last7Days,
          scoreHistory: submittedAttempts.map((attempt) => ({ date: attempt.startedAt, score: attempt.totalScore || 0 })),
        },
      });
    } catch (error: any) {
      console.error('[Student Dashboard Error]:', error);
      return res.status(500).json({ success: false, message: 'Không thể tải dashboard cá nhân.' });
    }
  },
  /**
   * GET /api/admin/dashboard/stats
   * Lấy dữ liệu tổng hợp cho Admin Dashboard
   */
  getDashboardStats: async (req: Request, res: Response) => {
    try {
      // 1. TẠO TEMPLATE 7 NGÀY GẦN NHẤT ĐỂ ĐẢM BẢO FRONTEND VẼ CHART KHÔNG BỊ GÃY
      // Tạo mảng chứa 7 chuỗi ngày (YYYY-MM-DD), từ 6 ngày trước đến hôm nay
      const last7DaysTemplate = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i)); 
        return d.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      });

      // 2. CHẠY PARALLEL QUERIES (Tối ưu hiệu suất DB)
      const [totalStudents, totalTests, totalAttempts, rawDailyStats] = await Promise.all([
        // Đếm tổng Học viên
        prisma.user.count({
          where: { role: Role.STUDENT },
        }),
        
        // Đếm tổng Đề thi
        prisma.test.count(),
        
        // Đếm tổng Lượt làm bài
        prisma.testAttempt.count(),

        // Gom nhóm số lượt thi theo 7 ngày gần nhất (PostgreSQL specific query)
        // Dùng TO_CHAR để ép kiểu datetime về YYYY-MM-DD, dùng ::int để cast BigInt về số thường
        prisma.$queryRaw<Array<{ date: string; count: number }>>`
          SELECT 
            TO_CHAR("startedAt", 'YYYY-MM-DD') as "date", 
            COUNT(*)::int as "count"
          FROM "test_attempts"
          WHERE "startedAt" >= CURRENT_DATE - INTERVAL '6 days'
          GROUP BY TO_CHAR("startedAt", 'YYYY-MM-DD')
          ORDER BY "date" ASC;
        `
      ]);

      // 3. MAP DỮ LIỆU TỪ DB VÀO TEMPLATE 7 NGÀY
      // Xử lý việc nếu 1 ngày không có ai thi, SQL sẽ không trả về ngày đó -> Set count = 0
      const chartData = last7DaysTemplate.map((dateStr) => {
        const found = rawDailyStats.find((row) => row.date === dateStr);
        return {
          date: dateStr,
          count: found ? found.count : 0,
        };
      });

      // 4. TRẢ VỀ RESPONSE CHUẨN
      return res.status(200).json({
        success: true,
        message: 'Lấy dữ liệu thống kê Dashboard thành công',
        data: {
          overview: {
            totalStudents,
            totalTests,
            totalAttempts,
          },
          chartData: {
            last7DaysAttempts: chartData,
          }
        },
      });

    } catch (error: any) {
      console.error('[Dashboard Error]:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Lỗi server khi tính toán số liệu thống kê.',
        error: error.message 
      });
    }
  },
};