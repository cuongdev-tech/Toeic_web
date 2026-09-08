import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import XLSX from 'xlsx';

export const AdminTestController = {
  // 1. Lấy chi tiết đề thi và danh sách các nhóm câu hỏi
  getTestDetails: async (req: Request, res: Response): Promise<void> => {
    try {
      const testId = String(req.params.testId);

      const test = await prisma.test.findUnique({
        where: { id: testId as string },
      });

      if (!test) {
        res.status(404).json({ success: false, message: 'Không tìm thấy đề thi.' });
        return;
      }

const vocabInclude = {
  include: { word: { select: { id: true, word: true, meaning: true, topicId: true } } },
} as const;

const groups = await prisma.questionGroup.findMany({
  where: { testId: testId as string } as any,
  include: {
    questions: { include: { vocabLinks: vocabInclude } },
  },
  orderBy: { createdAt: 'asc' }
});

// Danh sách câu hỏi theo đúng thứ tự đề (kể cả câu rời không thuộc group nào —
// loại Part 1/2/5 tạo từ trang AdminTests mà groups không bao phủ).
const orderedLinks = await prisma.testQuestion.findMany({
  where: { testId: testId as string },
  include: { question: { include: { vocabLinks: vocabInclude } } },
  orderBy: { orderIndex: 'asc' },
});

      res.status(200).json({
        success: true,
        data: {
          test,
          groups,
          questions: orderedLinks.map((link) => ({ orderIndex: link.orderIndex, ...link.question })),
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // 2. Tạo mới Cụm câu hỏi (Question Group - Part 3, 4, 6, 7)
  createQuestionGroup: async (req: Request, res: Response): Promise<void> => {
    try {
      const { testId, partNumber, title, passageText, audioUrl, imageUrl, transcript } = req.body;

      if (!testId || !partNumber) {
        res.status(400).json({ success: false, message: 'Thiếu thông tin testId hoặc partNumber.' });
        return;
      }

      const newGroup = await prisma.questionGroup.create({
        data: {
          test: { connect: { id: String(testId) } },
          title: typeof title === 'string' && title.trim() ? title.trim() : null,
          partNumber: Number(partNumber),
          passageText: passageText || null,
          audioUrl: audioUrl || null,
          imageUrl: imageUrl || null,
          transcript: transcript || [] // Lưu mảng JSON transcript đồng bộ âm thanh
        }
      });

      res.status(201).json({ success: true, message: 'Tạo cụm câu hỏi thành công.', data: { group: newGroup } });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // 3. Thêm câu hỏi chi tiết vào cụm câu hỏi
  createQuestion: async (req: Request, res: Response): Promise<void> => {
    try {
      const { groupId, partNumber, questionText, options, correctAnswer, explanation, difficulty, tags } = req.body;

      if (!groupId || !questionText || !options || !correctAnswer) {
        res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin câu hỏi.' });
        return;
      }

      const group = await prisma.questionGroup.findUnique({
        where: { id: String(groupId) },
        select: { id: true, testId: true },
      });
      if (!group) {
        res.status(404).json({ success: false, message: 'Không tìm thấy nhóm câu hỏi.' });
        return;
      }

      const newQuestion = await prisma.question.create({
        data: {
          groupId: String(groupId),
          partNumber: Number(partNumber),
          questionText,
          options, // Prisma tự động lưu mảng chuỗi options dưới dạng JSON
          correctAnswer,
          explanation: explanation || null,
          difficulty: difficulty || 'MEDIUM',
          tags: Array.isArray(tags) ? tags : [],
        }
      });

      const lastQuestion = await prisma.testQuestion.findFirst({
        where: { testId: group.testId || '' },
        orderBy: { orderIndex: 'desc' },
        select: { orderIndex: true },
      });
      if (group.testId) {
        await prisma.testQuestion.create({
          data: { testId: group.testId, questionId: newQuestion.id, orderIndex: (lastQuestion?.orderIndex || 0) + 1 },
        });
      }

      res.status(201).json({ success: true, message: 'Thêm câu hỏi thành công.', data: { question: newQuestion } });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  ,

  reorderQuestions: async (req: Request, res: Response): Promise<void> => {
    try {
      const testId = String(req.params.testId);
      const questionIds = req.body.questionIds;
      if (!Array.isArray(questionIds) || questionIds.length === 0) {
        res.status(400).json({ success: false, message: 'questionIds phải là mảng không rỗng.' });
        return;
      }

      const links = await prisma.testQuestion.findMany({ where: { testId }, select: { questionId: true } });
      const allowedIds = new Set(links.map((link) => link.questionId));
      if (questionIds.some((id: unknown) => typeof id !== 'string' || !allowedIds.has(id)) || questionIds.length !== allowedIds.size || new Set(questionIds).size !== questionIds.length) {
        res.status(400).json({ success: false, message: 'Danh sách câu hỏi không thuộc đề hoặc bị trùng.' });
        return;
      }

      await prisma.$transaction(questionIds.map((questionId: string, index: number) => prisma.testQuestion.update({
        where: { testId_questionId: { testId, questionId } },
        data: { orderIndex: index + 1 },
      })));
      res.json({ success: true, message: 'Đã cập nhật thứ tự câu hỏi.' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Không thể sắp xếp câu hỏi.' });
    }
  },

  // 4. Gỡ câu hỏi khỏi đề (giữ lại trong kho Question Bank, chỉ xóa link + dồn thứ tự)
  removeQuestionFromTest: async (req: Request, res: Response): Promise<void> => {
    try {
      const testId = String(req.params.testId);
      const questionId = String(req.params.questionId);
      const link = await prisma.testQuestion.findUnique({
        where: { testId_questionId: { testId, questionId } },
      });
      if (!link) {
        res.status(404).json({ success: false, message: 'Câu hỏi không thuộc đề thi này.' });
        return;
      }
      await prisma.$transaction(async (tx) => {
        await tx.testQuestion.delete({ where: { testId_questionId: { testId, questionId } } });
        const remaining = await tx.testQuestion.findMany({
          where: { testId },
          orderBy: { orderIndex: 'asc' },
          select: { questionId: true },
        });
        await Promise.all(remaining.map((row, index) => tx.testQuestion.update({
          where: { testId_questionId: { testId, questionId: row.questionId } },
          data: { orderIndex: index + 1 },
        })));
      });
      await prisma.auditLog.create({
        data: { actorId: (req as any).user?.id ?? '', action: 'TEST_QUESTION_REMOVED', entity: 'TestQuestion', entityId: `${testId}:${questionId}`, metadata: { testId, questionId } },
      }).catch(() => undefined);
      res.json({ success: true, message: 'Đã gỡ câu hỏi khỏi đề thi (vẫn giữ trong kho).' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Không thể gỡ câu hỏi khỏi đề.' });
    }
  },

  // 5. Phân tích độ khó từng câu trong đề: tỷ lệ đúng + phân bố đáp án A/B/C/D.
  // Chỉ tính lượt đã nộp (SUBMITTED) để đáp án nháp không làm lệch số liệu.
  getQuestionStats: async (req: Request, res: Response): Promise<void> => {
    try {
      const testId = String(req.params.testId);
      const test = await prisma.test.findUnique({ where: { id: testId }, select: { id: true, title: true } });
      if (!test) {
        res.status(404).json({ success: false, message: 'Không tìm thấy đề thi.' });
        return;
      }

      const [links, answers, submittedCount] = await Promise.all([
        prisma.testQuestion.findMany({
          where: { testId },
          include: {
            question: {
              select: { id: true, questionText: true, partNumber: true, correctAnswer: true, difficulty: true },
            },
          },
          orderBy: { orderIndex: 'asc' },
        }),
        prisma.attemptAnswer.findMany({
          where: { attempt: { testId, status: 'SUBMITTED' } },
          select: { questionId: true, selectedOption: true, isCorrect: true },
        }),
        prisma.testAttempt.count({ where: { testId, status: 'SUBMITTED' } }),
      ]);

      const byQuestion = new Map<string, { answered: number; correct: number; dist: Record<string, number> }>();
      for (const ans of answers) {
        let entry = byQuestion.get(ans.questionId);
        if (!entry) {
          entry = { answered: 0, correct: 0, dist: { A: 0, B: 0, C: 0, D: 0, blank: 0 } };
          byQuestion.set(ans.questionId, entry);
        }
        if (ans.selectedOption) {
          entry.answered += 1;
          const key = ['A', 'B', 'C', 'D'].includes(ans.selectedOption) ? ans.selectedOption : 'blank';
          entry.dist[key] += 1;
        } else {
          entry.dist.blank += 1;
        }
        if (ans.isCorrect) entry.correct += 1;
      }

      const stats = links.map((link) => {
        const entry = byQuestion.get(link.questionId) ?? { answered: 0, correct: 0, dist: { A: 0, B: 0, C: 0, D: 0, blank: 0 } };
        return {
          questionId: link.questionId,
          orderIndex: link.orderIndex,
          questionText: link.question.questionText,
          partNumber: link.question.partNumber,
          correctAnswer: link.question.correctAnswer,
          difficulty: link.question.difficulty,
          answered: entry.answered,
          correct: entry.correct,
          accuracy: entry.answered ? Math.round((entry.correct / entry.answered) * 100) : null,
          dist: entry.dist,
        };
      });

      const answeredStats = stats.filter((s) => s.answered > 0);
      res.json({
        success: true,
        data: {
          test,
          submittedCount,
          summary: {
            questions: stats.length,
            answeredQuestions: answeredStats.length,
            avgAccuracy: answeredStats.length
              ? Math.round(answeredStats.reduce((sum, s) => sum + (s.accuracy ?? 0), 0) / answeredStats.length)
              : null,
            hardest: [...answeredStats].sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0)).slice(0, 3),
            easiest: [...answeredStats].sort((a, b) => (b.accuracy ?? 100) - (a.accuracy ?? 100)).slice(0, 3),
          },
          stats,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Không thể tải phân tích câu hỏi.' });
    }
  },

  importQuestionsFromExcel: async (req: Request, res: Response): Promise<void> => {
    try {
      const testId = String(req.params.testId);
      const test = await prisma.test.findUnique({ where: { id: testId } });
      const file = req.file;
      if (!test || !file) { res.status(400).json({ success: false, message: 'Thiếu đề thi hoặc file Excel.' }); return; }
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[workbook.SheetNames[0]]);
      const ALLOWED_DIFFICULTY = new Set(['EASY', 'MEDIUM', 'HARD']);
      let imported = 0;
      for (const row of rows) {
        const questionText = String(row.questionText || '').trim();
        const correctAnswer = String(row.correctAnswer || '').trim().toUpperCase();
        if (!questionText || !['A', 'B', 'C', 'D'].includes(correctAnswer)) continue;
        // Chuẩn hóa options về dạng mảng chuỗi "A. ...", "B. ..." để FE render đồng nhất
        const rawOptions = [row.optionA, row.optionB, row.optionC, row.optionD];
        const letters = ['A', 'B', 'C', 'D'];
        const options = rawOptions.map((opt, idx) => {
          const text = String(opt ?? '').trim().replace(/^[A-D][\.\):\-]\s*/, '');
          return `${letters[idx]}. ${text}`;
        });
        if (options.some((opt) => opt.length <= 3)) continue;
        const difficulty = ALLOWED_DIFFICULTY.has(String(row.difficulty)) ? String(row.difficulty) as 'EASY' | 'MEDIUM' | 'HARD' : 'MEDIUM';
        await prisma.$transaction(async (tx) => {
          const question = await tx.question.create({ data: { questionText, partNumber: Number(row.partNumber) || 1, options, correctAnswer, explanation: row.explanation ? String(row.explanation) : null, difficulty, tags: String(row.tags || '').split('|').map((tag) => tag.trim()).filter(Boolean), groupId: row.groupId ? String(row.groupId) : null } });
          const last = await tx.testQuestion.findFirst({ where: { testId }, orderBy: { orderIndex: 'desc' }, select: { orderIndex: true } });
          await tx.testQuestion.create({ data: { testId, questionId: question.id, orderIndex: (last?.orderIndex || 0) + 1 } });
        });
        imported += 1;
      }
      res.status(201).json({ success: true, data: { imported } });
    } catch {
      res.status(400).json({ success: false, message: 'File Excel không hợp lệ.' });
    }
  }
};