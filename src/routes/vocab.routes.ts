import { Router } from 'express';
import { VocabController } from '../controllers/vocab.controller';
import { VocabTopicController } from '../controllers/vocab-topic.controller';
import { verifyToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(verifyToken);

// Kho từ chung theo chủ đề (đặt TRƯỚC /:id để khỏi bị nuốt)
router.get('/topics', VocabTopicController.browseTopics);
router.get('/topics/:id', VocabTopicController.getTopicDetail);
router.post('/topics/:id/copy', VocabTopicController.copyTopic);
router.post('/topic-words/:wordId/copy', VocabTopicController.copyWord);

router.get('/', VocabController.getVocabs);
router.post('/', VocabController.addVocab);
router.post('/seed', VocabController.seedDefaultVocabs);
router.patch('/:id/review', VocabController.reviewVocab);
router.put('/:id', VocabController.updateVocab);
router.delete('/:id', VocabController.deleteVocab);

export default router;