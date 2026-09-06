import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import crypto from 'node:crypto';
import nodemailer from 'nodemailer';

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, fullName: true, role: true, createdAt: true } });
  if (!user) { res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản.' }); return; }
  res.json({ success: true, data: { user } });
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { currentPassword, newPassword } = req.body;
  if (!userId) { res.status(401).json({ success: false, message: 'Unauthorized' }); return; }
  if (typeof newPassword !== 'string' || newPassword.length < 8) { res.status(400).json({ success: false, message: 'Mật khẩu mới phải có ít nhất 8 ký tự.' }); return; }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || typeof currentPassword !== 'string' || !(await bcrypt.compare(currentPassword, user.password))) { res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không đúng.' }); return; }
  await prisma.user.update({ where: { id: userId }, data: { password: await bcrypt.hash(newPassword, 10) } });
  res.json({ success: true, message: 'Đổi mật khẩu thành công.' });
};

// [POST] /api/auth/register
export const register = async (req: Request, res: Response): Promise<void> => {
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
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ success: false, message: 'Email này đã được sử dụng!' });
      return;
    }

    // 2. Mã hóa mật khẩu
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Lưu vào Database
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
      },
    });

    const token = jwt.sign(
      { id: newUser.id, role: newUser.role, tokenType: 'access' },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' },
    );
    const refreshToken = jwt.sign(
      { id: newUser.id, role: newUser.role, tokenType: 'refresh' },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' },
    );

    res.status(201).json({ 
      success: true, 
      message: 'Đăng ký thành công!', 
      data: {
        token,
        refreshToken,
        user: { id: newUser.id, email: newUser.email, fullName: newUser.fullName, role: newUser.role },
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Lỗi server khi đăng ký!' });
  }
};

// [POST] /api/auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ success: false, message: 'Email và mật khẩu là bắt buộc.' });
      return;
    }

    // 1. Tìm user trong DB
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ success: false, message: 'Tài khoản không tồn tại!' });
      return;
    }

    // 2. So sánh mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(400).json({ success: false, message: 'Mật khẩu không chính xác!' });
      return;
    }

    // 3. Tạo vé thông hành (JWT Token)
    const token = jwt.sign(
      { id: user.id, role: user.role, tokenType: 'access' },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }
    );
    const refreshToken = jwt.sign(
      { id: user.id, role: user.role, tokenType: 'refresh' },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công!',
      token,
      refreshToken,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Lỗi server khi đăng nhập!' });
  }
};

export const refreshAccessToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET as string) as { id: string; tokenType?: string };
    if (decoded.tokenType !== 'refresh') throw new Error('invalid token type');
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || !user.isActive) { res.status(403).json({ success: false, message: 'Tài khoản không hoạt động.' }); return; }
    const token = jwt.sign({ id: user.id, role: user.role, tokenType: 'access' }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
    res.json({ success: true, token });
  } catch {
    res.status(401).json({ success: false, message: 'Refresh token đã hết hạn.' });
  }
};

export const requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
  const email = typeof req.body.email === 'string' ? req.body.email.toLowerCase().trim() : '';
  const genericMessage = 'Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi.';
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  if (user) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 30 * 60 * 1000) } });
    const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:5173';
    const resetUrl = `${frontendUrl.replace(/\/$/, '')}/forgot-password?token=${rawToken}`;
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'TOEIC Master - Đặt lại mật khẩu',
        text: `Mở liên kết sau để đặt lại mật khẩu: ${resetUrl}. Liên kết có hiệu lực trong 30 phút.`,
        html: `<p>Bạn vừa yêu cầu đặt lại mật khẩu TOEIC Master.</p><p><a href="${resetUrl}">Đặt lại mật khẩu</a></p><p>Liên kết có hiệu lực trong 30 phút.</p>`,
      });
    } else if (process.env.NODE_ENV !== 'production') {
      console.log(`[Password reset token for ${email}]: ${rawToken}`);
    }
    res.status(200).json({ success: true, message: genericMessage, ...(process.env.NODE_ENV !== 'production' ? { resetToken: rawToken } : {}) });
    return;
  }
  res.status(200).json({ success: true, message: genericMessage });
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const { token, newPassword } = req.body;
  if (typeof token !== 'string' || typeof newPassword !== 'string' || newPassword.length < 8) {
    res.status(400).json({ success: false, message: 'Token hoặc mật khẩu mới không hợp lệ.' });
    return;
  }
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const reset = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!reset || reset.usedAt || reset.expiresAt <= new Date()) {
    res.status(400).json({ success: false, message: 'Token đã hết hạn hoặc không hợp lệ.' });
    return;
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: reset.userId }, data: { password: await bcrypt.hash(newPassword, 10) } }),
    prisma.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
  ]);
  res.json({ success: true, message: 'Đặt lại mật khẩu thành công.' });
};