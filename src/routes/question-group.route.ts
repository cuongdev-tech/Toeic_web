import { Router } from 'express';
import { QuestionGroupController } from '../controllers/question-group.controller';
import { verifyToken, isAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.use(verifyToken, isAdmin);

router.post('/', QuestionGroupController.createGroup);
router.get('/', QuestionGroupController.getAllGroups);
router.get('/:id', QuestionGroupController.getGroupById);
router.put('/:id', QuestionGroupController.updateGroup);
router.delete('/:id', QuestionGroupController.deleteGroup);

export default router;