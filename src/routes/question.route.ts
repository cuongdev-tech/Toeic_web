import { Router } from 'express';
import { QuestionController } from '../controllers/question.controller';
import { verifyToken, isAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.use(verifyToken, isAdmin);

// Lưu ý: Endpoint /random phải đặt TRƯỚC /:id để Express Router không nhầm lẫn chữ 'random' là 1 cái ID
router.get('/random', QuestionController.getRandomQuestions);

router.post('/', QuestionController.createQuestion);
router.get('/', QuestionController.getAllQuestions);
router.put('/:id', QuestionController.updateQuestion);
router.delete('/:id', QuestionController.deleteQuestion);

export default router;