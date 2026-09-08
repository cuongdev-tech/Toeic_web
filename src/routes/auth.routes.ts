import { Router } from 'express';
import { register, login, refreshAccessToken, requestPasswordReset, resetPassword, getProfile, updateProfile, changePassword } from '../controllers/auth.controller';
import { verifyToken } from '../middlewares/auth.middleware';
import { authRateLimit } from '../middlewares/rate-limit.middleware';

const router = Router();

router.post('/register', authRateLimit, register);
router.post('/login', authRateLimit, login);
router.post('/refresh', refreshAccessToken);
router.post('/forgot-password', authRateLimit, requestPasswordReset);
router.post('/reset-password', resetPassword);
router.get('/profile', verifyToken, getProfile);
router.patch('/profile', verifyToken, updateProfile);
router.patch('/password', verifyToken, changePassword);

export default router;