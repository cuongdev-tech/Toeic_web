import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AttemptStatus, Prisma } from '@prisma/client';
import { calculateSectionScores } from '../utils/scoring';
import {
  CHEAT_FLAG_THRESHOLD,
  CHEAT_FORCE_SUBMIT_THRESHOLD,
  SUBMIT_GRACE_SEC,
  mergeCheatCount,
  resolveDeadline,
  serverTimeRemaining,
} from '../utils/attempt-timing';

export const TestAttemptController = {
  startTest: async (req: Request, res: Response): Promise<void> => {
    try {
      const { testId } = req.body as { testId?: unknown };
      
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Không xác định được danh tính người dùng!' });
        return;
      }

      const test = await prisma.test.findUnique({ where: { id: String(testId), status: 'PUBLISHED' } });
      if (!test) {
        res.status(404).json({ success: false, message: 'Không tìm thấy đề thi' });
        return;
      }
      
      const activeAttempts = await prisma.testAttempt.findMany({
        where: { userId, status: AttemptStatus.IN_PROGRESS },
        include: { test: { select: { duration: true } }, answers: { select: { questionId: true, selectedOption: true } } },
        orderBy: { startedAt: 'desc' },
      });
      const now = new Date();
      const isExpired = (item: { startedAt: Date; deadlineAt: Date | null; test: { duration: number } }) =>
        serverTimeRemaining(resolveDeadline(item, item.test.duration * 60), now) <= 0;
      const expiredAttempts = activeAttempts.filter(isExpired);
      if (expiredAttempts.length) {
        await prisma.testAttempt.updateMany({
          where: { id: { in: expiredAttempts.map((item) => item.id) } },
          data: { status: AttemptStatus.ABANDONED, timeRemaining: 0 },
        });
      }
      const existingAttempt = activeAttempts.find((item) => item.testId === String(testId) && !expiredAttempts.some((expired) => expired.id === item.id));

      if (existingAttempt) {
        // Backfill deadlineAt cho lượt tạo trước khi có cột này.
        let deadline = existingAttempt.deadlineAt ? new Date(existingAttempt.deadlineAt) : null;
        if (!deadline) {
          deadline = new Date(existingAttempt.startedAt.getTime() + existingAttempt.test.duration * 60 * 1000);
          await prisma.testAttempt.update({ where: { id: existingAttempt.id }, data: { deadlineAt: deadline } });
        }
        const serverRemaining = Math.max(0, serverTimeRemaining(deadline, now));
        await prisma.testAttempt.update({ where: { id: existingAttempt.id }, data: { timeRemaining: serverRemaining } });
        res.status(200).json({
          success: true,
          data: {
            id: existingAttempt.id,
            timeRemaining: serverRemaining,
            deadlineAt: deadline.toISOString(),
            serverTime: now.toISOString(),
            cheatWarningCount: existingAttempt.cheatWarningCount,
            answers: existingAttempt.answers,
            resumed: true,
          },
        });
        return;
      }

      const durationSec = test.duration * 60;
      const deadlineAt = new Date(Date.now() + durationSec * 1000);
      const attempt = await prisma.testAttempt.create({
        data: {
          test: { connect: { id: String(testId) } },
          user: { connect: { id: userId } },
          timeRemaining: durationSec,
          deadlineAt,
          status: 'IN_PROGRESS'
        }
      });

      res.status(200).json({
        success: true,
        data: {
          id: attempt.id,
          timeRemaining: durationSec,
          deadlineAt: deadlineAt.toISOString(),
          serverTime: new Date().toISOString(),
          cheatWarningCount: 0,
          answers: [],
          resumed: false,
        },
      });
    } catch (e: any) {
      console.error('Lỗi startTest:', e);
      res.status(500).json({ success: false, message: e.message });
    }
  },

  syncAttempt: async (req: Request, res: Response): Promise<void> => {
    try {
      const attemptId = req.params.attemptId as string;
      const { cheatWarningCount, answers } = req.body as {
        cheatWarningCount?: unknown;
        answers?: { questionId: string; selectedOption?: string | null }[];
      };
      const userId = req.user?.id;
      const attempt = await prisma.testAttempt.findFirst({
        where: { id: attemptId, userId },
        include: { test: { select: { duration: true } } },
      });
      if (!attempt) { res.status(404).json({ success: false, message: 'Không tìm thấy lượt làm bài' }); return; }
      if (attempt.status !== AttemptStatus.IN_PROGRESS) { res.status(409).json({ success: false, message: 'Lượt làm bài không còn hoạt động' }); return; }

      // Đồng hồ server là nguồn sự thật: bỏ qua timeRemaining client gửi lên.
      const deadline = resolveDeadline(attempt, attempt.test.duration * 60);
      const serverRemaining = serverTimeRemaining(deadline);
      const mergedCheat = mergeCheatCount(attempt.cheatWarningCount, cheatWarningCount);

      const ops: Prisma.PrismaPromise<unknown>[] = [];
      ops.push(prisma.testAttempt.update({
        where: { id: attemptId },
        data: {
          timeRemaining: Math.max(0, serverRemaining),
          cheatWarningCount: mergedCheat,
        }
      }));

      if (Array.isArray(answers)) {
        answers.forEach((ans) => {
          ops.push(prisma.attemptAnswer.upsert({
            where: { attemptId_questionId: { attemptId, questionId: ans.questionId } },
            update: { selectedOption: ans.selectedOption },
            create: { attemptId, questionId: ans.questionId, selectedOption: ans.selectedOption }
          }));
        });
      }

      await prisma.$transaction(ops);

      if (serverRemaining <= 0) {
        res.status(409).json({
          success: false,
          message: 'Bài thi đã hết giờ (tính theo giờ server)',
          expired: true,
          serverRemaining: 0,
          deadlineAt: deadline.toISOString(),
        });
        return;
      }
      res.status(200).json({
        success: true,
        message: 'Synced',
        serverRemaining,
        deadlineAt: deadline.toISOString(),
        // Đạt ngưỡng cheat -> FE tự nộp bài ngay thay vì chờ hết giờ.
        forceSubmit: mergedCheat >= CHEAT_FORCE_SUBMIT_THRESHOLD,
      });
    } catch (e: any) { 
      res.status(500).json({ success: false, message: e.message }); 
    }
  },

  submitTest: async (req: Request, res: Response): Promise<void> => {
    try {
      const attemptId = req.params.attemptId as string;
      const { answers, cheatCount } = req.body as {
        answers?: { questionId: unknown; selectedOption?: unknown }[];
        cheatCount?: unknown;
      };

      const attempt = await prisma.testAttempt.findUnique({
        where: { id: attemptId },
        include: { test: { select: { duration: true } } },
      });
      if(!attempt) { res.status(404).json({ success: false, message: 'Không tìm thấy lượt làm bài' }); return; }

      const userId = req.user?.id;
      if (attempt.userId !== userId) { res.status(403).json({ success: false, message: 'Bạn không có quyền nộp lượt làm bài này' }); return; }

      if (attempt.status === 'SUBMITTED') {
        res.status(400).json({ success: false, message: 'Bài thi này đã được nộp trước đó rồi!' });
        return;
      }
      if (attempt.status === 'ABANDONED') {
        res.status(409).json({ success: false, message: 'Lượt làm bài đã bị hủy (hết giờ hoặc vi phạm).', expired: true });
        return;
      }

      // Chốt giờ nộp bằng đồng hồ server. Quá grace thì đóng lượt, không cho nộp muộn.
      const deadline = resolveDeadline(attempt, attempt.test.duration * 60);
      const serverRemaining = serverTimeRemaining(deadline);
      const mergedCheat = mergeCheatCount(attempt.cheatWarningCount, cheatCount);
      const isLate = serverRemaining < 0;
      if (serverRemaining < -SUBMIT_GRACE_SEC) {
        await prisma.testAttempt.update({
          where: { id: attemptId },
          data: { status: AttemptStatus.ABANDONED, timeRemaining: 0, cheatWarningCount: mergedCheat },
        });
        res.status(410).json({
          success: false,
          message: 'Đã quá hạn nộp bài (tính theo giờ server). Lượt thi đã bị hủy.',
          expired: true,
        });
        return;
      }

      const correctQuestions = await prisma.testQuestion.findMany({
        where: { testId: attempt.testId },
        include: { question: true }
      });

      const submittedAnswers = new Map<string, string | null>(
        Array.isArray(answers)
          ? answers.map((answer) => [String(answer.questionId), answer.selectedOption ? String(answer.selectedOption) : null])
          : [],
      );
      let listeningCorrect = 0;
      let readingCorrect = 0;
      const partAnalytics: Record<string, { correct: number; total: number }> = {};

      const answerRows = correctQuestions.map(({ question }) => {
        const selectedOption = submittedAnswers.get(question.id) || null;
        const isCorrect = selectedOption !== null && selectedOption === question.correctAnswer;
        const section = [1, 2, 3, 4].includes(question.partNumber) ? 'listening' : 'reading';
        const part = `Part ${question.partNumber}`;
        if (!partAnalytics[part]) partAnalytics[part] = { correct: 0, total: 0 };
        partAnalytics[part].total += 1;
        if (isCorrect) {
          partAnalytics[part].correct += 1;
          if (section === 'listening') listeningCorrect += 1;
          else readingCorrect += 1;
        }
        return { attemptId, questionId: question.id, selectedOption, isCorrect };
      });

      const listeningTotal = correctQuestions.filter(({ question }) => [1, 2, 3, 4].includes(question.partNumber)).length;
      const readingTotal = correctQuestions.length - listeningTotal;
      const { listeningScore, readingScore, totalScore } = calculateSectionScores(
        listeningCorrect,
        listeningTotal,
        readingCorrect,
        readingTotal,
      );

      await prisma.$transaction([
        ...answerRows.map((answer) => prisma.attemptAnswer.upsert({
          where: { attemptId_questionId: { attemptId, questionId: answer.questionId } },
          update: { selectedOption: answer.selectedOption, isCorrect: answer.isCorrect },
          create: answer,
        })),
        prisma.testAttempt.update({
          where: { id: attemptId },
          data: {
            status: AttemptStatus.SUBMITTED,
            submittedAt: new Date(),
            timeRemaining: Math.max(0, serverRemaining),
            cheatWarningCount: mergedCheat,
            listeningScore,
            readingScore,
            totalScore,
            skillAnalytics: partAnalytics,
          }
        }),
      ]);

      res.status(200).json({ 
        success: true, 
        message: isLate ? 'Nộp bài thành công (muộn trong thời gian ân hạn)' : 'Nộp bài thành công',
        data: {
          listeningCorrect, readingCorrect, listeningScore, readingScore, totalScore,
          cheatCount: mergedCheat,
          cheatFlagged: mergedCheat >= CHEAT_FLAG_THRESHOLD,
          isLate,
          serverRemaining: Math.max(0, serverRemaining),
        }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getAttemptReview: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const attemptId = req.params.attemptId as string;
      const userId = req.user?.id;

      const attempt = await prisma.testAttempt.findUnique({
        where: { id: attemptId }
      });

      if (!attempt) {
        res.status(404).json({ success: false, message: 'Không tìm thấy lượt làm bài' });
        return;
      }

      if (attempt.userId !== userId && req.user?.role !== 'ADMIN') {
        res.status(403).json({ success: false, message: 'Bạn không có quyền xem bài làm này' });
        return;
      }

      if (attempt.status !== 'SUBMITTED') {
        res.status(403).json({ success: false, message: 'Chưa nộp bài không được xem giải thích!' });
        return;
      }

      const attemptAnswers = await prisma.attemptAnswer.findMany({
        where: { attemptId: attemptId },
        include: {
          question: {
            include: {
              group: true,
              vocabLinks: { include: { word: { select: { id: true, word: true, meaning: true, example: true } } } },
            }
          }
        }
      });

      const reviewData = {
        listeningScore: attempt.listeningScore,
        readingScore: attempt.readingScore,
        totalScore: attempt.totalScore,
        cheatCount: attempt.cheatWarningCount,
        details: attemptAnswers.map(ans => {
          const q = ans.question;
          const isCorrect = ans.selectedOption === q.correctAnswer;
          return {
            questionId: q.id,
            questionText: q.questionText,
            options: q.options,
            selectedOption: ans.selectedOption,
            correctAnswer: q.correctAnswer,
            isCorrect: isCorrect,
            explanation: q.explanation,
            partNumber: q.partNumber,
            audioUrl: q.group?.audioUrl,
            passageText: q.group?.passageText,
            imageUrl: q.group?.imageUrl,
            vocabWords: (q.vocabLinks || []).map((link: any) => link.word),
          };
        })
      };

      res.status(200).json({ success: true, data: reviewData });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getMyHistory: async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { status, from, to, minScore, maxScore } = req.query;
      const where: Prisma.TestAttemptWhereInput = { userId };
      if (status === 'IN_PROGRESS' || status === 'SUBMITTED' || status === 'ABANDONED') {
        where.status = status;
      }
      if (minScore || maxScore) {
        const scoreFilter: Prisma.IntNullableFilter = {};
        if (minScore) scoreFilter.gte = Number(minScore);
        if (maxScore) scoreFilter.lte = Number(maxScore);
        where.totalScore = scoreFilter;
      }
      if (from || to) {
        const dateFilter: Prisma.DateTimeFilter = {};
        if (from) dateFilter.gte = new Date(String(from));
        if (to) {
          const end = new Date(String(to));
          end.setHours(23, 59, 59, 999);
          dateFilter.lte = end;
        }
        where.startedAt = dateFilter;
      }

      const attempts = await prisma.testAttempt.findMany({
        where,
        include: {
          test: {
            select: { title: true, duration: true }
          }
        },
        orderBy: { startedAt: 'desc' }
      });

      const now = new Date();
      const staleAttempts = attempts.filter(
        (attempt) =>
          attempt.status === AttemptStatus.IN_PROGRESS &&
          attempt.test?.duration &&
          serverTimeRemaining(resolveDeadline(attempt, attempt.test.duration * 60), now) <= 0,
      );
      if (staleAttempts.length) {
        await prisma.testAttempt.updateMany({ where: { id: { in: staleAttempts.map((attempt) => attempt.id) } }, data: { status: AttemptStatus.ABANDONED, timeRemaining: 0 } });
        staleAttempts.forEach((attempt) => { attempt.status = AttemptStatus.ABANDONED; });
      }

      res.status(200).json({ success: true, data: { attempts } });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};