import { Router, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { authService } from '../services/auth.service';
import { validateBody } from '../middleware/error';
import { loginSchema } from '../middleware/validation';
import { config } from '../config';
import { dataStore } from '../data/store';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: config.rateLimit.login.windowMs,
  max: config.rateLimit.login.max,
  message: {
    error: 'Too Many Requests',
    message: 'Too many login attempts. Please try again in 15 minutes.',
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/auth/login
 * Authenticate matchmaker and issue JWT in httpOnly cookie.
 */
router.post('/login', loginLimiter, validateBody(loginSchema), async (req, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    if (!result) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password',
        statusCode: 401,
      });
      return;
    }

    // Set JWT in httpOnly cookie
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: !config.isDev,
      sameSite: config.isDev ? 'lax' : 'none',
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    });

    res.json({
      user: result.user,
      token: result.token,
    });
  } catch (err) {
    console.error('[Auth Route] Login error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Login failed',
      statusCode: 500,
    });
  }
});

/**
 * POST /api/auth/logout
 * Clear the JWT cookie.
 */
router.post('/logout', authMiddleware, (_req, res: Response) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: !config.isDev,
    sameSite: config.isDev ? 'lax' : 'strict',
  });
  res.json({ message: 'Logged out successfully' });
});

/**
 * GET /api/auth/me
 * Return the currently authenticated user.
 */
router.get('/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Not authenticated',
      statusCode: 401,
    });
    return;
  }

  const user = dataStore.getUserById(req.user.userId);
  if (!user) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'User no longer exists',
      statusCode: 401,
    });
    return;
  }

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      assignedCustomerIds: user.assignedCustomerIds,
    },
  });
});

export default router;
