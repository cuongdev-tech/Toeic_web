import { Request, Response, NextFunction } from 'express';

const attempts = new Map<string, { count: number; resetAt: number }>();

export const authRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  const key = `${req.ip}:${req.path}`;
  const now = Date.now();
  const current = attempts.get(key);

  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    next();
    return;
  }

  if (current.count >= 10) {
    res.status(429).json({ success: false, message: 'Quá nhiều lần thử. Vui lòng thử lại sau 15 phút.' });
    return;
  }

  current.count += 1;
  next();
};