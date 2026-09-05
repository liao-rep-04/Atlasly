import express from 'express';
import { randomUUID, randomBytes, createHash } from 'crypto';
import { query } from '../db.js';
import {
  hashPassword,
  comparePassword,
  generateToken,
  isValidEmail,
  validatePassword,
} from '../utils/auth.js';
import { imageUpload, removeUpload } from '../utils/imageUpload.js';
import { authenticate } from '../middleware/auth.js';
import { sendMail, mailerConfigured } from '../utils/mailer.js';

const router = express.Router();

const GENDERS = ['female', 'male', 'other'];

const toPublicUser = (row) => ({
  id: row.id,
  username: row.username,
  email: row.email,
  fullName: row.full_name,
  selfieUrl: row.selfie_url,
  gender: row.gender,
});

/**
 * POST /api/auth/register
 * Register a new user. Multipart: fields username/email/password/fullName/gender
 * plus a required "selfie" image (used as the playback avatar head).
 */
router.post('/register', imageUpload.single('selfie'), async (req, res) => {
  console.log('[Auth Route] POST /register - Registration attempt');

  const rejectUpload = () => req.file && removeUpload(`/uploads/${req.file.filename}`);

  try {
    const { username, email, password, fullName, gender } = req.body;

    // Validation
    if (!username || !email || !password) {
      console.log('[Auth Route] ✗ Missing required fields');
      rejectUpload();
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (!req.file) {
      console.log('[Auth Route] ✗ Missing selfie');
      return res.status(400).json({ error: 'A profile photo is required' });
    }

    if (!GENDERS.includes(gender)) {
      console.log('[Auth Route] ✗ Missing/invalid gender');
      rejectUpload();
      return res.status(400).json({ error: 'Gender is required (female, male, or other)' });
    }

    if (!isValidEmail(email)) {
      console.log('[Auth Route] ✗ Invalid email format');
      rejectUpload();
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      console.log('[Auth Route] ✗ Password validation failed');
      rejectUpload();
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
      rejectUpload();
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    // Create user
    const userId = randomUUID();
    const passwordHash = await hashPassword(password);
    const selfieUrl = `/uploads/${req.file.filename}`;

    await query(
      `INSERT INTO users (id, username, email, password_hash, full_name, selfie_url, gender, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
      [userId, username, email, passwordHash, fullName || null, selfieUrl, gender]
    );

    console.log(`[Auth Route] ✓ User created: ${userId}`);

    // Generate token
    const token = generateToken({ id: userId, username, email });

    const user = {
      id: userId,
      username,
      email,
      fullName: fullName || null,
      selfieUrl,
      gender,
    };

    console.log('[Auth Route] ✅ Registration successful');
    res.status(201).json({ token, user });
  } catch (error) {
    console.error('[Auth Route] ❌ Registration error:', error);
    rejectUpload();
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/auth/profile
 * Complete/update profile (selfie and/or gender) for existing accounts.
 */
router.put('/profile', authenticate, imageUpload.single('selfie'), async (req, res) => {
  try {
    const { gender } = req.body;
    if (gender && !GENDERS.includes(gender)) {
      return res.status(400).json({ error: 'Gender must be female, male, or other' });
    }
    if (!gender && !req.file) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    const current = await query('SELECT selfie_url FROM users WHERE id = $1', [req.user.id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const selfieUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const result = await query(
      `UPDATE users SET
         selfie_url = COALESCE($2, selfie_url),
         gender = COALESCE($3, gender),
         updated_at = NOW()
       WHERE id = $1
       RETURNING id, username, email, full_name, selfie_url, gender`,
      [req.user.id, selfieUrl, gender || null]
    );

    if (req.file) removeUpload(current.rows[0].selfie_url);

    console.log(`[Auth Route] ✓ Profile updated: ${req.user.id}`);
    res.json({ user: toPublicUser(result.rows[0]) });
  } catch (error) {
    console.error('[Auth Route] ❌ Profile update error:', error);
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
    const { username, password, remember } = req.body;

    if (!username || !password) {
      console.log('[Auth Route] ✗ Missing credentials');
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user
    const result = await query(
      'SELECT id, username, email, password_hash, full_name, selfie_url, gender FROM users WHERE username = $1',
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

    // "Remember me" trades a longer session for not re-logging-in as often;
    // it never stores the password itself — that's the browser's job
    // (see the autoComplete attributes on the login form)
    const token = generateToken(
      { id: user.id, username: user.username, email: user.email },
      remember ? { expiresIn: '30d' } : {}
    );

    console.log('[Auth Route] ✅ Login successful');
    res.json({ token, user: toPublicUser(user) });
  } catch (error) {
    console.error('[Auth Route] ❌ Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const hashToken = (token) => createHash('sha256').update(token).digest('hex');

const issueResetToken = async (userId) => {
  const rawToken = randomBytes(32).toString('hex');
  await query(
    `INSERT INTO password_resets (id, user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [randomUUID(), userId, hashToken(rawToken), new Date(Date.now() + RESET_TOKEN_TTL_MS)]
  );
  return rawToken;
};

/**
 * POST /api/auth/forgot-username
 * Body: { email }. Identifies the account by email alone (email is the
 * unique, private identifier here — username recovery never needs proof
 * of anything else).
 *
 * With email delivery configured: emails the username, generic response
 * either way (can't be used to enumerate registered emails).
 * Without it configured (pre-launch default): reveals the username
 * directly in the response — there's no out-of-band channel to send it
 * through yet. Set RESEND_API_KEY before a public launch to require the
 * email round-trip instead.
 */
router.post('/forgot-username', async (req, res) => {
  const genericResponse = {
    message: "If an account exists for that email, we've sent your username.",
  };
  try {
    const { email } = req.body;
    if (!email || !isValidEmail(email)) {
      return mailerConfigured()
        ? res.json(genericResponse)
        : res.status(400).json({ error: 'A valid email is required' });
    }

    const result = await query('SELECT id, username FROM users WHERE email = $1', [
      email.trim(),
    ]);

    if (!mailerConfigured()) {
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'No account found with that email' });
      }
      console.log(
        `[Auth Route] ⚠️ Username revealed without email verification ` +
          `(RESEND_API_KEY not set) for user: ${result.rows[0].id}`
      );
      return res.json({ username: result.rows[0].username });
    }

    if (result.rows.length === 0) {
      console.log('[Auth Route] ⊘ Forgot-username request for unknown email (silent)');
      return res.json(genericResponse);
    }
    const user = result.rows[0];
    await sendMail({
      to: email.trim(),
      subject: 'Your Atlasly username',
      text: `Your Atlasly username is: ${user.username}`,
      html: `<p>Your Atlasly username is: <strong>${user.username}</strong></p>`,
    });
    console.log(`[Auth Route] ✓ Username emailed for user: ${user.id}`);
    res.json(genericResponse);
  } catch (error) {
    console.error('[Auth Route] ❌ Forgot-username error:', error);
    res.json(genericResponse);
  }
});

/**
 * POST /api/auth/forgot-password
 * Body: { username }. Identifies the account by username alone.
 *
 * With email delivery configured: sends the reset link to the email
 * already on file for that username (never asked for — we already know
 * it), generic response either way. Without it configured (pre-launch
 * default): hands the reset token straight back in the response, skipping
 * email entirely — no proof of anything beyond knowing the username. This
 * is intentionally the weaker, temporary posture; set RESEND_API_KEY
 * before a public launch and this branch stops running on its own.
 */
router.post('/forgot-password', async (req, res) => {
  const genericResponse = {
    message: "If that username exists, we've sent password reset instructions to the email on file.",
  };
  try {
    const { username } = req.body;
    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const result = await query('SELECT id, email FROM users WHERE username = $1', [
      username.trim(),
    ]);

    if (!mailerConfigured()) {
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'No account found with that username' });
      }
      const rawToken = await issueResetToken(result.rows[0].id);
      console.log(
        `[Auth Route] ⚠️ Password reset issued without email verification ` +
          `(RESEND_API_KEY not set) for user: ${result.rows[0].id}`
      );
      return res.json({ resetToken: rawToken });
    }

    if (result.rows.length === 0) {
      console.log('[Auth Route] ⊘ Forgot-password request for unknown username (silent)');
      return res.json(genericResponse);
    }
    const user = result.rows[0];
    const rawToken = await issueResetToken(user.id);

    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const resetLink = `${appUrl}/reset-password?token=${rawToken}`;
    await sendMail({
      to: user.email,
      subject: 'Reset your Atlasly password',
      text:
        `To reset your password, visit this link (valid for 1 hour):\n${resetLink}\n\n` +
        `If you didn't request this, you can safely ignore this email.`,
      html:
        `<p><a href="${resetLink}">Click here to reset your password</a> (valid for 1 hour).</p>` +
        `<p>If you didn't request this, you can safely ignore this email.</p>`,
    });

    console.log(`[Auth Route] ✓ Password reset requested for user: ${user.id}`);
    res.json(genericResponse);
  } catch (error) {
    console.error('[Auth Route] ❌ Forgot-password error:', error);
    res.json(genericResponse);
  }
});

/**
 * GET /api/auth/reset/validate?token=...
 * Lets the reset-password page show an upfront "this link expired" state
 * instead of only failing on submit.
 */
router.get('/reset/validate', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.json({ valid: false });

    const result = await query(
      `SELECT id FROM password_resets
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()`,
      [hashToken(token)]
    );
    res.json({ valid: result.rows.length > 0 });
  } catch (error) {
    console.error('[Auth Route] ❌ Reset validate error:', error);
    res.json({ valid: false });
  }
});

/**
 * POST /api/auth/reset
 * Body: { token, password }. Applies a new password for the token's
 * account and burns the token (and any other outstanding ones for that
 * account, so an old unread reset email can't be replayed afterward).
 */
router.post('/reset', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Password does not meet requirements',
        details: passwordValidation.errors,
      });
    }

    const result = await query(
      `SELECT id, user_id FROM password_resets
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()`,
      [hashToken(token)]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'This reset link is invalid or has expired' });
    }
    const reset = result.rows[0];

    const passwordHash = await hashPassword(password);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
      passwordHash, reset.user_id,
    ]);
    await query(
      `UPDATE password_resets SET used_at = NOW()
       WHERE user_id = $1 AND used_at IS NULL`,
      [reset.user_id]
    );

    console.log(`[Auth Route] ✓ Password reset completed for user: ${reset.user_id}`);
    res.json({ success: true });
  } catch (error) {
    console.error('[Auth Route] ❌ Reset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
