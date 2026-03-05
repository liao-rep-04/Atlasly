import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import authRoutes from './auth.js';
import { initializeDatabase, query } from '../db.js';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Routes', () => {
  beforeAll(async () => {
    console.log('[TEST SETUP] Initializing database...');
    await initializeDatabase();

    // Clean up test users
    await query("DELETE FROM users WHERE username LIKE 'testuser%'");
    console.log('[TEST SETUP] ✓ Database ready for testing');
  });

  afterAll(async () => {
    console.log('[TEST CLEANUP] Cleaning up test data...');
    await query("DELETE FROM users WHERE username LIKE 'testuser%'");
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
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe(userData.username);
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.password).toBeUndefined();

      console.log('[TEST] ✅ PASS: User registered successfully');
    });

    it('should reject registration with missing fields', async () => {
      console.log('[TEST] Starting: should reject missing fields');

      const response = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser2' })
        .expect(400);

      expect(response.body.error).toBeDefined();

      console.log('[TEST] ✅ PASS: Missing fields rejected');
    });

    it('should reject registration with invalid email', async () => {
      console.log('[TEST] Starting: should reject invalid email');

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser3',
          email: 'invalid-email',
          password: 'TestPass123',
        })
        .expect(400);

      expect(response.body.error).toContain('email');

      console.log('[TEST] ✅ PASS: Invalid email rejected');
    });

    it('should reject registration with weak password', async () => {
      console.log('[TEST] Starting: should reject weak password');

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser4',
          email: 'testuser4@example.com',
          password: 'weak',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.details).toBeDefined();

      console.log('[TEST] ✅ PASS: Weak password rejected');
    });

    it('should reject duplicate username', async () => {
      console.log('[TEST] Starting: should reject duplicate username');

      // First registration
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser5',
          email: 'testuser5@example.com',
          password: 'TestPass123',
        })
        .expect(201);

      // Duplicate registration
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser5',
          email: 'different@example.com',
          password: 'TestPass123',
        })
        .expect(409);

      expect(response.body.error).toContain('already exists');

      console.log('[TEST] ✅ PASS: Duplicate username rejected');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeAll(async () => {
      console.log('[TEST SETUP] Creating test user for login tests...');

      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'logintest',
          email: 'logintest@example.com',
          password: 'TestPass123',
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
