import { Router, Response } from 'express';
import { dataStore } from '../data/store';
import type { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /api/profiles/pool?gender=Male|Female
 * Fetch the opposite-gender dummy pool used by the matching engine.
 */
router.get('/pool', (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Not authenticated',
      statusCode: 401,
    });
    return;
  }

  const gender = req.query.gender;
  if (gender !== 'Male' && gender !== 'Female') {
    res.status(400).json({
      error: 'Validation Error',
      message: 'gender query parameter must be Male or Female',
      statusCode: 400,
    });
    return;
  }

  const profiles = dataStore.getMatchingPool(gender);
  res.json({ profiles });
});

export default router;
