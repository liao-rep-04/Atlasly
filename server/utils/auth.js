import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const SALT_ROUNDS = 10;

/**
 * Hash a password
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
export const hashPassword = async (password) => {
  try {
    console.log('[Auth] Hashing password...');
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    console.log('[Auth] ✓ Password hashed successfully');
    return hash;
  } catch (error) {
    console.error('[Auth] ❌ Password hashing failed:', error);
    throw new Error('Failed to hash password');
  }
};

/**
 * Compare password with hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} - True if passwords match
 */
export const comparePassword = async (password, hash) => {
  try {
    console.log('[Auth] Comparing passwords...');
    const match = await bcrypt.compare(password, hash);
    console.log(`[Auth] ${match ? '✓' : '✗'} Password comparison result: ${match}`);
    return match;
  } catch (error) {
    console.error('[Auth] ❌ Password comparison failed:', error);
    throw new Error('Failed to compare passwords');
  }
};

/**
 * Generate JWT token
 * @param {Object} payload - Token payload
 * @returns {string} - JWT token
 */
export const generateToken = (payload) => {
  try {
    console.log('[Auth] Generating JWT token for user:', payload.id);
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
    console.log('[Auth] ✓ JWT token generated successfully');
    return token;
  } catch (error) {
    console.error('[Auth] ❌ Token generation failed:', error);
    throw new Error('Failed to generate token');
  }
};

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {Object} - Decoded token payload
 */
export const verifyToken = (token) => {
  try {
    console.log('[Auth] Verifying JWT token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('[Auth] ✓ JWT token verified for user:', decoded.id);
    return decoded;
  } catch (error) {
    console.error('[Auth] ❌ Token verification failed:', error.message);
    throw new Error('Invalid or expired token');
  }
};

/**
 * Validate email format
 * @param {string} email - Email address
 * @returns {boolean} - True if valid
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(email);
  console.log(`[Auth] Email validation for "${email}": ${isValid ? '✓ Valid' : '✗ Invalid'}`);
  return isValid;
};

/**
 * Validate password strength
 * @param {string} password - Password
 * @returns {Object} - Validation result with isValid and errors
 */
export const validatePassword = (password) => {
  const errors = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  const isValid = errors.length === 0;
  console.log(`[Auth] Password validation: ${isValid ? '✓ Valid' : '✗ Invalid'} ${errors.length > 0 ? `(${errors.length} errors)` : ''}`);

  return {
    isValid,
    errors,
  };
};

export default {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  isValidEmail,
  validatePassword,
};
