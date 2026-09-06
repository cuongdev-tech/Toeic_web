import { Router } from 'express';
import { createTest, getAdminTests, updateTestStatus, getUsers, updateUserStatus, getAuditLogs, addQuestionToTest, getAdminStats } from '../controllers/admin.controller';
import { verifyToken, isAdmin } from '../middlewares/auth.middleware';

const router = Router();

router.use(verifyToken, isAdmin);

router.get('/dashboard/stats', getAdminStats); // Thêm dòng này để nhận request từ Admin Dashboard
router.get('/tests', getAdminTests);
router.patch('/tests/:testId/status', updateTestStatus);
router.get('/users', getUsers);
router.patch('/users/:userId/status', updateUserStatus);
router.get('/audit-logs', getAuditLogs);
router.post('/tests', createTest);
router.post('/tests/:testId/questions', addQuestionToTest);

export default router;