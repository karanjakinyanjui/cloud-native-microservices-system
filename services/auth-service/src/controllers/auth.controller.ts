import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { Database } from '../database';
import { AppError } from '../middleware/errorHandler';
import { authAttempts, activeUsers } from '../utils/metrics';
import { logger } from '../utils/logger';
import crypto from 'crypto';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, role = 'user' } = req.body;

      // Check if user already exists
      const existingUser = await Database.getInstance().query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        throw new AppError('User already exists', 409);
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create user
      const result = await Database.getInstance().query(
        'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role, created_at',
        [email, passwordHash, role]
      );

      const user = result.rows[0];

      // Generate tokens
      const accessToken = this.generateAccessToken(user);
      const refreshToken = await this.generateRefreshToken(user.id);

      authAttempts.labels('success').inc();
      activeUsers.inc();

      logger.info('User registered successfully', { userId: user.id, email: user.email });

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
          },
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      authAttempts.labels('failure').inc();
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      // Find user
      const result = await Database.getInstance().query(
        'SELECT id, email, password_hash, role, is_active FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        authAttempts.labels('failure').inc();
        throw new AppError('Invalid credentials', 401);
      }

      const user = result.rows[0];

      if (!user.is_active) {
        authAttempts.labels('failure').inc();
        throw new AppError('Account is inactive', 403);
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      if (!isPasswordValid) {
        authAttempts.labels('failure').inc();
        throw new AppError('Invalid credentials', 401);
      }

      // Generate tokens
      const accessToken = this.generateAccessToken(user);
      const refreshToken = await this.generateRefreshToken(user.id);

      authAttempts.labels('success').inc();

      logger.info('User logged in successfully', { userId: user.id, email: user.email });

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
          },
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      // Verify refresh token exists in database
      const result = await Database.getInstance().query(
        'SELECT user_id, expires_at FROM refresh_tokens WHERE token = $1',
        [refreshToken]
      );

      if (result.rows.length === 0) {
        throw new AppError('Invalid refresh token', 401);
      }

      const tokenData = result.rows[0];

      // Check if token is expired
      if (new Date(tokenData.expires_at) < new Date()) {
        // Delete expired token
        await Database.getInstance().query(
          'DELETE FROM refresh_tokens WHERE token = $1',
          [refreshToken]
        );
        throw new AppError('Refresh token expired', 401);
      }

      // Get user data
      const userResult = await Database.getInstance().query(
        'SELECT id, email, role FROM users WHERE id = $1 AND is_active = true',
        [tokenData.user_id]
      );

      if (userResult.rows.length === 0) {
        throw new AppError('User not found or inactive', 404);
      }

      const user = userResult.rows[0];

      // Generate new access token
      const accessToken = this.generateAccessToken(user);

      res.json({
        success: true,
        data: {
          accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        await Database.getInstance().query(
          'DELETE FROM refresh_tokens WHERE token = $1',
          [refreshToken]
        );
      }

      activeUsers.dec();

      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyToken(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        throw new AppError('No token provided', 401);
      }

      const decoded = jwt.verify(token, config.jwtSecret) as {
        id: number;
        email: string;
        role: string;
      };

      res.json({
        success: true,
        data: {
          valid: true,
          user: decoded,
        },
      });
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
        res.json({
          success: false,
          data: {
            valid: false,
          },
        });
      } else {
        next(error);
      }
    }
  }

  private generateAccessToken(user: any): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );
  }

  private async generateRefreshToken(userId: number): Promise<string> {
    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await Database.getInstance().query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [userId, token, expiresAt]
    );

    return token;
  }
}
