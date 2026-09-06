import { Router } from 'express';
import { verifyToken } from '../middlewares/auth.middleware';
import { TestController } from '../controllers/test.controller';

const router = Router();

// Áp dụng middleware kiểm tra token cho tất cả các route bên dưới
router.use(verifyToken);

// [GET] /api/v1/tests - Lấy danh sách toàn bộ đề thi
router.get('/', TestController.getAllTests);

// [GET] /api/v1/tests/:id - Lấy chi tiết một đề thi cụ thể
router.get('/:id', TestController.getTestById);

export default router;