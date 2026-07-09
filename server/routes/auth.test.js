import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import authRoutes from './auth.js';
import { initializeDatabase, query } from '../db.js';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);


// Registration is multipart (selfie required); this builds a valid request
const SELFIE = Buffer.from(
  '89504e470d0a1a0a0000000d4948445200000001000000010806000000' +
  '1f15c4890000000d49444154789c63f8cfc0f01f0005050200' +
  '9a1c1ca20000000049454e44ae426082',
  'hex'
);

const registerRequest = (fields, { selfie = true } = {}) => {
  let req = request(app).post('/api/auth/register');
  for (const [key, value] of Object.entries(fields)) {
    req = req.field(key, value);
  }
  if (selfie) req = req.attach('selfie', SELFIE, 'selfie.png');
  return req;
};

describe('Auth Routes', () => {
  beforeAll(async () => {
    console.log('[TEST SETUP] Initializing database...');
    await initializeDatabase();

    // Clean up test users
    await query("DELETE FROM users WHERE username LIKE 'testuser%' OR username = 'logintest'");
    console.log('[TEST SETUP] ✓ Database ready for testing');
  });

  afterAll(async () => {
    console.log('[TEST CLEANUP] Cleaning up test data...');
    await query("DELETE FROM users WHERE username LIKE 'testuser%' OR username = 'logintest'");
    console.log('[TEST CLEANUP] ✓ Cleanup complete');
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      console.log('[TEST] Starting: should register a new user successfully');

      const userData = {
        username: 'testuser1',
        email: 'testuser1@example.com',
        password: 'TestPass123',
        fullName: 'Test User One',
        gender: 'other',
      };

      const response = await registerRequest(userData).expect(201);

      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe(userData.username);
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.password).toBeUndefined();

      console.log('[TEST] ✅ PASS: User registered successfully');
    });

    it('should reject registration with missing fields', async () => {
      console.log('[TEST] Starting: should reject missing fields');

      const response = await registerRequest({ username: 'testuser2' }).expect(400);

      expect(response.body.error).toBeDefined();

      console.log('[TEST] ✅ PASS: Missing fields rejected');
    });

    it('should reject registration with invalid email', async () => {
      console.log('[TEST] Starting: should reject invalid email');

      const response = await registerRequest({
        username: 'testuser3',
        email: 'invalid-email',
        password: 'TestPass123',
        gender: 'other',
      }).expect(400);

      expect(response.body.error).toContain('email');

      console.log('[TEST] ✅ PASS: Invalid email rejected');
    });

    it('should reject registration with weak password', async () => {
      console.log('[TEST] Starting: should reject weak password');

      const response = await registerRequest({
        username: 'testuser4',
        email: 'testuser4@example.com',
        password: 'weak',
        gender: 'other',
      }).expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.details).toBeDefined();

      console.log('[TEST] ✅ PASS: Weak password rejected');
    });

    it('should reject registration without a selfie', async () => {
      const response = await registerRequest(
        {
          username: 'testuser6',
          email: 'testuser6@example.com',
          password: 'TestPass123',
          gender: 'other',
        },
        { selfie: false }
      ).expect(400);

      expect(response.body.error).toContain('selfie');
    });

    it('should reject registration without a gender', async () => {
      const response = await registerRequest({
        username: 'testuser7',
        email: 'testuser7@example.com',
        password: 'TestPass123',
      }).expect(400);

      expect(response.body.error).toContain('Gender');
    });

    it('should reject duplicate username', async () => {
      console.log('[TEST] Starting: should reject duplicate username');

      // First registration
      await registerRequest({
        username: 'testuser5',
        email: 'testuser5@example.com',
        password: 'TestPass123',
        gender: 'female',
      }).expect(201);

      // Duplicate registration
      const response = await registerRequest({
        username: 'testuser5',
        email: 'different@example.com',
        password: 'TestPass123',
        gender: 'male',
      }).expect(409);

      expect(response.body.error).toContain('already exists');

      console.log('[TEST] ✅ PASS: Duplicate username rejected');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeAll(async () => {
      console.log('[TEST SETUP] Creating test user for login tests...');

      await registerRequest({
        username: 'logintest',
        email: 'logintest@example.com',
        password: 'TestPass123',
        gender: 'other',
      });

      console.log('[TEST SETUP] ✓ Login test user created');
    });

    it('should login with correct credentials', async () => {
      console.log('[TEST] Starting: should login with correct credentials');

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'logintest',
          password: 'TestPass123',
        })
        .expect(200);

      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe('logintest');

      console.log('[TEST] ✅ PASS: Login successful with correct credentials');
    });

    it('should reject login with wrong password', async () => {
      console.log('[TEST] Starting: should reject wrong password');

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'logintest',
          password: 'WrongPassword123',
        })
        .expect(401);

      expect(response.body.error).toBeDefined();

      console.log('[TEST] ✅ PASS: Wrong password rejected');
    });

    it('should reject login with non-existent user', async () => {
      console.log('[TEST] Starting: should reject non-existent user');

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistentuser',
          password: 'TestPass123',
        })
        .expect(401);

      expect(response.body.error).toBeDefined();

      console.log('[TEST] ✅ PASS: Non-existent user rejected');
    });

    it('should reject login with missing credentials', async () => {
      console.log('[TEST] Starting: should reject missing credentials');

      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'logintest' })
        .expect(400);

      expect(response.body.error).toBeDefined();

      console.log('[TEST] ✅ PASS: Missing credentials rejected');
    });
  });
});
