"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.requestPasswordReset = exports.refreshAccessToken = exports.login = exports.register = exports.changePassword = exports.getProfile = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../config/prisma");
const node_crypto_1 = __importDefault(require("node:crypto"));
const getProfile = async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, fullName: true, role: true, createdAt: true } });
    if (!user) {
        res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản.' });
        return;
    }
    res.json({ success: true, data: { user } });
};
exports.getProfile = getProfile;
const changePassword = async (req, res) => {
    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body;
    if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
        res.status(400).json({ success: false, message: 'Mật khẩu mới phải có ít nhất 8 ký tự.' });
        return;
    }
    const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
    if (!user || typeof currentPassword !== 'string' || !(await bcrypt_1.default.compare(currentPassword, user.password))) {
        res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không đúng.' });
        return;
    }
    await prisma_1.prisma.user.update({ where: { id: userId }, data: { password: await bcrypt_1.default.hash(newPassword, 10) } });
    res.json({ success: true, message: 'Đổi mật khẩu thành công.' });
};
exports.changePassword = changePassword;
// [POST] /api/auth/register
const register = async (req, res) => {
    try {
        const { email, password, fullName } = req.body;
        if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) {
            res.status(400).json({ success: false, message: 'Email không hợp lệ.' });
            return;
        }
        if (typeof password !== 'string' || password.length < 8) {
            res.status(400).json({ success: false, message: 'Mật khẩu phải có ít nhất 8 ký tự.' });
            return;
        }
        if (typeof fullName !== 'string' || fullName.trim().length < 2) {
            res.status(400).json({ success: false, message: 'Họ tên không hợp lệ.' });
            return;
        }
        // 1. Kiểm tra email đã tồn tại chưa
        const existingUser = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(400).json({ success: false, message: 'Email này đã được sử dụng!' });
            return;
        }
        // 2. Mã hóa mật khẩu
        const salt = await bcrypt_1.default.genSalt(10);
        const hashedPassword = await bcrypt_1.default.hash(password, salt);
        // 3. Lưu vào Database
        const newUser = await prisma_1.prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                fullName,
            },
        });
        res.status(201).json({
            success: true,
            message: 'Đăng ký thành công!',
            data: { id: newUser.id, email: newUser.email }
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Lỗi server khi đăng ký!' });
    }
};
exports.register = register;
// [POST] /api/auth/login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (typeof email !== 'string' || typeof password !== 'string') {
            res.status(400).json({ success: false, message: 'Email và mật khẩu là bắt buộc.' });
            return;
        }
        // 1. Tìm user trong DB
        const user = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            res.status(404).json({ success: false, message: 'Tài khoản không tồn tại!' });
            return;
        }
        // 2. So sánh mật khẩu
        const isMatch = await bcrypt_1.default.compare(password, user.password);
        if (!isMatch) {
            res.status(400).json({ success: false, message: 'Mật khẩu không chính xác!' });
            return;
        }
        // 3. Tạo vé thông hành (JWT Token)
        const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role, tokenType: 'access' }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const refreshToken = jsonwebtoken_1.default.sign({ id: user.id, role: user.role, tokenType: 'refresh' }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(200).json({
            success: true,
            message: 'Đăng nhập thành công!',
            token,
            refreshToken,
            user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role }
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Lỗi server khi đăng nhập!' });
    }
};
exports.login = login;
const refreshAccessToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        const decoded = jsonwebtoken_1.default.verify(refreshToken, process.env.JWT_SECRET);
        if (decoded.tokenType !== 'refresh')
            throw new Error('invalid token type');
        const user = await prisma_1.prisma.user.findUnique({ where: { id: decoded.id } });
        if (!user || !user.isActive) {
            res.status(403).json({ success: false, message: 'Tài khoản không hoạt động.' });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role, tokenType: 'access' }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ success: true, token });
    }
    catch {
        res.status(401).json({ success: false, message: 'Refresh token đã hết hạn.' });
    }
};
exports.refreshAccessToken = refreshAccessToken;
const requestPasswordReset = async (req, res) => {
    const email = typeof req.body.email === 'string' ? req.body.email.toLowerCase().trim() : '';
    const genericMessage = 'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi.';
    const user = email ? await prisma_1.prisma.user.findUnique({ where: { email } }) : null;
    if (user) {
        const rawToken = node_crypto_1.default.randomBytes(32).toString('hex');
        const tokenHash = node_crypto_1.default.createHash('sha256').update(rawToken).digest('hex');
        await prisma_1.prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
        await prisma_1.prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 30 * 60 * 1000) } });
        if (process.env.NODE_ENV !== 'production')
            console.log(`[Password reset token for ${email}]: ${rawToken}`);
        res.status(200).json({ success: true, message: genericMessage, ...(process.env.NODE_ENV !== 'production' ? { resetToken: rawToken } : {}) });
        return;
    }
    res.status(200).json({ success: true, message: genericMessage });
};
exports.requestPasswordReset = requestPasswordReset;
const resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;
    if (typeof token !== 'string' || typeof newPassword !== 'string' || newPassword.length < 8) {
        res.status(400).json({ success: false, message: 'Token hoặc mật khẩu mới không hợp lệ.' });
        return;
    }
    const tokenHash = node_crypto_1.default.createHash('sha256').update(token).digest('hex');
    const reset = await prisma_1.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!reset || reset.usedAt || reset.expiresAt <= new Date()) {
        res.status(400).json({ success: false, message: 'Token đã hết hạn hoặc không hợp lệ.' });
        return;
    }
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.user.update({ where: { id: reset.userId }, data: { password: await bcrypt_1.default.hash(newPassword, 10) } }),
        prisma_1.prisma.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    ]);
    res.json({ success: true, message: 'Đặt lại mật khẩu thành công.' });
};
exports.resetPassword = resetPassword;
