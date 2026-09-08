import { Request, Response } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../config/prisma';
import { cloudinaryPublicIdFromUrl, deleteFromCloudinary, isCloudinaryConfigured, uploadToCloudinary } from '../config/cloudinary';

export const uploadGroupMedia = async (req: Request, res: Response): Promise<void> => {
  const groupId = String(req.params.groupId);
  const group = await prisma.questionGroup.findUnique({ where: { id: groupId } });
  if (!group) { res.status(404).json({ success: false, message: 'Không tìm thấy nhóm câu hỏi.' }); return; }

  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  const fileEntries = Object.entries(files || {});
  if (!fileEntries.length) { res.status(400).json({ success: false, message: 'Chưa chọn file audio hoặc image.' }); return; }

  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(uploadDir, { recursive: true });
  const updates: { audioUrl?: string; imageUrl?: string } = {};
  for (const [field, entries] of fileEntries) {
    const file = entries[0];
    if (!file) continue;
    const extension = path.extname(file.originalname).toLowerCase() || (file.mimetype.startsWith('audio/') ? '.mp3' : '.png');
    let url: string;
    if (isCloudinaryConfigured()) {
      const uploaded = await uploadToCloudinary(file.buffer, { folder: `toeic/question-groups/${groupId}`, resourceType: file.mimetype.startsWith('audio/') ? 'video' : 'image' });
      url = uploaded.secure_url;
    } else {
      const filename = `${crypto.randomUUID()}${extension}`;
      await fs.writeFile(path.join(uploadDir, filename), file.buffer);
      url = `/uploads/${filename}`;
    }
    if (field === 'audio') updates.audioUrl = url;
    if (field === 'image') updates.imageUrl = url;
  }
  const updatedGroup = await prisma.questionGroup.update({ where: { id: groupId }, data: updates });
  res.status(201).json({ success: true, data: { group: updatedGroup } });
};

export const deleteGroupMedia = async (req: Request, res: Response): Promise<void> => {
  const groupId = String(req.params.groupId);
  const field: 'audioUrl' | 'imageUrl' = req.body.field;
  if (field !== 'audioUrl' && field !== 'imageUrl') { res.status(400).json({ success: false, message: 'Media field không hợp lệ.' }); return; }
  const group = await prisma.questionGroup.findUnique({ where: { id: groupId }, select: { audioUrl: true, imageUrl: true } });
  if (!group) { res.status(404).json({ success: false, message: 'Không tìm thấy nhóm câu hỏi.' }); return; }
  const url = group[field];
  if (url?.startsWith('/uploads/')) {
    const filename = url.slice('/uploads/'.length).replace(/^\/+/, '');
    // Ngăn path traversal: chỉ lấy tên file, bỏ mọi thư mục lồng nhau
    const safeName = path.basename(filename);
    if (safeName) {
      await fs.unlink(path.join(process.cwd(), 'public', 'uploads', safeName)).catch(() => undefined);
    }
  } else if (url && isCloudinaryConfigured()) {
    const publicId = cloudinaryPublicIdFromUrl(url);
    if (publicId) await deleteFromCloudinary(publicId, field === 'audioUrl' ? 'video' : 'image');
  }
  const updatedGroup = await prisma.questionGroup.update({ where: { id: groupId }, data: { [field]: null } });
  res.json({ success: true, data: { group: updatedGroup } });
};
