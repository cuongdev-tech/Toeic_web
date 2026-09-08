import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';

export const verifyToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // 1. Lấy token từ header (Thường có dạng "Bearer eyJhbGci...")
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Không tìm thấy token xác thực!' });
      return;
    }

    const token = authHeader.split(' ')[1];

    // 2. Giải mã token bằng chìa khóa bí mật trong file .env
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string; role: string; tokenType?: string };

    // 3. Chặn refresh token dùng làm access token
    if (decoded.tokenType && decoded.tokenType !== 'access') {
      res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn!' });
      return;
    }

    // 3. Gắn thông tin user (id, role) vào request để các API sau có thể sử dụng
    const user = await prisma.user.findUnique({ where: { id: decoded.id }, select: { id: true, role: true, isActive: true } });
    if (!user || !user.isActive) {
      res.status(403).json({ success: false, message: 'Tài khoản đã bị khóa hoặc không tồn tại.' });
      return;
    }
    req.user = { ...decoded, role: user.role };

    // 4. Cho phép đi tiếp vào Controller
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn!' });
  }
};

// Chốt chặn 2: Phân quyền dành riêng cho Admin (Dùng khi thêm/sửa/xóa đề thi)
export const isAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user && req.user.role === 'ADMIN') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Truy cập bị từ chối. Yêu cầu quyền Admin!' });
  }
};