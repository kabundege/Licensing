import { Router } from 'express';
import { requireJwt } from '../../middleware/auth.middleware';

const router = Router();

router.get(`/health`, (_req, res) =>
  res.json({ module: `auth`, status: `stub` })
);

/** Demonstrates JWT wiring — returns 403 without a valid Bearer token. */
router.get(`/me`, requireJwt, ({ auth }, res) =>
  res.json({ module: `auth`, subject: auth?.sub ?? null })
);

export { router as authRouter };
