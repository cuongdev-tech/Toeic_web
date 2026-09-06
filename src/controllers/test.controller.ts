import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

export class TestController {
  // 1. Lấy danh sách đề thi
  static async getAllTests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tests = await prisma.test.findMany({
        where: { status: 'PUBLISHED' },
        select: { id: true, title: true, description: true, duration: true },
        orderBy: { createdAt: 'desc' }
      });
      
      res.status(200).json({ status: 'success', data: { tests } });
    } catch (error) { 
      next(error); 
    }
  }

  // 2. Lấy chi tiết đề thi & Câu hỏi
  static async getTestById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Đã thêm ép kiểu (as string) triệt để tránh lỗi TypeScript
      const testId = req.params.id as string;

      const test = await prisma.test.findUnique({
        where: { id: testId, status: 'PUBLISHED' },
        include: {
          questions: { 
            orderBy: { orderIndex: 'asc' }, 
            include: {
              question: { 
                select: {
                  id: true,
                  questionText: true,
                  options: true,
                  groupId: true,
                  // Tuyệt đối KHÔNG select correctAnswer
                  group: true 
                }
              }
            }
          }
        }
      });

      if (!test) { 
        res.status(404).json({ status: 'error', message: 'Không tìm thấy đề thi.' }); 
        return; 
      }

      // Format lại data cho Frontend dễ dùng
      const formattedTest = {
        id: test.id,
        title: test.title,
        description: test.description,
        duration: test.duration,
        questions: test.questions.map((tq: any) => tq.question)
      };

      res.status(200).json({ status: 'success', data: { test: formattedTest } });
    } catch (error) { 
      next(error); 
    }
  }
}