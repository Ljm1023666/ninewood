import multer from 'multer';

import path from 'path';

import { config } from '../config.js';

import fs from 'fs';

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';



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

    const name = `${Date.now()}-${randomUUID()}${ext.toLowerCase()}`;

    cb(null, name);

  },

});



// 扩展名白名单

const allowedExts = /\.(jpg|jpeg|png|gif|webp|mp3|wav|ogg|mp4|mov|avi|webm|mkv|pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|7z|tar|gz|md|txt|csv|json|xml)$/i;



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

  limits: { fileSize: 100 * 1024 * 1024, files: 10, fields: 30 },

});



// ── Magic bytes 校验 ──



type MagicSig = { ext: string; offset: number; bytes: number[] };



const MAGIC_SIGNATURES: MagicSig[] = [

  { ext: 'jpg', offset: 0, bytes: [0xff, 0xd8, 0xff] },

  { ext: 'jpeg', offset: 0, bytes: [0xff, 0xd8, 0xff] },

  { ext: 'png', offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47] },

  { ext: 'gif', offset: 0, bytes: [0x47, 0x49, 0x46, 0x38] },

  { ext: 'webp', offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },

  { ext: 'mp4', offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] },

  { ext: 'mov', offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] },

  { ext: 'avi', offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },

  { ext: 'webm', offset: 0, bytes: [0x1a, 0x45, 0xdf, 0xa3] },

  { ext: 'mkv', offset: 0, bytes: [0x1a, 0x45, 0xdf, 0xa3] },

  { ext: 'mp3', offset: 0, bytes: [0xff, 0xfb] },

  { ext: 'mp3', offset: 0, bytes: [0x49, 0x44, 0x33] }, // ID3

  { ext: 'wav', offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },

  { ext: 'ogg', offset: 0, bytes: [0x4f, 0x67, 0x67, 0x53] },

  { ext: 'pdf', offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF

  { ext: 'zip', offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] },

  { ext: 'docx', offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] },

  { ext: 'xlsx', offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] },

  { ext: 'pptx', offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] },

  { ext: 'rar', offset: 0, bytes: [0x52, 0x61, 0x72, 0x21] }, // Rar!

  { ext: '7z', offset: 0, bytes: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c] },

  { ext: 'gz', offset: 0, bytes: [0x1f, 0x8b] },

  { ext: 'doc', offset: 0, bytes: [0xd0, 0xcf, 0x11, 0xe0] },

  { ext: 'xls', offset: 0, bytes: [0xd0, 0xcf, 0x11, 0xe0] },

  { ext: 'ppt', offset: 0, bytes: [0xd0, 0xcf, 0x11, 0xe0] },

];



/** 纯文本类扩展名：校验无 NUL 字节即可 */

const TEXT_LIKE_EXTS = new Set(['txt', 'md', 'csv', 'json', 'xml']);



function validateTextLikeFile(filePath: string): boolean {

  try {

    const fd = fs.openSync(filePath, 'r');

    const buf = Buffer.alloc(4096);

    const n = fs.readSync(fd, buf, 0, buf.length, 0);

    fs.closeSync(fd);

    for (let i = 0; i < n; i++) {

      if (buf[i] === 0) return false;

    }

    return true;

  } catch {

    return false;

  }

}



function checkMagicBytes(filePath: string, ext: string): boolean {

  const normalized = ext.toLowerCase();

  if (TEXT_LIKE_EXTS.has(normalized)) {

    return validateTextLikeFile(filePath);

  }



  const sigs = MAGIC_SIGNATURES.filter((s) => s.ext === normalized);

  if (sigs.length === 0) return false; // 未知扩展名拒绝



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


