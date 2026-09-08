import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import masterRouter from './routes/index';
import { errorHandler } from './middlewares/error.middleware';
import { prisma } from './config/prisma';
import path from 'node:path';

dotenv.config();

const app: Application = express();
app.set('trust proxy', 1);
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((origin) => origin.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4173', 'http://127.0.0.1:4173'];

// Ở dev (NODE_ENV !== production): mở hết để tránh lỗi "Failed to fetch"
// khi mở FE bằng localhost / 127.0.0.1 / IP LAN (192.168.x.x) / port preview.
// Lên production mới giới hạn theo FRONTEND_URL.
const isDev = process.env.NODE_ENV !== 'production';
const isLocalOrigin = (origin: string) =>
  /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin);

app.use(
  cors({
    origin: (origin, callback) => {
      // Cho qua request không có Origin (curl, mobile app, health check)
      if (!origin) return callback(null, true);
      if (isDev) return callback(null, true);
      if (allowedOrigins.includes(origin) || isLocalOrigin(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'success', message: 'API TOEIC Đang Chạy!', database: 'Connected' });
  } catch {
    res.status(503).json({ status: 'error', message: 'Database ngắt kết nối!' });
  }
});

app.use('/api/v1', masterRouter);
app.use((req: Request, res: Response) => {
  res.status(404).json({ status: 'error', message: `Không tìm thấy API: ${req.method} ${req.originalUrl}` });
});
app.use(errorHandler);

export { app };
