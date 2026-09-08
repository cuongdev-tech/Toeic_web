import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

export class VocabTopicController {
  // ---- Admin: danh sách chủ đề kèm số từ ----
  static async listTopics(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const topics = await prisma.vocabTopic.findMany({
        include: { _count: { select: { words: true } } },
        orderBy: { createdAt: 'asc' },
      });
      res.status(200).json({ status: 'success', success: true, data: { topics } });
    } catch (error) { next(error); }
  }

  static async createTopic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const title = String(req.body.title || '').trim();
      if (!title) { res.status(400).json({ status: 'error', success: false, message: 'Tiêu đề chủ đề là bắt buộc.' }); return; }
      const topic = await prisma.vocabTopic.create({
        data: { title, description: typeof req.body.description === 'string' ? req.body.description.trim() || null : null },
      });
      res.status(201).json({ status: 'success', success: true, data: { topic } });
    } catch (error) { next(error); }
  }

  static async updateTopic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: { title?: string; description?: string | null } = {};
      if (req.body.title !== undefined) {
        const title = String(req.body.title).trim();
        if (!title) { res.status(400).json({ status: 'error', success: false, message: 'Tiêu đề không được trống.' }); return; }
        data.title = title;
      }
      if (req.body.description !== undefined) {
        data.description = String(req.body.description).trim() || null;
      }
      const topic = await prisma.vocabTopic.update({ where: { id: String(req.params.id) }, data });
      res.status(200).json({ status: 'success', success: true, data: { topic } });
    } catch (error) { next(error); }
  }

  static async deleteTopic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await prisma.vocabTopic.delete({ where: { id: String(req.params.id) } });
      res.status(200).json({ status: 'success', success: true, message: 'Đã xóa chủ đề (kèm các từ bên trong).' });
    } catch (error) { next(error); }
  }

  // ---- Admin: từ trong chủ đề ----
  static async listWords(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const words = await prisma.topicWord.findMany({
        where: { topicId: String(req.params.id) },
        orderBy: { createdAt: 'asc' },
      });
      res.status(200).json({ status: 'success', success: true, data: { words } });
    } catch (error) { next(error); }
  }

  static async addWord(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const topicId = String(req.params.id);
      const word = String(req.body.word || '').trim();
      const meaning = String(req.body.meaning || '').trim();
      if (!word || !meaning) { res.status(400).json({ status: 'error', success: false, message: 'Thiếu từ hoặc nghĩa.' }); return; }
      const topic = await prisma.vocabTopic.findUnique({ where: { id: topicId }, select: { id: true } });
      if (!topic) { res.status(404).json({ status: 'error', success: false, message: 'Không tìm thấy chủ đề.' }); return; }
      const created = await prisma.topicWord.create({
        data: {
          topicId,
          word,
          meaning,
          example: typeof req.body.example === 'string' && req.body.example.trim() ? req.body.example.trim() : null,
        },
      });
      res.status(201).json({ status: 'success', success: true, data: { word: created } });
    } catch (error) { next(error); }
  }

  static async updateWord(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: { word?: string; meaning?: string; example?: string | null } = {};
      if (req.body.word !== undefined) {
        const word = String(req.body.word).trim();
        if (!word) { res.status(400).json({ status: 'error', success: false, message: 'Từ không được trống.' }); return; }
        data.word = word;
      }
      if (req.body.meaning !== undefined) {
        const meaning = String(req.body.meaning).trim();
        if (!meaning) { res.status(400).json({ status: 'error', success: false, message: 'Nghĩa không được trống.' }); return; }
        data.meaning = meaning;
      }
      if (req.body.example !== undefined) {
        data.example = String(req.body.example).trim() || null;
      }
      const updated = await prisma.topicWord.update({ where: { id: String(req.params.wordId) }, data });
      res.status(200).json({ status: 'success', success: true, data: { word: updated } });
    } catch (error) { next(error); }
  }

  static async deleteWord(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await prisma.topicWord.delete({ where: { id: String(req.params.wordId) } });
      res.status(200).json({ status: 'success', success: true, message: 'Đã xóa từ khỏi chủ đề.' });
    } catch (error) { next(error); }
  }

  // ---- Học viên: duyệt kho từ chung (kèm số từ đã có trong sổ tay) ----
  static async browseTopics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ status: 'error', success: false, message: 'Unauthorized' }); return; }
      const [topics, myVocabs] = await Promise.all([
        prisma.vocabTopic.findMany({
          include: { words: { select: { id: true, word: true }, orderBy: { createdAt: 'asc' } }, _count: { select: { words: true } } },
          orderBy: { createdAt: 'asc' },
        }),
        prisma.vocabulary.findMany({ where: { userId }, select: { word: true } }),
      ]);
      const mine = new Set(myVocabs.map((v) => v.word.toLowerCase()));
      res.status(200).json({
        status: 'success',
        success: true,
        data: {
          topics: topics.map((t) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            total: t._count.words,
            added: t.words.filter((w) => mine.has(w.word.toLowerCase())).length,
            preview: t.words.slice(0, 3).map((w) => w.word),
          })),
        },
      });
    } catch (error) { next(error); }
  }

  static async getTopicDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ status: 'error', success: false, message: 'Unauthorized' }); return; }
      const topic = await prisma.vocabTopic.findUnique({
        where: { id: String(req.params.id) },
        include: { words: { orderBy: { createdAt: 'asc' } } },
      });
      if (!topic) { res.status(404).json({ status: 'error', success: false, message: 'Không tìm thấy chủ đề.' }); return; }
      const myVocabs = await prisma.vocabulary.findMany({ where: { userId }, select: { word: true } });
      const mine = new Set(myVocabs.map((v) => v.word.toLowerCase()));
      res.status(200).json({
        status: 'success',
        success: true,
        data: {
          topic: {
            ...topic,
            words: topic.words.map((w) => ({ ...w, added: mine.has(w.word.toLowerCase()) })),
          },
        },
      });
    } catch (error) { next(error); }
  }

  // ---- Học viên: thêm 1 từ / cả chủ đề về sổ tay (bỏ qua từ đã có) ----
  static async copyWord(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ status: 'error', success: false, message: 'Unauthorized' }); return; }
      const source = await prisma.topicWord.findUnique({ where: { id: String(req.params.wordId) } });
      if (!source) { res.status(404).json({ status: 'error', success: false, message: 'Không tìm thấy từ.' }); return; }
      const existing = await prisma.vocabulary.findMany({ where: { userId }, select: { word: true } });
      if (existing.some((v) => v.word.toLowerCase() === source.word.toLowerCase())) {
        res.status(200).json({ status: 'success', success: true, data: { added: 0, skipped: 1 } });
        return;
      }
      await prisma.vocabulary.create({ data: { userId, word: source.word, meaning: source.meaning } });
      res.status(201).json({ status: 'success', success: true, data: { added: 1, skipped: 0 } });
    } catch (error) { next(error); }
  }

  static async copyTopic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ status: 'error', success: false, message: 'Unauthorized' }); return; }
      const topic = await prisma.vocabTopic.findUnique({
        where: { id: String(req.params.id) },
        include: { words: true },
      });
      if (!topic) { res.status(404).json({ status: 'error', success: false, message: 'Không tìm thấy chủ đề.' }); return; }
      const existing = await prisma.vocabulary.findMany({ where: { userId }, select: { word: true } });
      const mine = new Set(existing.map((v) => v.word.toLowerCase()));
      const fresh = topic.words.filter((w) => !mine.has(w.word.toLowerCase()));
      if (fresh.length) {
        await prisma.vocabulary.createMany({
          data: fresh.map((w) => ({ userId, word: w.word, meaning: w.meaning })),
        });
      }
      res.status(201).json({
        status: 'success',
        success: true,
        data: { added: fresh.length, skipped: topic.words.length - fresh.length },
      });
    } catch (error) { next(error); }
  }
}
