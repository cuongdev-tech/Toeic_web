import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { verifyToken } from '../middlewares/auth.middleware'; 

const router = Router();

router.use(verifyToken);
router.get('/overview', AnalyticsController.getOverview);       // Thêm route tổng quan
router.get('/weaknesses', AnalyticsController.getWeaknesses);   // Route phân tích điểm yếu hiện tại
router.get('/mistakes', AnalyticsController.getMistakes);       // Sổ tay câu sai
router.get('/achievements', AnalyticsController.getAchievements); // Huy hiệu thành tích

export default router;