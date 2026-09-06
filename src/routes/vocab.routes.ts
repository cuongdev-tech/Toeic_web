import { Router } from 'express';
import { VocabController } from '../controllers/vocab.controller';
import { verifyToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(verifyToken);

router.get('/', VocabController.getVocabs);
router.post('/', VocabController.addVocab);
router.post('/seed', VocabController.seedDefaultVocabs);
router.patch('/:id/review', VocabController.reviewVocab);
router.put('/:id', VocabController.updateVocab);
router.delete('/:id', VocabController.deleteVocab);

export default router;