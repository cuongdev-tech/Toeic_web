import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { verifyToken } from '../middlewares/auth.middleware'; 

const router = Router();

router.use(verifyToken);
router.get('/overview', AnalyticsController.getOverview);       // Thêm route tổng quan
router.get('/weaknesses', AnalyticsController.getWeaknesses);   // Route phân tích điểm yếu hiện tại

export default router;