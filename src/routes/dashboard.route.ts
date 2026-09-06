import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { verifyToken, isAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.get('/student', verifyToken, DashboardController.getStudentDashboard);
router.get('/', verifyToken, isAdmin, DashboardController.getDashboardStats);

export default router;