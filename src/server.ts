import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import masterRouter from './routes/index';
import { errorHandler } from './middlewares/error.middleware';
import { prisma } from './config/prisma'; // Đã sửa đường dẫn import

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Đường dẫn kiểm tra sức khỏe server (Health Check)
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'success', message: 'API TOEIC Đang Chạy!', database: 'Connected' });
  } catch (error) {
    res.status(503).json({ status: 'error', message: 'Database ngắt kết nối!' });
  }
});

// AI thiết kế API của bạn chạy dưới đường dẫn /api/v1 (Rất chuẩn chuyên nghiệp)
app.use('/api/v1', masterRouter);

app.use((req: Request, res: Response) => {
  res.status(404).json({ status: 'error', message: `Không tìm thấy API: ${req.method} ${req.originalUrl}` });
});

// Middleware xử lý lỗi
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại cổng ${PORT}`);
  console.log(`🌍 Health check: http://localhost:${PORT}/api/health`);
});

// Tắt server an toàn (Graceful Shutdown)
const handleShutdown = async () => {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};
process.on('SIGTERM', handleShutdown);
process.on('SIGINT', handleShutdown);