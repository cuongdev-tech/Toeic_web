import { Router } from 'express';
import authRoutes from './auth.routes';
import testRoutes from './test.routes';
import vocabRoutes from './vocab.routes';

const router = Router();


router.use('/auth', authRoutes);
router.use('/tests', testRoutes);
router.use('/vocab', vocabRoutes);


export default router;