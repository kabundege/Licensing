import { Router } from 'express';
import { uploadSingleFileMiddleware } from '../../middleware/file-size-limit.middleware';

const router = Router();

router.get(`/health`, (_req, res) =>
  res.json({ module: `documents`, status: `stub` })
);

/** Multipart smoke-test — enforces 5MB via multer; does not persist business metadata yet. */
router.post(`/upload-demo`, uploadSingleFileMiddleware, (req, res) =>
  res.status(200).json({
    ok: true,
    storedAs: req.file?.filename ?? null,
    note: `Boilerplate upload path — replace with licensing document flows later.`,
  })
);

export { router as documentsRouter };
