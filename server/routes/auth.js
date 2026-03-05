import express from 'express';
import { query } from '../db.js';
import {
  hashPassword,
  comparePassword,
  generateToken,
  isValidEmail,
  validatePassword,
} from '../utils/auth.js';

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
  console.log('[Auth Route] POST /register - Registration attempt');

  try {
    const { username, email, password, fullName } = req.body;

    // Validation
    if (!username || !email || !password) {
      console.log('[Auth Route] ✗ Missing required fields');
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (!isValidEmail(email)) {
      console.log('[Auth Route] ✗ Invalid email format');
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      console.log('[Auth Route] ✗ Password validation failed');
      return res.status(400).json({
        error: 'Password does not meet requirements',
        details: passwordValidation.errors,
      });
    }

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      console.log('[Auth Route] ✗ User already exists');
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    // Create user
    const userId = Date.now().toString();
    const passwordHash = await hashPassword(password);

    await query(
      `INSERT INTO users (id, username, email, password_hash, full_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [userId, username, email, passwordHash, fullName || null]
    );

    console.log(`[Auth Route] ✓ User created: ${userId}`);

    // Generate token
    const token = generateToken({ id: userId, username, email });

    const user = {
      id: userId,
      username,
      email,
      fullName: fullName || null,
    };

    console.log('[Auth Route] ✅ Registration successful');
    res.status(201).json({ token, user });
  } catch (error) {
    console.error('[Auth Route] ❌ Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req, res) => {
  console.log('[Auth Route] POST /login - Login attempt');

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      console.log('[Auth Route] ✗ Missing credentials');
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user
    const result = await query(
      'SELECT id, username, email, password_hash, full_name FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      console.log('[Auth Route] ✗ User not found');
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = result.rows[0];

    // Verify password
    const isMatch = await comparePassword(password, user.password_hash);

    if (!isMatch) {
      console.log('[Auth Route] ✗ Invalid password');
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    console.log(`[Auth Route] ✓ Password verified for user: ${user.id}`);

    // Generate token
    const token = generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
    });

    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
    };

    console.log('[Auth Route] ✅ Login successful');
    res.json({ token, user: userData });
  } catch (error) {
    console.error('[Auth Route] ❌ Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
