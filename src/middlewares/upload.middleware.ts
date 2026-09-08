import multer from 'multer';

const allowedMimeTypes = new Set([
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export const mediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (allowedMimeTypes.has(file.mimetype)) {
      callback(null, true);
      return;
    }
    callback(new Error(`Định dạng file không hỗ trợ: ${file.mimetype}. Chỉ chấp nhận audio (mp3/wav/ogg) và ảnh (jpeg/png/webp).`));
  },
});

export const spreadsheetUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowed = new Set(['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv']);
    callback(null, allowed.has(file.mimetype) || /\.(xlsx|xls|csv)$/i.test(file.originalname));
  },
});
