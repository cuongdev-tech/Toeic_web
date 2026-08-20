import { Router } from 'express';
import { TestController } from '../controllers/test.controller';
import { verifyToken } from '../middlewares/auth.middleware'; // Đã sửa tên middleware

const router = Router();

router.use(verifyToken);
router.get('/', TestController.getAllTests);
router.get('/:id', TestController.getTestById);
router.post('/:id/submit', TestController.submitTest);

export default router;