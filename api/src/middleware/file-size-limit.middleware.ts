import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const uploadsRoot = path.resolve(process.cwd(), `uploads`);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(uploadsRoot, { recursive: true });
    cb(null, uploadsRoot);
  },
  filename: (_req, file, cb) => {
    const rawExt = path.extname(file.originalname ?? ``);
    const ext =
      rawExt.length > 0 && rawExt.length <= 16 ? rawExt.replace(/[^\w.]/g, ``) : ``;
    cb(null, `${randomUUID()}${ext}`);
  },
});

export const limitedUpload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES },
});


export const uploadSingleFileMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  limitedUpload.single(`file`)(req, res, (err) => {
    if (err) {
      next(err);
      return;
    }
    next();
  });
};
