import { Router } from 'express';
import { AdminTestController } from '../controllers/admin.test.controller';
import { verifyToken, isAdmin } from '../middlewares/auth.middleware';
import { mediaUpload, spreadsheetUpload } from '../middlewares/upload.middleware';
import { uploadGroupMedia, deleteGroupMedia } from '../controllers/media.controller';

const router = Router();

// Yêu cầu quyền Admin cho toàn bộ các route quản trị
router.use(verifyToken, isAdmin);

router.get('/tests/:testId/details', AdminTestController.getTestDetails);
router.get('/tests/:testId/question-stats', AdminTestController.getQuestionStats);
router.put('/tests/:testId/questions/order', AdminTestController.reorderQuestions);
router.delete('/tests/:testId/questions/:questionId', AdminTestController.removeQuestionFromTest);
router.post('/tests/:testId/questions/import-excel', spreadsheetUpload.single('file'), AdminTestController.importQuestionsFromExcel);
router.post('/question-groups/:groupId/media', mediaUpload.fields([{ name: 'audio', maxCount: 1 }, { name: 'image', maxCount: 1 }]), uploadGroupMedia);
router.delete('/question-groups/:groupId/media', deleteGroupMedia);
router.post('/question-groups', AdminTestController.createQuestionGroup);
router.post('/questions', AdminTestController.createQuestion);

export default router;