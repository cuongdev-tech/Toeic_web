import { Router } from 'express';
import authRoutes from './auth.routes';
import testRoutes from './test.routes';
import vocabRoutes from './vocab.routes';
import adminRoutes from './admin.route';
import questionGroupRoutes from './question-group.route'; 
import questionRoutes from './question.route';
import testAttemptRoutes from './test-attempt.route';
import analyticsRoutes from './analytics.route';
import transcriptRoutes from './transcript.route';
import dashboardRoutes from './dashboard.route';
import adminTestRoutes from './admin.test.route';
import vocabTopicRoutes from './vocab-topic.route';

const router = Router();

router.use('/auth', authRoutes);
router.use('/tests/attempts', testAttemptRoutes);
router.use('/tests', testRoutes);
router.use('/vocab', vocabRoutes);
router.use('/admin/question-groups', questionGroupRoutes);
router.use('/admin/questions', questionRoutes);
router.use('/admin/vocab-topics', vocabTopicRoutes);
router.use('/admin/dashboard', dashboardRoutes);
router.use('/admin', adminRoutes);
router.use('/users/analytics', analyticsRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/', transcriptRoutes);
router.use('/admin', adminTestRoutes);

export default router;