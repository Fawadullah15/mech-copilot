import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'mech-copilot-api'
  });
});

export { router as healthRouter };
