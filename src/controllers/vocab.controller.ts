import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

export class VocabController {
  static async getVocabs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id; // Đã sửa
      if (!userId) { res.status(401).json({ status: 'error', message: 'Unauthorized' }); return; }

      const vocabs = await prisma.vocabulary.findMany({
        where: { userId },
        orderBy: { nextReviewDate: 'asc' },
      });
      res.status(200).json({ status: 'success', data: { vocabs } });
    } catch (error) { next(error); }
  }

  static async addVocab(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id; // Đã sửa
      const { word, meaning } = req.body;

      if (!userId) { res.status(401).json({ status: 'error', message: 'Unauthorized' }); return; }
      
      const newVocab = await prisma.vocabulary.create({
        data: { userId, word, meaning, status: 0, nextReviewDate: new Date() },
      });
      res.status(201).json({ status: 'success', data: { vocab: newVocab } });
    } catch (error) { next(error); }
  }

  static async reviewVocab(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id; // Đã sửa
      const { id } = req.params;
      const { isRemembered } = req.body;

      if (!userId) { res.status(401).json({ status: 'error', message: 'Unauthorized' }); return; }

      const vocab = await prisma.vocabulary.findUnique({ where: { id } });
      if (!vocab || vocab.userId !== userId) {
        res.status(404).json({ status: 'error', message: 'Không tìm thấy từ vựng.' }); return;
      }

      let newStatus = isRemembered ? vocab.status + 1 : 0;
      let daysToAdd = newStatus === 0 ? 1 : Math.pow(2, newStatus);
      
      const nextReviewDate = new Date();
      nextReviewDate.setDate(nextReviewDate.getDate() + daysToAdd);

      const updatedVocab = await prisma.vocabulary.update({
        where: { id },
        data: { status: newStatus, nextReviewDate },
      });

      res.status(200).json({ status: 'success', data: { vocab: updatedVocab } });
    } catch (error) { next(error); }
  }
}