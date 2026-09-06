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

const groups = await prisma.questionGroup.findMany({
  where: { testId: testId as string } as any,
  include: {
    questions: true
  },
  orderBy: { createdAt: 'asc' }
});

      res.status(200).json({ success: true, data: { test, groups } });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  // 2. Tạo mới Cụm câu hỏi (Question Group - Part 3, 4, 6, 7)
  createQuestionGroup: async (req: Request, res: Response): Promise<void> => {
    try {
      const { testId, partNumber, passageText, audioUrl, transcript } = req.body;

      if (!testId || !partNumber) {
        res.status(400).json({ success: false, message: 'Thiếu thông tin testId hoặc partNumber.' });
        return;
      }

      const newGroup = await prisma.questionGroup.create({
        data: {
          test: { connect: { id: String(testId) } },
          partNumber: Number(partNumber),
          passageText: passageText || null,
          audioUrl: audioUrl || null,
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

  importQuestionsFromExcel: async (req: Request, res: Response): Promise<void> => {
    try {
      const testId = String(req.params.testId);
      const test = await prisma.test.findUnique({ where: { id: testId } });
      const file = req.file;
      if (!test || !file) { res.status(400).json({ success: false, message: 'Thiếu đề thi hoặc file Excel.' }); return; }
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[workbook.SheetNames[0]]);
      let imported = 0;
      for (const row of rows) {
        const questionText = String(row.questionText || '').trim();
        const correctAnswer = String(row.correctAnswer || '').trim().toUpperCase();
        if (!questionText || !['A', 'B', 'C', 'D'].includes(correctAnswer)) continue;
        await prisma.$transaction(async (tx) => {
          const question = await tx.question.create({ data: { questionText, partNumber: Number(row.partNumber) || 1, options: [row.optionA, row.optionB, row.optionC, row.optionD].map(String), correctAnswer, explanation: row.explanation ? String(row.explanation) : null, difficulty: row.difficulty === 'EASY' || row.difficulty === 'HARD' ? row.difficulty : 'MEDIUM', tags: String(row.tags || '').split('|').map((tag) => tag.trim()).filter(Boolean), groupId: row.groupId ? String(row.groupId) : null } });
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