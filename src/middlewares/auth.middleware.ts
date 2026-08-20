import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // 1. Lấy token từ header (Thường có dạng "Bearer eyJhbGci...")
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Không tìm thấy token xác thực!' });
      return;
    }

    const token = authHeader.split(' ')[1];

    // 2. Giải mã token bằng chìa khóa bí mật trong file .env
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string; role: string };

    // 3. Gắn thông tin user (id, role) vào request để các API sau có thể sử dụng
    req.user = decoded;

    // 4. Cho phép đi tiếp vào Controller
    next();
  } catch (error) {
    res.status(403).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn!' });
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