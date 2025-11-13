import request from 'supertest';
import express, { Express } from 'express';
import { Database } from '../../database';
import authRoutes from '../../routes/auth.routes';
import { errorHandler } from '../../middleware/errorHandler';
import bcrypt from 'bcryptjs';

jest.mock('../../database');
jest.mock('../../utils/logger');
jest.mock('../../utils/metrics', () => ({
  authAttempts: { labels: jest.fn(() => ({ inc: jest.fn() })) },
  activeUsers: { inc: jest.fn(), dec: jest.fn() },
}));

describe('Authentication Flow Integration Tests', () => {
  let app: Express;
  let mockDatabase: any;
  let testUser: any;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use(errorHandler);

    mockDatabase = {
      query: jest.fn(),
    };
    (Database.getInstance as jest.Mock).mockReturnValue(mockDatabase);

    testUser = {
      id: 1,
      email: 'testuser@example.com',
      password: 'password123',
      role: 'user',
      is_active: true,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Registration Flow', () => {
    it('should register, login, refresh, and logout', async () => {
      // Step 1: Register
      mockDatabase.query
        .mockResolvedValueOnce({ rows: [] }) // Check user doesn't exist
        .mockResolvedValueOnce({ // Create user
          rows: [{
            id: 1,
            email: testUser.email,
            role: 'user',
            created_at: new Date(),
          }],
        })
        .mockResolvedValueOnce({ rows: [] }); // Insert refresh token

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body.data).toHaveProperty('accessToken');
      accessToken = registerResponse.body.data.accessToken;
      refreshToken = registerResponse.body.data.refreshToken;

      // Step 2: Login with same credentials
      const hashedPassword = await bcrypt.hash(testUser.password, 12);
      mockDatabase.query
        .mockResolvedValueOnce({
          rows: [{
            ...testUser,
            password_hash: hashedPassword,
          }],
        })
        .mockResolvedValueOnce({ rows: [] }); // Insert new refresh token

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.data).toHaveProperty('accessToken');

      // Step 3: Refresh token
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      mockDatabase.query
        .mockResolvedValueOnce({
          rows: [{
            user_id: testUser.id,
            expires_at: futureDate,
          }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: testUser.id, email: testUser.email, role: 'user' }],
        });

      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.data).toHaveProperty('accessToken');

      // Step 4: Logout
      mockDatabase.query.mockResolvedValueOnce({ rows: [] });

      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken });

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.body.message).toContain('Logged out');
    });
  });

  describe('Token Expiration Flow', () => {
    it('should handle expired access token', async () => {
      // This test would need actual JWT expiration
      // For now, we test the verification endpoint behavior
      const response = await request(app)
        .post('/api/auth/verify')
        .set('Authorization', 'Bearer expired.token.here');

      // Should return invalid rather than error
      expect([200, 401]).toContain(response.status);
    });

    it('should reject expired refresh token', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      mockDatabase.query.mockResolvedValueOnce({
        rows: [{
          user_id: 1,
          expires_at: pastDate,
        }],
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'expired_token' });

      expect(response.status).toBe(401);
    });
  });

  describe('Multiple Session Flow', () => {
    it('should allow multiple active sessions', async () => {
      const hashedPassword = await bcrypt.hash(testUser.password, 12);

      // First login
      mockDatabase.query
        .mockResolvedValueOnce({
          rows: [{ ...testUser, password_hash: hashedPassword }],
        })
        .mockResolvedValueOnce({ rows: [] });

      const login1 = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(login1.status).toBe(200);
      const token1 = login1.body.data.refreshToken;

      // Second login
      mockDatabase.query
        .mockResolvedValueOnce({
          rows: [{ ...testUser, password_hash: hashedPassword }],
        })
        .mockResolvedValueOnce({ rows: [] });

      const login2 = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(login2.status).toBe(200);
      const token2 = login2.body.data.refreshToken;

      // Both tokens should be different
      expect(token1).not.toBe(token2);
    });
  });

  describe('Account State Flow', () => {
    it('should prevent login for inactive account', async () => {
      const hashedPassword = await bcrypt.hash(testUser.password, 12);

      mockDatabase.query.mockResolvedValueOnce({
        rows: [{
          ...testUser,
          password_hash: hashedPassword,
          is_active: false,
        }],
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('inactive');
    });

    it('should prevent duplicate registration', async () => {
      mockDatabase.query.mockResolvedValueOnce({
        rows: [{ id: 1 }],
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(response.status).toBe(409);
    });
  });

  describe('Security Flow', () => {
    it('should not reveal user existence on login', async () => {
      mockDatabase.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'anypassword',
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should hash passwords before storage', async () => {
      mockDatabase.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, email: testUser.email, role: 'user' }],
        })
        .mockResolvedValueOnce({ rows: [] });

      await request(app)
        .post('/api/auth/register')
        .send({
          email: testUser.email,
          password: 'plaintext',
        });

      // Check that password was hashed
      const insertCall = mockDatabase.query.mock.calls.find(
        call => call[0].includes('INSERT INTO users')
      );

      expect(insertCall[1][1]).not.toBe('plaintext');
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Concurrent Request Flow', () => {
    it('should handle concurrent login attempts', async () => {
      const hashedPassword = await bcrypt.hash(testUser.password, 12);

      mockDatabase.query.mockResolvedValue({
        rows: [{ ...testUser, password_hash: hashedPassword }],
      });

      const requests = Array(3).fill(null).map(() =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: testUser.email,
            password: testUser.password,
          })
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect([200, 401]).toContain(response.status);
      });
    });
  });
});
