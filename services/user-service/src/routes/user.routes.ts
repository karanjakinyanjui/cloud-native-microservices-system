import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import {
  getProfile,
  updateProfile,
  deleteProfile,
  listUsers,
} from '../controllers/user.controller';

const router = Router();

/**
 * All routes require authentication
 */

/**
 * GET /api/users/profile - Get current user's profile
 */
router.get('/profile', authenticate, getProfile);

/**
 * GET /api/users/:id - Get user profile by ID (own profile or admin)
 */
router.get('/:id', authenticate, getProfile);

/**
 * PUT /api/users/profile - Update current user's profile
 */
router.put('/profile', authenticate, updateProfile);

/**
 * DELETE /api/users/profile - Delete current user's profile
 */
router.delete('/profile', authenticate, deleteProfile);

/**
 * GET /api/users - List all users (admin only)
 * Query parameters:
 *   - page: page number (default: 1)
 *   - limit: items per page (default: 10, max: 100)
 */
router.get('/', authenticate, requireAdmin, listUsers);

export default router;
