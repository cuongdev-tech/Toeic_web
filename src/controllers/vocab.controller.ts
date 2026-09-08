import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

export class VocabController {
  // 1. Lấy danh sách từ vựng (Hỗ trợ Tìm kiếm & Lọc theo cấp độ status)
  static async getVocabs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { 
        res.status(401).json({ status: 'error', message: 'Unauthorized' }); 
        return; 
      }

      const { search, level, due } = req.query;
      const whereClause: any = { userId };

      if (search && typeof search === 'string') {
        whereClause.OR = [
          { word: { contains: search, mode: 'insensitive' } },
          { meaning: { contains: search, mode: 'insensitive' } }
        ];
      }

      if (level !== undefined && level !== '') {
        if (String(level) === '3+') whereClause.status = { gte: 3 };
        else if (String(level) === '3') whereClause.status = { gte: 3 };
        else {
          const parsedLevel = Number(level);
          if (Number.isInteger(parsedLevel) && parsedLevel >= 0) {
            whereClause.status = parsedLevel;
          }
        }
      }

      if (due === 'true') whereClause.nextReviewDate = { lte: new Date() };

      const vocabs = await prisma.vocabulary.findMany({
        where: whereClause,
        orderBy: { nextReviewDate: 'asc' },
      });

      res.status(200).json({ status: 'success', data: { vocabs } });
    } catch (error) { 
      next(error); 
    }
  }

  // 2. Thêm từ vựng cá nhân
  static async addVocab(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id; 
      const { word, meaning } = req.body;

      if (!userId) { 
        res.status(401).json({ status: 'error', message: 'Unauthorized' }); 
        return; 
      }
      if (!word || !meaning) {
        res.status(400).json({ status: 'error', message: 'Thiếu từ vựng hoặc ý nghĩa.' });
        return;
      }
      
      const newVocab = await prisma.vocabulary.create({
        data: { userId, word, meaning, status: 0, nextReviewDate: new Date() },
      });
      res.status(201).json({ status: 'success', data: { vocab: newVocab } });
    } catch (error) { 
      next(error); 
    }
  }

  // 3. Nạp bộ từ vựng mẫu TOEIC phổ biến
  static async seedDefaultVocabs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { 
        res.status(401).json({ status: 'error', message: 'Unauthorized' }); 
        return; 
      }

      const defaultVocabs = [
        { word: 'Contract', meaning: 'Hợp đồng' },
        { word: 'Negotiate', meaning: 'Đàm phán' },
        { word: 'Recruit', meaning: 'Tuyển dụng' },
        { word: 'Invoice', meaning: 'Hóa đơn' },
        { word: 'Schedule', meaning: 'Lịch trình / Lên lịch' },
        { word: 'Client', meaning: 'Khách hàng' },
        { word: 'Budget', meaning: 'Ngân sách' },
        { word: 'Conference', meaning: 'Hội nghị' },
        { word: 'Merger', meaning: 'Sự sáp nhập công ty' },
        { word: 'Performance', meaning: 'Hiệu suất làm việc' }
      ];

      const existingWords = await prisma.vocabulary.findMany({
        where: { userId, word: { in: defaultVocabs.map((item) => item.word) } },
        select: { word: true },
      });
      const existingSet = new Set(existingWords.map((item) => item.word.toLowerCase()));

      const toCreate = defaultVocabs.filter((item) => !existingSet.has(item.word.toLowerCase()));
      if (toCreate.length) {
        await prisma.vocabulary.createMany({
          data: toCreate.map(item => ({
            userId,
            word: item.word,
            meaning: item.meaning,
            status: 0,
            nextReviewDate: new Date()
          })),
        });
      }

      res.status(200).json({ 
        status: 'success', 
        message: 'Đã nạp bộ từ vựng mẫu TOEIC thành công!' 
      });
    } catch (error) { 
      next(error); 
    }
  }

  // 4. Sửa từ vựng (Update)
  static async updateVocab(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { word, meaning } = req.body;

      if (!userId) { 
        res.status(401).json({ status: 'error', message: 'Unauthorized' }); 
        return; 
      }

      const vocab = await prisma.vocabulary.findUnique({ where: { id: String(id) } });
      if (!vocab || vocab.userId !== userId) {
        res.status(404).json({ status: 'error', message: 'Không tìm thấy từ vựng.' });
        return;
      }

      const updatedVocab = await prisma.vocabulary.update({
        where: { id: String(id) },
        data: {
          ...(word && { word }),
          ...(meaning && { meaning }),
        },
      });

      res.status(200).json({ status: 'success', data: { vocab: updatedVocab } });
    } catch (error) { 
      next(error); 
    }
  }

  // 5. Xóa từ vựng (Delete)
  static async deleteVocab(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) { 
        res.status(401).json({ status: 'error', message: 'Unauthorized' }); 
        return; 
      }

      const vocab = await prisma.vocabulary.findUnique({ where: { id: String(id) } });
      if (!vocab || vocab.userId !== userId) {
        res.status(404).json({ status: 'error', message: 'Không tìm thấy từ vựng.' });
        return;
      }

      await prisma.vocabulary.delete({ where: { id: String(id) } });

      res.status(200).json({ status: 'success', message: 'Đã xóa từ vựng thành công.' });
    } catch (error) { 
      next(error); 
    }
  }

  // 6. Ôn tập từ vựng (Spaced Repetition Review)
  static async reviewVocab(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { isRemembered } = req.body;

      if (!userId) { 
        res.status(401).json({ status: 'error', message: 'Unauthorized' }); 
        return; 
      }

      const vocab = await prisma.vocabulary.findUnique({ where: { id: String(id) } });
      if (!vocab || vocab.userId !== userId) {
        res.status(404).json({ status: 'error', message: 'Không tìm thấy từ vựng.' }); 
        return;
      }

      let newStatus = isRemembered ? vocab.status + 1 : 0;
      let daysToAdd = newStatus === 0 ? 1 : Math.pow(2, newStatus);
      
      const nextReviewDate = new Date();
      nextReviewDate.setDate(nextReviewDate.getDate() + daysToAdd);

      const updatedVocab = await prisma.vocabulary.update({
        where: { id: String(id) },
        data: { status: newStatus, nextReviewDate },
      });

      res.status(200).json({ status: 'success', data: { vocab: updatedVocab } });
    } catch (error) { 
      next(error); 
    }
  }
}