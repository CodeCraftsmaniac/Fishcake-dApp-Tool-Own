// JWT Authentication - Token-based API security with DB persistence and token rotation
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { refreshTokenOps, db } from './database.js';
import logger from '../utils/logger.js';

// Secret key (should be from environment in production)
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

// Warn if JWT_SECRET is too short
if (JWT_SECRET.length < 32) {
  logger.warn('JWT_SECRET is less than 32 characters - consider using a longer secret for production');
}
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

// In-memory cache for fast lookup (synced with DB)
const MAX_REFRESH_TOKENS = 1000; // Memory cap
const refreshTokensCache = new Map<string, { userId: string; expiresAt: number }>();

/**
 * Hash a refresh token for safe DB storage (never store raw JWT)
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Load refresh tokens from DB into in-memory cache on startup
 */
export function loadRefreshTokensFromDB(): void {
  try {
    // Clean expired first
    refreshTokenOps.cleanupExpired.run();
    
    // Load active tokens via direct DB query
    const activeRows = db.prepare('SELECT token_hash, user_id, expires_at FROM refresh_tokens WHERE expires_at > unixepoch()').all() as Array<{ token_hash: string; user_id: string; expires_at: number }>;
    let count = 0;
    for (const row of activeRows) {
      refreshTokensCache.set(row.token_hash, {
        userId: row.user_id,
        expiresAt: row.expires_at * 1000, // Convert seconds to ms
      });
      count++;
    }
    logger.info(`Loaded ${count} refresh tokens from database`);
  } catch (error) {
    logger.error('Failed to load refresh tokens from DB:', { error: (error as Error).message });
  }
}
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
  
  // Store in DB (hash the token - never store raw JWT)
  const expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days
  const tokenHash = hashToken(token);
  try {
    refreshTokenOps.store.run(tokenHash, userId, sessionId, Math.floor(expiresAt / 1000));
    refreshTokensCache.set(tokenHash, { userId, expiresAt });
    // Enforce memory cap
    if (refreshTokensCache.size > MAX_REFRESH_TOKENS) {
      // Remove oldest entries
      const entries = Array.from(refreshTokensCache.entries()).sort((a, b) => a[1].expiresAt - b[1].expiresAt);
      for (let i = 0; i < entries.length - MAX_REFRESH_TOKENS / 2; i++) {
        refreshTokensCache.delete(entries[i][0]);
      }
    }
  } catch (error) {
    logger.error('Failed to persist refresh token:', { error: (error as Error).message });
  }
  
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
    
    // Check if token is in store (use hash for lookup)
    const tokenHash = hashToken(token);
    const cached = refreshTokensCache.get(tokenHash);
    if (!cached || cached.expiresAt < Date.now()) {
      // Also check DB in case cache is stale
      const dbRow = refreshTokenOps.getByHash.get(tokenHash) as any;
      if (!dbRow || dbRow.expires_at * 1000 < Date.now()) {
        // Clean up expired
        try { refreshTokenOps.deleteByHash.run(tokenHash); } catch {}
        refreshTokensCache.delete(tokenHash);
        return null;
      }
      // Cache it for next time
      refreshTokensCache.set(tokenHash, { userId: dbRow.user_id, expiresAt: dbRow.expires_at * 1000 });
      return payload;
    }
    
    return payload;
  } catch {
    return null;
  }
}

/**
 * Refresh access token using refresh token (with rotation - one-time use)
 */
export function refreshAccessToken(refreshToken: string): {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
} | null {
  const payload = verifyRefreshToken(refreshToken);
  if (!payload) {
    return null;
  }
  
  // Rotate: revoke the old refresh token (one-time use)
  revokeRefreshToken(refreshToken);
  
  // Issue a new token pair
  const newSessionId = payload.sessionId;
  const newAccessToken = generateAccessToken(payload.userId, newSessionId);
  const newRefreshToken = generateRefreshToken(payload.userId, newSessionId);
  
  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    expiresIn: 24 * 60 * 60,
  };
}

/**
 * Revoke refresh token
 */
export function revokeRefreshToken(token: string): boolean {
  const tokenHash = hashToken(token);
  try {
    refreshTokenOps.deleteByHash.run(tokenHash);
  } catch {}
  return refreshTokensCache.delete(tokenHash);
}

/**
 * Revoke all refresh tokens for a user
 */
export function revokeAllUserTokens(userId: string): number {
  try {
    refreshTokenOps.deleteByUserId.run(userId);
  } catch (error) {
    logger.error('Failed to revoke user tokens from DB:', { error: (error as Error).message });
  }

  // Also clean cache
  let count = 0;
  for (const [hash, data] of refreshTokensCache.entries()) {
    if (data.userId === userId) {
      refreshTokensCache.delete(hash);
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
  
  // Clean cache
  for (const [hash, data] of refreshTokensCache.entries()) {
    if (data.expiresAt < now) {
      refreshTokensCache.delete(hash);
      count++;
    }
  }
  
  // Clean DB
  try {
    const dbResult = refreshTokenOps.cleanupExpired.run();
    logger.debug('Cleaned up expired refresh tokens from DB');
  } catch (error) {
    logger.error('Failed to cleanup expired tokens from DB:', { error: (error as Error).message });
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
