import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

export class TestController {
  // 1. Lấy danh sách đề thi (search + lọc đã thi + sort + phân trang + thống kê cá nhân)
  // Query: ?search=&page=1&limit=12&attempted=all|yes|no&sort=newest|title|duration_asc|duration_desc
  static async getAllTests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
      const attempted = typeof req.query.attempted === 'string' ? req.query.attempted : 'all';
      const sort = typeof req.query.sort === 'string' ? req.query.sort : 'newest';
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12));

      const where: any = { status: 'PUBLISHED' };
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Lọc theo trạng thái đã thi (dựa trên lượt SUBMITTED của chính user).
      if (userId && (attempted === 'yes' || attempted === 'no')) {
        const attemptedIds = await prisma.testAttempt.findMany({
          where: { userId, status: 'SUBMITTED' },
          select: { testId: true },
          distinct: ['testId'],
        }).then((rows) => rows.map((row) => row.testId));
        if (attempted === 'yes') {
          if (!attemptedIds.length) {
            res.status(200).json({ status: 'success', success: true, data: { tests: [], pagination: { page, limit, total: 0, totalPages: 0 } } });
            return;
          }
          where.id = { in: attemptedIds };
        } else if (attemptedIds.length) {
          where.id = { notIn: attemptedIds };
        }
      }

      const orderBy: any =
        sort === 'title' ? { title: 'asc' }
        : sort === 'duration_asc' ? { duration: 'asc' }
        : sort === 'duration_desc' ? { duration: 'desc' }
        : { createdAt: 'desc' };

      const total = await prisma.test.count({ where });
      const totalPages = Math.ceil(total / limit);
      const safePage = totalPages ? Math.min(page, totalPages) : 1;

      const tests = await prisma.test.findMany({
        where,
        select: {
          id: true, title: true, description: true, duration: true, createdAt: true,
          _count: { select: { questions: true } },
        },
        orderBy,
        skip: (safePage - 1) * limit,
        take: limit,
      });

      // Thống kê cá nhân cho các đề ở trang hiện tại (2 query, không N+1).
      const statsByTest = new Map<string, { submittedCount: number; bestScore: number; hasInProgress: boolean }>();
      if (userId && tests.length) {
        const ids = tests.map((t) => t.id);
        const [submitted, inProgress] = await Promise.all([
          prisma.testAttempt.findMany({
            where: { userId, testId: { in: ids }, status: 'SUBMITTED' },
            select: { testId: true, totalScore: true },
          }),
          prisma.testAttempt.findMany({
            where: { userId, testId: { in: ids }, status: 'IN_PROGRESS' },
            select: { testId: true },
            distinct: ['testId'],
          }),
        ]);
        for (const row of submitted) {
          const entry = statsByTest.get(row.testId) ?? { submittedCount: 0, bestScore: 0, hasInProgress: false };
          entry.submittedCount += 1;
          if (typeof row.totalScore === 'number') entry.bestScore = Math.max(entry.bestScore, row.totalScore);
          statsByTest.set(row.testId, entry);
        }
        for (const row of inProgress) {
          const entry = statsByTest.get(row.testId) ?? { submittedCount: 0, bestScore: 0, hasInProgress: false };
          entry.hasInProgress = true;
          statsByTest.set(row.testId, entry);
        }
      }

      res.status(200).json({
        status: 'success',
        success: true,
        data: {
          tests: tests.map((t) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            duration: t.duration,
            questionCount: t._count.questions,
            ...(statsByTest.get(t.id) ?? { submittedCount: 0, bestScore: 0, hasInProgress: false }),
          })),
          pagination: { page: safePage, limit, total, totalPages },
        },
      });
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

      res.status(200).json({ status: 'success', success: true, data: { test: formattedTest } });
    } catch (error) { 
      next(error); 
    }
  }

  // 3. Bộ câu luyện theo Part cho học viên (chế độ luyện nhanh, chấm ngay ở client).
  // Random bằng SQL để không load cả kho lên RAM. Trả kèm đáp án + giải thích
  // vì đây là bài luyện (stakes thấp) — đề thi tính giờ vẫn giấu đáp án như cũ.
  // Query: ?part=1..7 (bắt buộc)&limit=10 (1-20)&difficulty=EASY|MEDIUM|HARD
  static async getPracticeSet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const part = Number(req.query.part);
      if (!Number.isInteger(part) || part < 1 || part > 7) {
        res.status(400).json({ status: 'error', success: false, message: 'part phải là số nguyên từ 1 đến 7.' });
        return;
      }
      const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 10));
      const difficulty = typeof req.query.difficulty === 'string' ? req.query.difficulty.toUpperCase() : '';
      if (difficulty && !['EASY', 'MEDIUM', 'HARD'].includes(difficulty)) {
        res.status(400).json({ status: 'error', success: false, message: 'difficulty không hợp lệ.' });
        return;
      }

      const idRows = difficulty
        ? await prisma.$queryRaw<Array<{ id: string }>>`
            SELECT "id" FROM "questions"
            WHERE "partNumber" = ${part} AND "difficulty" = ${difficulty}::"Difficulty"
            ORDER BY RANDOM() LIMIT ${limit};`
        : await prisma.$queryRaw<Array<{ id: string }>>`
            SELECT "id" FROM "questions"
            WHERE "partNumber" = ${part}
            ORDER BY RANDOM() LIMIT ${limit};`;

      if (!idRows.length) {
        res.status(404).json({ status: 'error', success: false, message: `Kho chưa có câu hỏi Part ${part}${difficulty ? ` độ khó ${difficulty}` : ''}.` });
        return;
      }

      const questions = await prisma.question.findMany({
        where: { id: { in: idRows.map((row) => row.id) } },
        select: {
          id: true, questionText: true, options: true, correctAnswer: true,
          explanation: true, partNumber: true, difficulty: true, tags: true, groupId: true,
          group: { select: { audioUrl: true, imageUrl: true, passageText: true } },
        },
      });
      // Giữ đúng thứ tự random của SQL (findMany không bảo toàn thứ tự IN).
      const order = new Map(idRows.map((row, index) => [row.id, index]));
      questions.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

      res.status(200).json({ status: 'success', success: true, data: { partNumber: part, questions } });
    } catch (error) {
      next(error);
    }
  }
}