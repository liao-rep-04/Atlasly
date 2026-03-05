import { verifyToken } from '../utils/auth.js';

/**
 * Authentication middleware
 * Verifies JWT token and attaches user data to request
 */
export const authenticate = (req, res, next) => {
  try {
    console.log(`[Middleware] Authenticating request to ${req.method} ${req.path}`);

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      console.log('[Middleware] ✗ No authorization header found');
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    if (!token) {
      console.log('[Middleware] ✗ Invalid authorization header format');
      return res.status(401).json({ error: 'Invalid authorization header format' });
    }

    const decoded = verifyToken(token);
    req.user = decoded;

    console.log(`[Middleware] ✓ User authenticated: ${decoded.id}`);
    next();
  } catch (error) {
    console.log('[Middleware] ✗ Authentication failed:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Optional authentication middleware
 * Attaches user data if token is present, but doesn't require it
 */
export const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : authHeader;

      const decoded = verifyToken(token);
      req.user = decoded;
      console.log(`[Middleware] ✓ Optional auth: User ${decoded.id} authenticated`);
    } else {
      console.log('[Middleware] ⊘ Optional auth: No token provided (continuing)');
    }

    next();
  } catch (error) {
    console.log('[Middleware] ⊘ Optional auth: Invalid token (continuing)');
    next();
  }
};

export default {
  authenticate,
  optionalAuth,
};
