import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { dataStore } from '../data/store';
import type { AuthPayload } from '../middleware/auth';

export class AuthService {
  /**
   * Authenticate a matchmaker by email/password.
   * Returns JWT token and user info on success, null on failure.
   */
  async login(email: string, password: string): Promise<{ token: string; user: { id: string; email: string; name: string } } | null> {
    const user = dataStore.getUserByEmail(email);
    if (!user) return null;

    const isValid = await bcryptjs.compare(password, user.passwordHash);
    if (!isValid) return null;

    const payload: AuthPayload = {
      userId: user.id,
      email: user.email,
    };

    const token = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  /**
   * Verify a JWT token and return the payload.
   */
  verifyToken(token: string): AuthPayload | null {
    try {
      return jwt.verify(token, config.jwt.secret) as AuthPayload;
    } catch {
      return null;
    }
  }
}

export const authService = new AuthService();
