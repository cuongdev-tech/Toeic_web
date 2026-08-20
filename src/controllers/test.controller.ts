import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

export class TestController {
  static async getAllTests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tests = await prisma.test.findMany({
        select: { id: true, title: true, description: true, duration: true },
      });
      res.status(200).json({ status: 'success', data: { tests } });
    } catch (error) { next(error); }
  }

  static async getTestById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const test = await prisma.test.findUnique({
        where: { id },
        include: {
          questions: {
            select: {
              id: true, testId: true, partNumber: true, groupText: true,
              audioUrl: true, imageUrl: true, questionText: true, options: true,
            },
            orderBy: { partNumber: 'asc' },
          },
        },
      });

      if (!test) { res.status(404).json({ status: 'error', message: 'Không tìm thấy đề thi.' }); return; }
      res.status(200).json({ status: 'success', data: { test } });
    } catch (error) { next(error); }
  }

  static async submitTest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const testId = req.params.id;
      const { userAnswers } = req.body;
      const userId = req.user?.id; // Đã sửa thành .id

      if (!userId) { res.status(401).json({ status: 'error', message: 'Unauthorized' }); return; }
      if (!Array.isArray(userAnswers)) { res.status(400).json({ status: 'error', message: 'userAnswers phải là mảng.' }); return; }

      const questions = await prisma.question.findMany({
        where: { testId },
        select: { id: true, correctAnswer: true, partNumber: true },
      });

      if (questions.length === 0) { res.status(404).json({ status: 'error', message: 'Đề thi trống.' }); return; }

      const questionMap = new Map(questions.map((q: any) => [q.id, q]));
      let correctListening = 0, correctReading = 0;

const processedAnswers = userAnswers.map((answer: { questionId: string; selectedAnswer: string }) => {
      const questionRecord: any = questionMap.get(answer.questionId);
      if (!questionRecord) throw new Error(`Câu hỏi ${answer.questionId} không hợp lệ.`);

      const isCorrect = questionRecord.correctAnswer === answer.selectedAnswer;
      if (isCorrect) {
        // Thêm dòng này để TypeScript biết chắc chắn đây là 1 con số (nếu null thì cho = 0)
        const part = questionRecord.partNumber || 0;
        
        if (part >= 1 && part <= 4) correctListening++;
        else if (part >= 5 && part <= 7) correctReading++;
      }
      return { questionId: answer.questionId, selectedAnswer: answer.selectedAnswer, isCorrect };
    });

      const listeningScore = Math.min(correctListening * 5, 495);
      const readingScore = Math.min(correctReading * 5, 495);
      const totalScore = listeningScore + readingScore;

      const testResult = await prisma.testResult.create({
        data: {
          userId, testId, listeningScore, readingScore, totalScore,
          userAnswers: { create: processedAnswers },
        },
      });

      res.status(201).json({
        status: 'success',
        message: 'Nộp bài thành công!',
        data: { testResultId: testResult.id, scores: { listeningScore, readingScore, totalScore } },
      });
    } catch (error: any) {
      if (error.message.includes('không hợp lệ')) { res.status(400).json({ status: 'error', message: error.message }); return; }
      next(error);
    }
  }
}