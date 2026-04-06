// JWT Authentication - Token-based API security
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Secret key (should be from environment in production)
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const ACCESS_TOKEN_EXPIRY = '24h';
const REFRESH_TOKEN_EXPIRY = '7d';

export interface TokenPayload {
  userId: string;
  sessionId: string;
  type: 'access' | 'refresh';
}

export interface AuthenticatedRequest extends Request {
  userId?: string;
  sessionId?: string;
}

// Store for refresh tokens (in production, use Redis or database)
const refreshTokens = new Map<string, { userId: string; expiresAt: number }>();

/**
 * Generate access token
 */
export function generateAccessToken(userId: string, sessionId: string): string {
  const payload: TokenPayload = {
    userId,
    sessionId,
    type: 'access',
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(userId: string, sessionId: string): string {
  const payload: TokenPayload = {
    userId,
    sessionId,
    type: 'refresh',
  };
  
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
  
  // Store refresh token
  const expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days
  refreshTokens.set(token, { userId, expiresAt });
  
  return token;
}

/**
 * Generate both tokens
 */
export function generateTokenPair(userId: string): {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
} {
  const sessionId = crypto.randomBytes(16).toString('hex');
  
  return {
    accessToken: generateAccessToken(userId, sessionId),
    refreshToken: generateRefreshToken(userId, sessionId),
    expiresIn: 24 * 60 * 60, // 24 hours in seconds
  };
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
    if (payload.type !== 'access') {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
    if (payload.type !== 'refresh') {
      return null;
    }
    
    // Check if token is in store
    const stored = refreshTokens.get(token);
    if (!stored || stored.expiresAt < Date.now()) {
      refreshTokens.delete(token);
      return null;
    }
    
    return payload;
  } catch {
    return null;
  }
}

/**
 * Refresh access token using refresh token
 */
export function refreshAccessToken(refreshToken: string): {
  accessToken: string;
  expiresIn: number;
} | null {
  const payload = verifyRefreshToken(refreshToken);
  if (!payload) {
    return null;
  }
  
  return {
    accessToken: generateAccessToken(payload.userId, payload.sessionId),
    expiresIn: 24 * 60 * 60,
  };
}

/**
 * Revoke refresh token
 */
export function revokeRefreshToken(token: string): boolean {
  return refreshTokens.delete(token);
}

/**
 * Revoke all refresh tokens for a user
 */
export function revokeAllUserTokens(userId: string): number {
  let count = 0;
  for (const [token, data] of refreshTokens.entries()) {
    if (data.userId === userId) {
      refreshTokens.delete(token);
      count++;
    }
  }
  return count;
}

/**
 * Express middleware for authentication
 */
export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // Get token from header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'No token provided',
    });
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyAccessToken(token);
  
  if (!payload) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
    return;
  }

  // Attach user info to request
  req.userId = payload.userId;
  req.sessionId = payload.sessionId;
  
  next();
}

/**
 * Optional auth middleware (doesn't fail if no token)
 */
export function optionalAuthMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);
    if (payload) {
      req.userId = payload.userId;
      req.sessionId = payload.sessionId;
    }
  }
  next();
}

/**
 * Cleanup expired refresh tokens (call periodically)
 */
export function cleanupExpiredTokens(): number {
  const now = Date.now();
  let count = 0;
  
  for (const [token, data] of refreshTokens.entries()) {
    if (data.expiresAt < now) {
      refreshTokens.delete(token);
      count++;
    }
  }
  
  return count;
}

// Cleanup every hour
setInterval(cleanupExpiredTokens, 60 * 60 * 1000);

/**
 * Create authentication routes
 */
export function createAuthRoutes(router: any) {
  // Login (simplified - in production would verify credentials)
  router.post('/auth/login', (req: Request, res: Response) => {
    const { passphrase } = req.body;
    
    if (!passphrase) {
      return res.status(400).json({
        success: false,
        error: 'Passphrase required',
      });
    }

    // Generate user ID from passphrase hash (simplified)
    const userId = crypto.createHash('sha256').update(passphrase).digest('hex').slice(0, 16);
    const tokens = generateTokenPair(userId);

    res.json({
      success: true,
      data: tokens,
    });
  });

  // Refresh token
  router.post('/auth/refresh', (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token required',
      });
    }

    const result = refreshAccessToken(refreshToken);
    if (!result) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
      });
    }

    res.json({
      success: true,
      data: result,
    });
  });

  // Logout
  router.post('/auth/logout', (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      revokeRefreshToken(refreshToken);
    }

    res.json({
      success: true,
      message: 'Logged out',
    });
  });

  return router;
}
