import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import masterRouter from './routes/index';
import { errorHandler } from './middlewares/error.middleware';
import { prisma } from './config/prisma';
import path from 'node:path';

dotenv.config();

const app: Application = express();
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((origin) => origin.trim())
  : ['http://localhost:5173'];

app.use(cors({ origin: allowedOrigins }));
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
