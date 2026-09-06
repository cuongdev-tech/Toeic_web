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
      const updatedQuestion = await prisma.question.update({
        where: { id: req.params.id as string },
        data: req.body,
      });
      return res.status(200).json({ success: true, message: 'Cập nhật thành công', data: updatedQuestion });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  deleteQuestion: async (req: Request, res: Response) => {
    try {
      await prisma.question.delete({ where: { id: req.params.id as string } });
      return res.status(200).json({ success: true, message: 'Xóa câu hỏi thành công' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
};