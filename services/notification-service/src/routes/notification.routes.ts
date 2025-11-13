import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   POST /api/notifications
 * @desc    Send a notification (email or SMS)
 * @access  Public (can be called by other services)
 */
router.post('/', notificationController.sendNotification.bind(notificationController));

/**
 * @route   GET /api/notifications/:id
 * @desc    Get a specific notification by ID
 * @access  Public
 */
router.get('/:id', notificationController.getNotification.bind(notificationController));

/**
 * @route   GET /api/notifications
 * @desc    List notifications with filtering and pagination
 * @access  Public (with optional authentication)
 * @query   userId, type, channel, status, startDate, endDate, page, limit
 */
router.get('/', optionalAuth, notificationController.listNotifications.bind(notificationController));

/**
 * @route   POST /api/notifications/:id/resend
 * @desc    Resend a notification
 * @access  Public
 */
router.post('/:id/resend', notificationController.resendNotification.bind(notificationController));

/**
 * @route   GET /api/notifications/stats
 * @desc    Get notification statistics
 * @access  Public
 */
router.get('/stats/summary', notificationController.getStats.bind(notificationController));

export default router;
