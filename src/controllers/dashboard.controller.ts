import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { Role } from '@prisma/client';

export const DashboardController = {
  getStudentDashboard: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const [recentAttempts, inProgress, submittedAttempts] = await Promise.all([
        prisma.testAttempt.findMany({
          where: { userId },
          include: { test: { select: { id: true, title: true, duration: true } } },
          orderBy: { startedAt: 'desc' },
          take: 5,
        }),
        prisma.testAttempt.findMany({
          where: { userId, status: 'IN_PROGRESS' },
          include: { test: { select: { id: true, title: true, duration: true } } },
          orderBy: { startedAt: 'desc' },
        }),
        prisma.testAttempt.findMany({
          where: { userId, status: 'SUBMITTED', totalScore: { not: null } },
          select: { totalScore: true, startedAt: true },
          orderBy: { startedAt: 'asc' },
        }),
      ]);

      const scores = submittedAttempts.map((attempt) => attempt.totalScore || 0);
      const last7Days = Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - (6 - index));
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        return {
          date: date.toISOString().slice(0, 10),
          count: submittedAttempts.filter((attempt) => attempt.startedAt >= date && attempt.startedAt < nextDate).length,
        };
      });

      return res.json({
        success: true,
        data: {
          overview: {
            totalCompleted: submittedAttempts.length,
            highestScore: scores.length ? Math.max(...scores) : 0,
            averageScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0,
          },
          recentAttempts,
          inProgress,
          weeklyProgress: last7Days,
          scoreHistory: submittedAttempts.map((attempt) => ({ date: attempt.startedAt, score: attempt.totalScore || 0 })),
        },
      });
    } catch (error: any) {
      console.error('[Student Dashboard Error]:', error);
      return res.status(500).json({ success: false, message: 'Không thể tải dashboard cá nhân.' });
    }
  },
  /**
   * GET /api/admin/dashboard/stats
   * Lấy dữ liệu tổng hợp cho Admin Dashboard
   */
  getDashboardStats: async (req: Request, res: Response) => {
    try {
      // 1. TẠO TEMPLATE 7 NGÀY GẦN NHẤT ĐỂ ĐẢM BẢO FRONTEND VẼ CHART KHÔNG BỊ GÃY
      // Tạo mảng chứa 7 chuỗi ngày (YYYY-MM-DD), từ 6 ngày trước đến hôm nay
      const last7DaysTemplate = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i)); 
        return d.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      });

      // 2. CHẠY PARALLEL QUERIES (Tối ưu hiệu suất DB)
      const [totalStudents, totalTests, totalAttempts, rawDailyStats] = await Promise.all([
        // Đếm tổng Học viên
        prisma.user.count({
          where: { role: Role.STUDENT },
        }),
        
        // Đếm tổng Đề thi
        prisma.test.count(),
        
        // Đếm tổng Lượt làm bài
        prisma.testAttempt.count(),

        // Gom nhóm số lượt thi theo 7 ngày gần nhất (PostgreSQL specific query)
        // Dùng TO_CHAR để ép kiểu datetime về YYYY-MM-DD, dùng ::int để cast BigInt về số thường
        prisma.$queryRaw<Array<{ date: string; count: number }>>`
          SELECT 
            TO_CHAR("startedAt", 'YYYY-MM-DD') as "date", 
            COUNT(*)::int as "count"
          FROM "test_attempts"
          WHERE "startedAt" >= CURRENT_DATE - INTERVAL '6 days'
          GROUP BY TO_CHAR("startedAt", 'YYYY-MM-DD')
          ORDER BY "date" ASC;
        `
      ]);

      // 3. MAP DỮ LIỆU TỪ DB VÀO TEMPLATE 7 NGÀY
      // Xử lý việc nếu 1 ngày không có ai thi, SQL sẽ không trả về ngày đó -> Set count = 0
      const chartData = last7DaysTemplate.map((dateStr) => {
        const found = rawDailyStats.find((row) => row.date === dateStr);
        return {
          date: dateStr,
          count: found ? found.count : 0,
        };
      });

      // 4. TRẢ VỀ RESPONSE CHUẨN
      return res.status(200).json({
        success: true,
        message: 'Lấy dữ liệu thống kê Dashboard thành công',
        data: {
          overview: {
            totalStudents,
            totalTests,
            totalAttempts,
          },
          chartData: {
            last7DaysAttempts: chartData,
          }
        },
      });

    } catch (error: any) {
      console.error('[Dashboard Error]:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Lỗi server khi tính toán số liệu thống kê.',
        error: error.message 
      });
    }
  },
};