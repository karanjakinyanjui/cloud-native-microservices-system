import { Response, NextFunction } from 'express';
import Joi from 'joi';
import { Database } from '../database';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import { userOperations, userProfileViews } from '../utils/metrics';

// Validation schemas
const updateProfileSchema = Joi.object({
  first_name: Joi.string().min(1).max(100).optional(),
  last_name: Joi.string().min(1).max(100).optional(),
  phone: Joi.string().pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/).optional(),
  address: Joi.string().max(500).optional(),
  avatar_url: Joi.string().uri().max(500).optional(),
  preferences: Joi.object().optional(),
});

/**
 * Get user profile by ID
 * If no ID provided, returns current user's profile
 */
export const getProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.id ? parseInt(req.params.id) : req.user!.id;

    // Check if user is trying to access their own profile or is admin
    if (userId !== req.user!.id && req.user!.role !== 'admin') {
      throw new AppError('Access denied', 403);
    }

    const db = Database.getInstance();
    const result = await db.query(
      'SELECT id, user_id, first_name, last_name, phone, address, avatar_url, preferences, created_at, updated_at FROM user_profiles WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      // Create default profile if it doesn't exist
      const insertResult = await db.query(
        'INSERT INTO user_profiles (user_id) VALUES ($1) RETURNING id, user_id, first_name, last_name, phone, address, avatar_url, preferences, created_at, updated_at',
        [userId]
      );

      userOperations.labels('create', 'success').inc();
      logger.info('User profile created', { userId });

      res.status(201).json({
        success: true,
        data: insertResult.rows[0],
      });
    } else {
      userProfileViews.inc();

      res.status(200).json({
        success: true,
        data: result.rows[0],
      });
    }
  } catch (error) {
    userOperations.labels('get', 'failed').inc();
    next(error);
  }
};

/**
 * Update user profile
 * Users can only update their own profile
 */
export const updateProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;

    // Validate request body
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    // Check if there are any fields to update
    if (Object.keys(value).length === 0) {
      throw new AppError('No fields to update', 400);
    }

    const db = Database.getInstance();

    // Build dynamic UPDATE query
    const fields = Object.keys(value);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const values = [userId, ...fields.map(field => value[field])];

    const query = `
      UPDATE user_profiles
      SET ${setClause}
      WHERE user_id = $1
      RETURNING id, user_id, first_name, last_name, phone, address, avatar_url, preferences, created_at, updated_at
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      // Profile doesn't exist, create it with provided data
      const insertFields = ['user_id', ...fields];
      const insertPlaceholders = insertFields.map((_, index) => `$${index + 1}`).join(', ');
      const insertValues = [userId, ...fields.map(field => value[field])];

      const insertQuery = `
        INSERT INTO user_profiles (${insertFields.join(', ')})
        VALUES (${insertPlaceholders})
        RETURNING id, user_id, first_name, last_name, phone, address, avatar_url, preferences, created_at, updated_at
      `;

      const insertResult = await db.query(insertQuery, insertValues);

      userOperations.labels('create', 'success').inc();
      logger.info('User profile created during update', { userId, fields });

      res.status(201).json({
        success: true,
        message: 'Profile created successfully',
        data: insertResult.rows[0],
      });
    } else {
      userOperations.labels('update', 'success').inc();
      logger.info('User profile updated', { userId, fields });

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: result.rows[0],
      });
    }
  } catch (error) {
    userOperations.labels('update', 'failed').inc();
    next(error);
  }
};

/**
 * Delete user profile
 * Users can only delete their own profile
 */
export const deleteProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;

    const db = Database.getInstance();
    const result = await db.query(
      'DELETE FROM user_profiles WHERE user_id = $1 RETURNING id',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Profile not found', 404);
    }

    userOperations.labels('delete', 'success').inc();
    logger.info('User profile deleted', { userId });

    res.status(200).json({
      success: true,
      message: 'Profile deleted successfully',
    });
  } catch (error) {
    userOperations.labels('delete', 'failed').inc();
    next(error);
  }
};

/**
 * List all user profiles (admin only)
 * Supports pagination
 */
export const listUsers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Parse pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100); // Max 100 per page
    const offset = (page - 1) * limit;

    const db = Database.getInstance();

    // Get total count
    const countResult = await db.query('SELECT COUNT(*) FROM user_profiles');
    const totalCount = parseInt(countResult.rows[0].count);

    // Get paginated results
    const result = await db.query(
      `SELECT id, user_id, first_name, last_name, phone, address, avatar_url, preferences, created_at, updated_at
       FROM user_profiles
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    userOperations.labels('list', 'success').inc();
    logger.info('User profiles listed', { page, limit, totalCount });

    res.status(200).json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    userOperations.labels('list', 'failed').inc();
    next(error);
  }
};
