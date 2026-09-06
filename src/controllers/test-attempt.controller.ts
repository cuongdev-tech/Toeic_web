import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AttemptStatus } from '@prisma/client';
import { calculateSectionScores } from '../utils/scoring';

export const TestAttemptController = {
  startTest: async (req: Request, res: Response): Promise<void> => {
    try {
      const { testId } = req.body;
      
      const userPayload = (req as any).user;
      const userId = userPayload?.id || userPayload?.userId;

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
      const now = Date.now();
      const expiredAttempts = activeAttempts.filter((item) => now - item.startedAt.getTime() >= item.test.duration * 60 * 1000);
      if (expiredAttempts.length) {
        await prisma.testAttempt.updateMany({
          where: { id: { in: expiredAttempts.map((item) => item.id) } },
          data: { status: AttemptStatus.ABANDONED },
        });
      }
      const existingAttempt = activeAttempts.find((item) => item.testId === String(testId) && !expiredAttempts.some((expired) => expired.id === item.id));

      if (existingAttempt) {
        res.status(200).json({
          success: true,
          data: {
            id: existingAttempt.id,
            timeRemaining: existingAttempt.timeRemaining,
            cheatWarningCount: existingAttempt.cheatWarningCount,
            answers: existingAttempt.answers,
            resumed: true,
          },
        });
        return;
      }

      const attempt = await prisma.testAttempt.create({
        data: {
          test: { connect: { id: testId } },
          user: { connect: { id: userId } },
          timeRemaining: test.duration * 60,
          status: 'IN_PROGRESS'
        }
      });

      res.status(200).json({
        success: true,
        data: { id: attempt.id, timeRemaining: attempt.timeRemaining, cheatWarningCount: 0, answers: [], resumed: false },
      });
    } catch (e: any) {
      console.error('Lỗi startTest:', e);
      res.status(500).json({ success: false, message: e.message });
    }
  },

  syncAttempt: async (req: Request, res: Response): Promise<void> => {
    try {
      const attemptId = req.params.attemptId as string;
      const { timeRemaining, cheatWarningCount, answers } = req.body;
      const userId = (req as any).user?.id;
      const attempt = await prisma.testAttempt.findFirst({ where: { id: attemptId, userId } });
      if (!attempt) { res.status(404).json({ success: false, message: 'Không tìm thấy lượt làm bài' }); return; }
      if (attempt.status !== AttemptStatus.IN_PROGRESS) { res.status(409).json({ success: false, message: 'Lượt làm bài không còn hoạt động' }); return; }

      if (Number(timeRemaining) <= 0) {
        res.status(409).json({ success: false, message: 'Bài thi đã hết giờ', expired: true });
        return;
      }
      
      const ops = [];
      ops.push(prisma.testAttempt.update({
        where: { id: attemptId },
        data: {
          timeRemaining: Math.max(0, Number(timeRemaining) || 0),
          cheatWarningCount: Math.max(attempt.cheatWarningCount, Number(cheatWarningCount) || 0),
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
      res.status(200).json({ success: true, message: 'Synced' });
    } catch (e: any) { 
      res.status(500).json({ success: false, message: e.message }); 
    }
  },

  submitTest: async (req: Request, res: Response): Promise<void> => {
    try {
      const attemptId = req.params.attemptId as string;
      const { answers, cheatCount } = req.body; 

      const attempt = await prisma.testAttempt.findUnique({
        where: { id: attemptId }
      });
      if(!attempt) { res.status(404).json({ success: false, message: 'Không tìm thấy lượt làm bài' }); return; }

      const userId = (req as any).user?.id;
      if (attempt.userId !== userId) { res.status(403).json({ success: false, message: 'Bạn không có quyền nộp lượt làm bài này' }); return; }

      if (attempt.status === 'SUBMITTED') {
        res.status(400).json({ success: false, message: 'Bài thi này đã được nộp trước đó rồi!' });
        return;
      }

      const correctQuestions = await prisma.testQuestion.findMany({
        where: { testId: attempt.testId },
        include: { question: true }
      });

      const submittedAnswers = new Map<string, string | null>(
        Array.isArray(answers) ? answers.map((answer: any) => [String(answer.questionId), answer.selectedOption || null]) : []
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
            cheatWarningCount: Math.max(attempt.cheatWarningCount, Number(cheatCount) || 0),
            listeningScore,
            readingScore,
            totalScore,
            skillAnalytics: partAnalytics,
          }
        }),
      ]);

      res.status(200).json({ 
        success: true, 
        message: 'Nộp bài thành công',
        data: { listeningCorrect, readingCorrect, listeningScore, readingScore, totalScore, cheatCount }
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getAttemptReview: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const attemptId = req.params.attemptId as string;
      const userPayload = (req as any).user;
      const userId = userPayload?.id || userPayload?.userId;

      const attempt = await prisma.testAttempt.findUnique({
        where: { id: attemptId }
      });

      if (!attempt) {
        res.status(404).json({ success: false, message: 'Không tìm thấy lượt làm bài' });
        return;
      }

      if (attempt.userId !== userId) {
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
              group: true
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
            imageUrl: q.group?.imageUrl
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
      const userPayload = (req as any).user;
      const userId = userPayload?.id || userPayload?.userId;

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { status, from, to, minScore, maxScore } = req.query;
      const where: any = { userId };
      if (status === 'IN_PROGRESS' || status === 'SUBMITTED' || status === 'ABANDONED') where.status = status;
      if (minScore || maxScore) {
        where.totalScore = {};
        if (minScore) where.totalScore.gte = Number(minScore);
        if (maxScore) where.totalScore.lte = Number(maxScore);
      }
      if (from || to) {
        where.startedAt = {};
        if (from) where.startedAt.gte = new Date(String(from));
        if (to) {
          const end = new Date(String(to));
          end.setHours(23, 59, 59, 999);
          where.startedAt.lte = end;
        }
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

      const staleAttempts = attempts.filter((attempt) => attempt.status === AttemptStatus.IN_PROGRESS && attempt.test?.duration && Date.now() - attempt.startedAt.getTime() >= attempt.test.duration * 60 * 1000);
      if (staleAttempts.length) {
        await prisma.testAttempt.updateMany({ where: { id: { in: staleAttempts.map((attempt) => attempt.id) } }, data: { status: AttemptStatus.ABANDONED } });
        staleAttempts.forEach((attempt) => { attempt.status = AttemptStatus.ABANDONED; });
      }

      res.status(200).json({ success: true, data: { attempts } });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};