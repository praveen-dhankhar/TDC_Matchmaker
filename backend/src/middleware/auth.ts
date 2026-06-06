import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AuthPayload {
  userId: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
}

/**
 * JWT authentication middleware.
 * Extracts token from httpOnly cookie or Authorization header.
 * Attaches decoded payload to req.user.
 */
export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // Try cookie first, then Authorization header
  const token =
    req.cookies?.token ||
    req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication token is required',
      statusCode: 401,
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as AuthPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired authentication token',
      statusCode: 401,
    });
  }
}
