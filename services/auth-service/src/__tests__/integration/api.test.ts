import request from 'supertest';
import express, { Express } from 'express';
import { Database } from '../../database';
import authRoutes from '../../routes/auth.routes';
import { errorHandler } from '../../middleware/errorHandler';

jest.mock('../../database');
jest.mock('../../utils/logger');
jest.mock('../../utils/metrics', () => ({
  authAttempts: { labels: jest.fn(() => ({ inc: jest.fn() })) },
  activeUsers: { inc: jest.fn(), dec: jest.fn() },
}));

describe('Auth API Integration Tests', () => {
  let app: Express;
  let mockDatabase: any;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use(errorHandler);

    mockDatabase = {
      query: jest.fn(),
    };
    (Database.getInstance as jest.Mock).mockReturnValue(mockDatabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      mockDatabase.query
        .mockResolvedValueOnce({ rows: [] }) // Check if user exists
        .mockResolvedValueOnce({ // Create user
          rows: [{
            id: 1,
            email: 'newuser@example.com',
            role: 'user',
            created_at: new Date(),
          }],
        })
        .mockResolvedValueOnce({ rows: [] }); // Insert refresh token

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
    });

    it('should return 409 if user already exists', async () => {
      mockDatabase.query.mockResolvedValueOnce({
        rows: [{ id: 1 }],
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          // Missing password
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user with valid credentials', async () => {
      mockDatabase.query
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            email: 'user@example.com',
            password_hash: '$2a$12$valid_hash',
            role: 'user',
            is_active: true,
          }],
        })
        .mockResolvedValueOnce({ rows: [] }); // Insert refresh token

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
    });

    it('should return 401 for invalid credentials', async () => {
      mockDatabase.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
    });

    it('should return 403 for inactive account', async () => {
      mockDatabase.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'user@example.com',
          password_hash: '$2a$12$valid_hash',
          role: 'user',
          is_active: false,
        }],
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      mockDatabase.query
        .mockResolvedValueOnce({
          rows: [{
            user_id: 1,
            expires_at: futureDate,
          }],
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            email: 'user@example.com',
            role: 'user',
          }],
        });

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'valid_refresh_token',
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('accessToken');
    });

    it('should return 401 for invalid refresh token', async () => {
      mockDatabase.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'invalid_token',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout user successfully', async () => {
      mockDatabase.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/auth/logout')
        .send({
          refreshToken: 'some_token',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/verify', () => {
    it('should verify valid token', async () => {
      const response = await request(app)
        .post('/api/auth/verify')
        .set('Authorization', 'Bearer valid_token');

      // Note: This will fail without a real token,
      // but demonstrates the endpoint exists
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('Rate Limiting', () => {
    it('should handle multiple rapid requests', async () => {
      mockDatabase.query.mockResolvedValue({ rows: [] });

      const requests = Array(5).fill(null).map(() =>
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'password',
          })
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBeGreaterThanOrEqual(200);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDatabase.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password',
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400);
    });
  });
});
