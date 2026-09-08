import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export const QuestionController = {
  // 1. Tạo câu hỏi mới
  createQuestion: async (req: Request, res: Response) => {
    try {
      const { groupId, partNumber, questionText, options, correctAnswer, explanation, difficulty, tags } = req.body;

      // Validate JSON options (Đảm bảo định dạng chuẩn cho Frontend render)
      if (!options || !Array.isArray(options) || options.length < 3) {
        return res.status(400).json({ success: false, message: 'options phải là mảng JSON hợp lệ chứa ít nhất 3 đáp án.' });
      }

      const newQuestion = await prisma.question.create({
        data: {
          groupId: groupId || null, // null nếu là câu hỏi độc lập (Part 1, 2, 5)
          partNumber: Number(partNumber) || 1,
          questionText,
          options, // Ví dụ: [{"id":"A", "text":"Cat"}, {"id":"B", "text":"Dog"}]
          correctAnswer,
          explanation,
          difficulty: difficulty || 'MEDIUM',
          tags: Array.isArray(tags) ? tags : [],
        },
      });

      return res.status(201).json({ success: true, message: 'Tạo câu hỏi thành công', data: newQuestion });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // 2. Đọc danh sách câu hỏi (Kèm phân trang & filter)
  getAllQuestions: async (req: Request, res: Response) => {
    try {
      const { difficulty, groupId, page = 1, limit = 20 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {};
      if (difficulty) where.difficulty = difficulty;
      if (groupId) where.groupId = groupId;

      const [questions, total] = await Promise.all([
        prisma.question.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
        }),
        prisma.question.count({ where }),
      ]);

      return res.status(200).json({
        success: true,
        data: questions,
        meta: { total, page: Number(page), limit: Number(limit) },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // 3. API ĐẶC BIỆT: Lấy câu hỏi ngẫu nhiên (Phục vụ việc Auto-generate Đề thi)
  getRandomQuestions: async (req: Request, res: Response) => {
    try {
      const { limit = 10, difficulty } = req.query;
      const takeLimit = Number(limit);

      // Cách Senior: Sử dụng PostgreSQL Raw Query với RANDOM() để tối ưu tốc độ cho database lớn.
      // Tránh việc load hàng triệu records lên Prisma rồi mới shuffle.
      
      let randomQuestions;

      if (difficulty) {
        // Query có filter độ khó
        randomQuestions = await prisma.$queryRaw`
          SELECT * FROM "questions" 
          WHERE "difficulty" = ${difficulty}::"Difficulty" 
          ORDER BY RANDOM() 
          LIMIT ${takeLimit};
        `;
      } else {
        // Query ngẫu nhiên toàn kho
        randomQuestions = await prisma.$queryRaw`
          SELECT * FROM "questions" 
          ORDER BY RANDOM() 
          LIMIT ${takeLimit};
        `;
      }

      return res.status(200).json({
        success: true,
        message: `Đã bốc ngẫu nhiên ${takeLimit} câu hỏi`,
        data: randomQuestions,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // 4 & 5. Cập nhật và Xóa (Giữ nguyên cấu trúc chuẩn)
  updateQuestion: async (req: Request, res: Response) => {
    try {
      const { questionText, options, correctAnswer, explanation, difficulty, tags, partNumber, groupId } = req.body;
      const data: Record<string, unknown> = {};
      if (questionText !== undefined) data.questionText = questionText;
      if (options !== undefined) {
        if (!Array.isArray(options) || options.length < 2) {
          return res.status(400).json({ success: false, message: 'options phải là mảng chứa ít nhất 2 đáp án.' });
        }
        data.options = options;
      }
      if (correctAnswer !== undefined) {
        if (!['A', 'B', 'C', 'D'].includes(String(correctAnswer))) {
          return res.status(400).json({ success: false, message: 'correctAnswer phải là A, B, C hoặc D.' });
        }
        data.correctAnswer = String(correctAnswer);
      }
      if (explanation !== undefined) data.explanation = explanation || null;
      if (difficulty !== undefined) {
        if (!['EASY', 'MEDIUM', 'HARD'].includes(String(difficulty))) {
          return res.status(400).json({ success: false, message: 'difficulty không hợp lệ.' });
        }
        data.difficulty = difficulty;
      }
      if (tags !== undefined) data.tags = Array.isArray(tags) ? tags : [];
      if (partNumber !== undefined) data.partNumber = Number(partNumber) || 1;
      if (groupId !== undefined) data.groupId = groupId ? String(groupId) : null;
      const updatedQuestion = await prisma.question.update({
        where: { id: req.params.id as string },
        data: data as any,
      });
      return res.status(200).json({ success: true, message: 'Cập nhật thành công', data: updatedQuestion });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  deleteQuestion: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      // Xóa câu hỏi sẽ cascade sang TestQuestion + AttemptAnswer (làm thay đổi
      // lịch sử bài thi cũ), nên chặn khi câu đã có lượt trả lời — trừ khi force.
      const [answerCount, linkCount] = await Promise.all([
        prisma.attemptAnswer.count({ where: { questionId: id } }),
        prisma.testQuestion.count({ where: { questionId: id } }),
      ]);
      if (answerCount > 0 && req.query.force !== 'true') {
        return res.status(409).json({
          success: false,
          message: `Câu hỏi đã có ${answerCount} lượt trả lời trong lịch sử thi. Xóa sẽ làm thay đổi kết quả cũ.`,
          data: { answerCount, linkCount, forceHint: 'Thêm ?force=true để xóa buộc.' },
        });
      }
      await prisma.question.delete({ where: { id } });
      await prisma.auditLog.create({
        data: {
          actorId: req.user!.id,
          action: req.query.force === 'true' ? 'QUESTION_FORCE_DELETED' : 'QUESTION_DELETED',
          entity: 'Question',
          entityId: id,
          metadata: { answerCount, linkCount },
        },
      }).catch(() => undefined);
      return res.status(200).json({ success: true, message: 'Xóa câu hỏi thành công' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // 6 & 7. Gắn / gỡ từ vựng (kho chung) vào câu hỏi để gợi ý khi review.
  attachWord: async (req: Request, res: Response) => {
    try {
      const questionId = req.params.id as string;
      const wordId = String(req.body.wordId || '');
      if (!wordId) {
        return res.status(400).json({ success: false, message: 'Thiếu wordId.' });
      }
      const [question, word] = await Promise.all([
        prisma.question.findUnique({ where: { id: questionId }, select: { id: true } }),
        prisma.topicWord.findUnique({ where: { id: wordId }, select: { id: true } }),
      ]);
      if (!question) return res.status(404).json({ success: false, message: 'Không tìm thấy câu hỏi.' });
      if (!word) return res.status(404).json({ success: false, message: 'Không tìm thấy từ vựng.' });
      try {
        await prisma.questionWord.create({ data: { questionId, wordId } });
      } catch (e: any) {
        // P2002 = đã gắn rồi → coi như thành công idempotent.
        if (e?.code !== 'P2002') throw e;
      }
      return res.status(201).json({ success: true, message: 'Đã gắn từ vào câu hỏi.' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  detachWord: async (req: Request, res: Response) => {
    try {
      await prisma.questionWord.deleteMany({
        where: { questionId: req.params.id as string, wordId: String(req.params.wordId) },
      });
      return res.status(200).json({ success: true, message: 'Đã gỡ từ khỏi câu hỏi.' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
};