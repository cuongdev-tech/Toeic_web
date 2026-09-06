import { prisma } from './config/prisma'; // Đã sửa đường dẫn import
import { app } from './app';
const PORT = Number(process.env.PORT || 5000);

const server = app.listen(PORT, '0.0.0.0', () => {
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