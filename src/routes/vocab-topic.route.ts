import { Router } from 'express';
import { VocabTopicController } from '../controllers/vocab-topic.controller';
import { verifyToken, isAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.use(verifyToken, isAdmin);

router.get('/', VocabTopicController.listTopics);
router.post('/', VocabTopicController.createTopic);
router.put('/:id', VocabTopicController.updateTopic);
router.delete('/:id', VocabTopicController.deleteTopic);

router.get('/:id/words', VocabTopicController.listWords);
router.post('/:id/words', VocabTopicController.addWord);
router.put('/words/:wordId', VocabTopicController.updateWord);
router.delete('/words/:wordId', VocabTopicController.deleteWord);

export default router;
