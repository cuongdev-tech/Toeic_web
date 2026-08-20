import { Router } from 'express';
import { VocabController } from '../controllers/vocab.controller';
import { verifyToken } from '../middlewares/auth.middleware'; // Đã sửa tên middleware

const router = Router();

router.use(verifyToken);
router.get('/', VocabController.getVocabs);
router.post('/', VocabController.addVocab);
router.patch('/:id/review', VocabController.reviewVocab);

export default router;