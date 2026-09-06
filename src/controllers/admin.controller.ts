import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { Role } from '@prisma/client';

export const createTest = async (req: Request, res: Response) => {
  try {
    const { title, description, duration } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: 'Tiêu đề đề thi là bắt buộc' });
    }

    const test = await prisma.test.create({
      data: {
        title,
        description: description || '',
        duration: Number(duration) || 120,
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Tạo đề thi thành công',
      data: { test }
    });
  } catch (error: any) {
    console.error('Lỗi tạo đề thi:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const addQuestionToTest = async (req: Request, res: Response) => {
  try {
    const testId = String(req.params.testId);
    const { groupId, partNumber, questionText, options, correctAnswer, explanation, difficulty, tags } = req.body;

    const test = await prisma.test.findUnique({ where: { id: testId } });
    if (!test) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đề thi' });
    }

    if (!questionText || !correctAnswer || !Array.isArray(options)) {
      return res.status(400).json({ success: false, message: 'Thiếu nội dung, đáp án hoặc lựa chọn câu hỏi' });
    }

    if (groupId) {
      const group = await prisma.questionGroup.findFirst({ where: { id: String(groupId), testId } });
      if (!group) return res.status(400).json({ success: false, message: 'Question Group không thuộc đề thi này' });
    }

    const question = await prisma.$transaction(async (tx) => {
      const createdQuestion = await tx.question.create({
        data: {
          groupId: groupId ? String(groupId) : null,
          partNumber: Number(partNumber) || 1,
          questionText,
          options,
          correctAnswer,
          explanation: explanation || null,
          difficulty: difficulty || 'MEDIUM',
          tags: Array.isArray(tags) ? tags : [],
        }
      });

      const lastQuestion = await tx.testQuestion.findFirst({
        where: { testId },
        orderBy: { orderIndex: 'desc' },
        select: { orderIndex: true },
      });
      await tx.testQuestion.create({
        data: {
          testId,
          questionId: createdQuestion.id,
          orderIndex: (lastQuestion?.orderIndex || 0) + 1,
        },
      });
      return createdQuestion;
    });

    return res.status(201).json({
      success: true,
      message: 'Thêm câu hỏi thành công',
      data: { question }
    });
  } catch (error: any) {
    console.error('Lỗi thêm câu hỏi:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAdminStats = async (req: Request, res: Response) => {
  try {
    const [totalStudents, activeStudents, totalTests, totalAttempts, submittedAttempts, scoreAggregate, allAttempts, wrongAnswers] = await Promise.all([
      prisma.user.count({
        where: { role: Role.STUDENT },
      }),
      prisma.user.count({ where: { role: Role.STUDENT, isActive: true } }),
      prisma.test.count(),
      prisma.testAttempt.count(),
      prisma.testAttempt.count({ where: { status: 'SUBMITTED' } }),
      prisma.testAttempt.aggregate({ where: { status: 'SUBMITTED' }, _avg: { totalScore: true } }),
      prisma.testAttempt.findMany({
        select: {
          startedAt: true,
        },
      }),
      prisma.attemptAnswer.groupBy({
        by: ['questionId'],
        where: { isCorrect: false },
        _count: { questionId: true },
        orderBy: { _count: { questionId: 'desc' } },
        take: 5,
      }),
    ]);

    const wrongQuestionIds = wrongAnswers.map((item) => item.questionId);
    const wrongQuestions = await prisma.question.findMany({ where: { id: { in: wrongQuestionIds } }, select: { id: true, questionText: true, partNumber: true } });
    const wrongQuestionMap = new Map(wrongQuestions.map((question) => [question.id, question]));

    // Tạo template 7 ngày gần nhất (YYYY-MM-DD)
    const last7DaysTemplate = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });

    // Lọc và đếm số lượt thi trong 7 ngày qua bằng JavaScript thuần (tránh lỗi SQL dialect)
    const chartData = last7DaysTemplate.map((dateStr) => {
      const count = allAttempts.filter((att) => {
        if (!att.startedAt) return false;
        const attDate = new Date(att.startedAt).toISOString().split('T')[0];
        return attDate === dateStr;
      }).length;

      return {
        date: dateStr,
        count,
      };
    });

    return res.status(200).json({
      success: true,
      message: 'Lấy dữ liệu thống kê Admin thành công',
      data: {
        overview: {
          totalStudents,
          totalTests,
          totalAttempts,
          activeStudents,
          completionRate: totalAttempts ? Math.round((submittedAttempts / totalAttempts) * 100) : 0,
          averageScore: Math.round(scoreAggregate._avg.totalScore || 0),
        },
        chartData: {
          last7DaysAttempts: chartData,
        },
        mostMissedQuestions: wrongAnswers.map((item) => ({ ...wrongQuestionMap.get(item.questionId), wrongCount: item._count.questionId })),
      },
    });
  } catch (error: any) {
    console.error('[Admin Dashboard Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server khi tính toán số liệu thống kê Admin.',
      error: error.message,
    });
  }
};

export const getAdminTests = async (_req: Request, res: Response) => {
  try {
    const tests = await prisma.test.findMany({ orderBy: { createdAt: 'desc' } });
    return res.status(200).json({ success: true, data: tests });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTestStatus = async (req: Request, res: Response) => {
  try {
    const status = req.body.status;
    if (status !== 'DRAFT' && status !== 'PUBLISHED') {
      return res.status(400).json({ success: false, message: 'Trạng thái đề thi không hợp lệ.' });
    }
    const test = await prisma.test.update({ where: { id: String(req.params.testId) }, data: { status } });
    await prisma.auditLog.create({ data: { actorId: req.user!.id, action: `TEST_${status}`, entity: 'Test', entityId: test.id, metadata: { status } } });
    return res.json({ success: true, data: { test } });
  } catch (error: any) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy đề thi.' });
  }
};

export const getUsers = async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: Role.STUDENT },
      select: { id: true, email: true, fullName: true, isActive: true, createdAt: true, _count: { select: { testAttempts: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: { users } });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Không thể tải danh sách học viên.' });
  }
};

export const updateUserStatus = async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.update({ where: { id: String(req.params.userId) }, data: { isActive: Boolean(req.body.isActive) }, select: { id: true, isActive: true } });
    await prisma.auditLog.create({ data: { actorId: req.user!.id, action: user.isActive ? 'USER_UNBLOCKED' : 'USER_BLOCKED', entity: 'User', entityId: user.id, metadata: { isActive: user.isActive } } });
    return res.json({ success: true, data: { user } });
  } catch (error: any) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy học viên.' });
  }
};

export const getAuditLogs = async (_req: Request, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({ include: { actor: { select: { email: true, fullName: true } } }, orderBy: { createdAt: 'desc' }, take: 100 });
    return res.json({ success: true, data: { logs } });
  } catch {
    return res.status(500).json({ success: false, message: 'Không thể tải audit log.' });
  }
};