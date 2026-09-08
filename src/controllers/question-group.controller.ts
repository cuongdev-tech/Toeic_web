import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export const QuestionGroupController = {
  // 1. Tạo mới Group (Ví dụ: 1 bài nghe đoạn hội thoại Part 3)
  createGroup: async (req: Request, res: Response) => {
    try {
      const { title, partNumber, audioUrl, imageUrl, passageText, transcript } = req.body;

      if (!partNumber) {
        return res.status(400).json({ success: false, message: 'partNumber là bắt buộc.' });
      }

      const newGroup = await prisma.questionGroup.create({
        data: {
          title,
          partNumber: Number(partNumber),
          audioUrl,
          imageUrl,
          passageText,
          transcript: transcript ? transcript : null, // JSONB cho Interactive Transcript
        },
      });

      return res.status(201).json({
        success: true,
        message: 'Tạo Question Group thành công',
        data: newGroup,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // 2. Lấy danh sách Group (Có hỗ trợ filter theo Part)
  getAllGroups: async (req: Request, res: Response) => {
    try {
      const { part } = req.query;
      const whereCondition = part ? { partNumber: Number(part) } : {};

      const groups = await prisma.questionGroup.findMany({
        where: whereCondition,
        include: {
          _count: { select: { questions: true } }, // Đếm số câu hỏi con bên trong Group
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json({ success: true, data: groups });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // 3. Lấy chi tiết 1 Group (Kèm toàn bộ câu hỏi bên trong)
  getGroupById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const group = await prisma.questionGroup.findUnique({
        where: { id: id as string },
        include: {
          questions: {
            orderBy: { createdAt: 'asc' }
          }
        },
      });

      if (!group) return res.status(404).json({ success: false, message: 'Không tìm thấy Group.' });

      return res.status(200).json({ success: true, data: group });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // 4. Cập nhật Group
  updateGroup: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { title, partNumber, audioUrl, imageUrl, passageText, transcript, testId } = req.body;
      const data: Record<string, unknown> = {};
      if (title !== undefined) data.title = title || null;
      if (partNumber !== undefined) data.partNumber = Number(partNumber);
      if (audioUrl !== undefined) data.audioUrl = audioUrl || null;
      if (imageUrl !== undefined) data.imageUrl = imageUrl || null;
      if (passageText !== undefined) data.passageText = passageText || null;
      if (transcript !== undefined) {
        if (!Array.isArray(transcript)) {
          return res.status(400).json({ success: false, message: 'transcript phải là mảng.' });
        }
        data.transcript = transcript;
      }
      if (testId !== undefined) data.testId = testId ? String(testId) : null;

      const updatedGroup = await prisma.questionGroup.update({
        where: { id: id as string },
        data: data as any,
      });

      return res.status(200).json({ success: true, message: 'Cập nhật thành công', data: updatedGroup });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // 5. Xóa Group
  deleteGroup: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await prisma.questionGroup.delete({ where: { id: id as string } });
      return res.status(200).json({ success: true, message: 'Xóa Group thành công' });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },
};