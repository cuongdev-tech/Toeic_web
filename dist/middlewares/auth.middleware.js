"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = exports.verifyToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../config/prisma");
const verifyToken = async (req, res, next) => {
    try {
        // 1. Lấy token từ header (Thường có dạng "Bearer eyJhbGci...")
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ success: false, message: 'Không tìm thấy token xác thực!' });
            return;
        }
        const token = authHeader.split(' ')[1];
        // 2. Giải mã token bằng chìa khóa bí mật trong file .env
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // 3. Gắn thông tin user (id, role) vào request để các API sau có thể sử dụng
        const user = await prisma_1.prisma.user.findUnique({ where: { id: decoded.id }, select: { id: true, role: true, isActive: true } });
        if (!user || !user.isActive) {
            res.status(403).json({ success: false, message: 'Tài khoản đã bị khóa hoặc không tồn tại.' });
            return;
        }
        req.user = { ...decoded, role: user.role };
        // 4. Cho phép đi tiếp vào Controller
        next();
    }
    catch (error) {
        res.status(403).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn!' });
    }
};
exports.verifyToken = verifyToken;
// Chốt chặn 2: Phân quyền dành riêng cho Admin (Dùng khi thêm/sửa/xóa đề thi)
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'ADMIN') {
        next();
    }
    else {
        res.status(403).json({ success: false, message: 'Truy cập bị từ chối. Yêu cầu quyền Admin!' });
    }
};
exports.isAdmin = isAdmin;
