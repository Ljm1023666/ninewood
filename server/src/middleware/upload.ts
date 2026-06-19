import multer from 'multer';
import path from 'path';
import { config } from '../config.js';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';

if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

// 按字段名分目录
const FIELD_DIRS: Record<string, string> = {
  avatar: path.join(config.uploadDir, 'avatars'),
  cover: path.join(config.uploadDir, 'covers'),
  demandCardCover: path.join(config.uploadDir, 'card-covers'),
}

for (const dir of Object.values(FIELD_DIRS)) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const target = FIELD_DIRS[file.fieldname] || config.uploadDir;
    cb(null, target);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

// 扩展名白名单
const allowedExts = /\.(jpg|jpeg|png|gif|webp|mp3|wav|ogg|mp4|mov|avi|webm|mkv)$/i;

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (allowedExts.test(path.extname(file.originalname))) {
    cb(null, true);
  } else {
    cb(new Error('不支持的文件类型'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 },
});

// ── Magic bytes 校验 ──

type MagicSig = { ext: string; offset: number; bytes: number[] };

const MAGIC_SIGNATURES: MagicSig[] = [
  { ext: 'jpg', offset: 0, bytes: [0xff, 0xd8, 0xff] },
  { ext: 'jpeg', offset: 0, bytes: [0xff, 0xd8, 0xff] },
  { ext: 'png', offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47] },
  { ext: 'gif', offset: 0, bytes: [0x47, 0x49, 0x46, 0x38] },
  { ext: 'webp', offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF....WEBP at offset 8
  { ext: 'mp4', offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }, // ....ftyp
  { ext: 'mov', offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] },
  { ext: 'avi', offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF....AVI
  { ext: 'webm', offset: 0, bytes: [0x1a, 0x45, 0xdf, 0xa3] },
  { ext: 'mp3', offset: 0, bytes: [0xff, 0xfb] }, // MPEG frame sync (also 0xff 0xf3)
  { ext: 'wav', offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF....WAVE
  { ext: 'ogg', offset: 0, bytes: [0x4f, 0x67, 0x67, 0x53] }, // OggS
];

function checkMagicBytes(filePath: string, ext: string): boolean {
  const sigs = MAGIC_SIGNATURES.filter((s) => s.ext === ext.toLowerCase());
  if (sigs.length === 0) return true; // 无签名定义则放行

  try {
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(Math.max(...sigs.map((s) => s.offset + s.bytes.length)));
    fs.readSync(fd, buf, 0, buf.length, 0);
    fs.closeSync(fd);

    for (const sig of sigs) {
      const match = sig.bytes.every((b, i) => buf[sig.offset + i] === b);
      if (match) return true;
    }
    return false;
  } catch {
    return false;
  }
}

function validateFile(file: Express.Multer.File): boolean {
  const ext = path.extname(file.originalname).replace('.', '').toLowerCase();
  if (!checkMagicBytes(file.path, ext)) {
    fs.unlink(file.path, () => {});
    return false;
  }
  return true;
}

/**
 * Multer 后置校验中间件 — 用 magic bytes 验证上传文件内容与扩展名一致。
 * 支持 upload.single() (req.file) 和 upload.fields() (req.files)。
 */
export function verifyUpload(req: Request, res: Response, next: NextFunction): void {
  // upload.single() → req.file
  if (req.file && !validateFile(req.file)) {
    res.status(400).json({ success: false, message: '文件类型与内容不符' });
    return;
  }
  // upload.fields() → req.files
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  if (files) {
    for (const field of Object.values(files)) {
      for (const file of field) {
        if (!validateFile(file)) {
          res.status(400).json({ success: false, message: '文件类型与内容不符' });
          return;
        }
      }
    }
  }
  next();
}
