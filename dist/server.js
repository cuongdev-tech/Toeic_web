"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("./config/prisma"); // Đã sửa đường dẫn import
const app_1 = require("./app");
const PORT = Number(process.env.PORT || 5000);
const server = app_1.app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server đang chạy tại cổng ${PORT}`);
    console.log(`🌍 Health check: http://localhost:${PORT}/api/health`);
});
// Tắt server an toàn (Graceful Shutdown)
const handleShutdown = async () => {
    server.close(async () => {
        await prisma_1.prisma.$disconnect();
        process.exit(0);
    });
};
process.on('SIGTERM', handleShutdown);
process.on('SIGINT', handleShutdown);
