import { Router } from 'express';
import { TestAttemptController } from '../controllers/test-attempt.controller';
import { verifyToken } from '../middlewares/auth.middleware'; // Đổi tên middleware

const router = Router();

router.use(verifyToken); // Dùng verifyToken

router.post('/start', TestAttemptController.startTest);
router.patch('/:attemptId/sync', TestAttemptController.syncAttempt);
router.post('/:attemptId/submit', TestAttemptController.submitTest);
router.get('/:attemptId/review', TestAttemptController.getAttemptReview);
router.get('/my-history', verifyToken, TestAttemptController.getMyHistory);

export default router;