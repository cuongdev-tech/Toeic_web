import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  console.error(`[Lỗi Hệ Thống]: ${err.message}`);
  
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Multer: file quá lớn hoặc sai định dạng -> trả 400 với message rõ ràng
  if (err?.code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({ success: false, status: 'error', message: 'File vượt quá dung lượng cho phép.' });
    return;
  }
  if (err?.message?.startsWith('Định dạng file không hỗ trợ')) {
    res.status(400).json({ success: false, status: 'error', message: err.message });
    return;
  }

  const statusCode = err.statusCode || err.status || 500;
  // Lỗi 4xx thì trả message thật để FE hiển thị; lỗi 5xx mới che giấu ở production
  const message = statusCode < 500
    ? (err.message || 'Yêu cầu không hợp lệ!')
    : (process.env.NODE_ENV === 'development' ? (err.message || 'Lỗi hệ thống nội bộ!') : 'Lỗi hệ thống nội bộ!');

  res.status(statusCode).json({
    status: 'error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};