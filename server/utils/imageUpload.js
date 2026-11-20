import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

export const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
// iPhone camera photos (HEIC/full-res JPEG, especially Live Photos and
// 48MP captures) routinely run 8-15MB, so the default needs real headroom.
export const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE, 10) || 20 * 1024 * 1024;

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext}`);
  },
});

/** Multer instance for image uploads (photos, selfies) */
export const imageUpload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpe?g|png|gif|webp|heic)$/i.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

/** Delete an uploaded file given its public /uploads/... url (best-effort) */
export const removeUpload = (url) => {
  if (url && url.startsWith('/uploads/')) {
    fs.unlink(path.join(UPLOAD_DIR, path.basename(url)), () => {});
  }
};
