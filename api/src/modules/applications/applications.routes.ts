import { Router } from 'express';

const router = Router();

router.get(`/health`, (_req, res) =>
  res.json({ module: `applications`, status: `stub` })
);

export { router as applicationsRouter };
