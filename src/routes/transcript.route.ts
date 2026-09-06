import { Router } from 'express';
import { TranscriptController } from '../controllers/transcript.controller';
import { verifyToken, isAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.patch(
  '/admin/question-groups/:groupId/transcript',
  verifyToken,
  isAdmin,
  TranscriptController.updateTranscript
);

// 2. API Lấy chi tiết Transcript
router.get(
  '/question-groups/:groupId/transcript',
  verifyToken,
  TranscriptController.getTranscript
);

export default router;