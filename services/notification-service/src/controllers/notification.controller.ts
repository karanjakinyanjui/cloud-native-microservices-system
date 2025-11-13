import { Request, Response, NextFunction } from 'express';
import { database } from '../database';
import { logger } from '../utils/logger';
import { emailService } from '../services/emailService';
import { smsService } from '../services/smsService';
import { ValidationError, NotFoundError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth.middleware';
import { notificationsSentTotal, notificationQueueSize } from '../utils/metrics';
import { createSpan } from '../utils/tracer';
import Handlebars from 'handlebars';

interface SendNotificationRequest {
  userId: number;
  type: string;
  channel: 'email' | 'sms' | 'both';
  recipient: {
    email?: string;
    phone?: string;
  };
  data: Record<string, any>;
  subject?: string;
  content?: string;
}

interface NotificationFilter {
  userId?: number;
  type?: string;
  channel?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export class NotificationController {
  async sendNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    const span = createSpan('controller.sendNotification');

    try {
      const {
        userId,
        type,
        channel,
        recipient,
        data,
        subject,
        content,
      } = req.body as SendNotificationRequest;

      // Validate required fields
      if (!userId || !type || !channel || !recipient) {
        throw new ValidationError('Missing required fields: userId, type, channel, recipient');
      }

      if (channel === 'email' && !recipient.email) {
        throw new ValidationError('Email address is required for email channel');
      }

      if (channel === 'sms' && !recipient.phone) {
        throw new ValidationError('Phone number is required for SMS channel');
      }

      logger.info('Processing notification request', { userId, type, channel });

      // Get template if not provided custom content
      let notificationSubject = subject;
      let notificationContent = content;

      if (!content) {
        const template = await this.getTemplate(type, channel);
        if (template) {
          notificationSubject = template.subject_template
            ? Handlebars.compile(template.subject_template)(data)
            : subject;
          notificationContent = Handlebars.compile(template.content_template)(data);
        } else {
          throw new ValidationError(`No template found for type: ${type}, channel: ${channel}`);
        }
      }

      const results: any[] = [];

      // Send via email
      if (channel === 'email' || channel === 'both') {
        const emailResult = await this.sendEmailNotification({
          userId,
          type,
          recipient: recipient.email!,
          subject: notificationSubject || `Notification: ${type}`,
          content: notificationContent!,
          data,
        });
        results.push(emailResult);
      }

      // Send via SMS
      if (channel === 'sms' || channel === 'both') {
        const smsResult = await this.sendSmsNotification({
          userId,
          type,
          recipient: recipient.phone!,
          content: notificationContent!,
          data,
        });
        results.push(smsResult);
      }

      span.finish();

      res.status(201).json({
        success: true,
        message: 'Notification(s) sent successfully',
        data: results,
      });
    } catch (error) {
      span.setTag('error', true);
      span.finish();
      next(error);
    }
  }

  private async sendEmailNotification(params: {
    userId: number;
    type: string;
    recipient: string;
    subject: string;
    content: string;
    data: Record<string, any>;
  }): Promise<any> {
    const { userId, type, recipient, subject, content, data } = params;

    // Create notification record
    const result = await database.query(
      `INSERT INTO notifications (user_id, type, channel, subject, content, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, type, 'email', subject, content, 'pending', JSON.stringify(data)]
    );

    const notification = result.rows[0];

    try {
      // Send email
      await emailService.sendEmail({
        to: recipient,
        subject,
        html: content,
        context: { ...data, type },
      });

      // Update notification status
      await database.query(
        `UPDATE notifications SET status = $1, sent_at = CURRENT_TIMESTAMP WHERE id = $2`,
        ['sent', notification.id]
      );

      notificationsSentTotal.inc({ channel: 'email', type, status: 'sent' });

      logger.info('Email notification sent', { notificationId: notification.id, userId, type });

      return { ...notification, status: 'sent' };
    } catch (error: any) {
      // Update notification with error
      await database.query(
        `UPDATE notifications SET status = $1, error_message = $2 WHERE id = $3`,
        ['failed', error.message, notification.id]
      );

      notificationsSentTotal.inc({ channel: 'email', type, status: 'failed' });

      logger.error('Email notification failed', {
        notificationId: notification.id,
        error: error.message,
      });

      return { ...notification, status: 'failed', error: error.message };
    }
  }

  private async sendSmsNotification(params: {
    userId: number;
    type: string;
    recipient: string;
    content: string;
    data: Record<string, any>;
  }): Promise<any> {
    const { userId, type, recipient, content, data } = params;

    // Create notification record
    const result = await database.query(
      `INSERT INTO notifications (user_id, type, channel, content, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, type, 'sms', content, 'pending', JSON.stringify(data)]
    );

    const notification = result.rows[0];

    try {
      // Send SMS
      await smsService.sendSms({
        to: recipient,
        message: content,
        context: { ...data, type },
      });

      // Update notification status
      await database.query(
        `UPDATE notifications SET status = $1, sent_at = CURRENT_TIMESTAMP WHERE id = $2`,
        ['sent', notification.id]
      );

      notificationsSentTotal.inc({ channel: 'sms', type, status: 'sent' });

      logger.info('SMS notification sent', { notificationId: notification.id, userId, type });

      return { ...notification, status: 'sent' };
    } catch (error: any) {
      // Update notification with error
      await database.query(
        `UPDATE notifications SET status = $1, error_message = $2 WHERE id = $3`,
        ['failed', error.message, notification.id]
      );

      notificationsSentTotal.inc({ channel: 'sms', type, status: 'failed' });

      logger.error('SMS notification failed', {
        notificationId: notification.id,
        error: error.message,
      });

      return { ...notification, status: 'failed', error: error.message };
    }
  }

  private async getTemplate(type: string, channel: string): Promise<any> {
    const result = await database.query(
      'SELECT * FROM notification_templates WHERE type = $1 AND channel = $2',
      [type, channel]
    );

    return result.rows[0] || null;
  }

  async getNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    const span = createSpan('controller.getNotification');

    try {
      const { id } = req.params;

      const result = await database.query(
        'SELECT * FROM notifications WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError(`Notification with id ${id} not found`);
      }

      span.finish();

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error) {
      span.setTag('error', true);
      span.finish();
      next(error);
    }
  }

  async listNotifications(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    const span = createSpan('controller.listNotifications');

    try {
      const {
        userId,
        type,
        channel,
        status,
        startDate,
        endDate,
        page = '1',
        limit = '20',
      } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const offset = (pageNum - 1) * limitNum;

      // Build query
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (userId) {
        conditions.push(`user_id = $${paramIndex++}`);
        params.push(userId);
      }

      if (type) {
        conditions.push(`type = $${paramIndex++}`);
        params.push(type);
      }

      if (channel) {
        conditions.push(`channel = $${paramIndex++}`);
        params.push(channel);
      }

      if (status) {
        conditions.push(`status = $${paramIndex++}`);
        params.push(status);
      }

      if (startDate) {
        conditions.push(`created_at >= $${paramIndex++}`);
        params.push(startDate);
      }

      if (endDate) {
        conditions.push(`created_at <= $${paramIndex++}`);
        params.push(endDate);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countResult = await database.query(
        `SELECT COUNT(*) FROM notifications ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].count, 10);

      // Get paginated results
      const result = await database.query(
        `SELECT * FROM notifications ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        [...params, limitNum, offset]
      );

      span.finish();

      res.json({
        success: true,
        data: {
          notifications: result.rows,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
          },
        },
      });
    } catch (error) {
      span.setTag('error', true);
      span.finish();
      next(error);
    }
  }

  async resendNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
    const span = createSpan('controller.resendNotification');

    try {
      const { id } = req.params;

      // Get original notification
      const result = await database.query(
        'SELECT * FROM notifications WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError(`Notification with id ${id} not found`);
      }

      const notification = result.rows[0];

      // Reset status to pending
      await database.query(
        `UPDATE notifications SET status = $1, error_message = NULL, sent_at = NULL
         WHERE id = $2`,
        ['pending', id]
      );

      // Resend based on channel
      if (notification.channel === 'email') {
        await emailService.sendEmail({
          to: notification.metadata?.email || '',
          subject: notification.subject,
          html: notification.content,
        });
      } else if (notification.channel === 'sms') {
        await smsService.sendSms({
          to: notification.metadata?.phone || '',
          message: notification.content,
        });
      }

      // Update status to sent
      await database.query(
        `UPDATE notifications SET status = $1, sent_at = CURRENT_TIMESTAMP WHERE id = $2`,
        ['sent', id]
      );

      span.finish();

      res.json({
        success: true,
        message: 'Notification resent successfully',
      });
    } catch (error) {
      span.setTag('error', true);
      span.finish();
      next(error);
    }
  }

  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    const span = createSpan('controller.getStats');

    try {
      const { startDate, endDate } = req.query;

      let dateFilter = '';
      const params: any[] = [];

      if (startDate && endDate) {
        dateFilter = 'WHERE created_at BETWEEN $1 AND $2';
        params.push(startDate, endDate);
      }

      const result = await database.query(
        `SELECT
          channel,
          status,
          COUNT(*) as count
         FROM notifications
         ${dateFilter}
         GROUP BY channel, status
         ORDER BY channel, status`,
        params
      );

      const stats = result.rows.reduce((acc: any, row: any) => {
        if (!acc[row.channel]) {
          acc[row.channel] = {};
        }
        acc[row.channel][row.status] = parseInt(row.count, 10);
        return acc;
      }, {});

      // Get queue sizes (mock for now)
      const emailQueue = 0;
      const smsQueue = 0;

      notificationQueueSize.set({ channel: 'email' }, emailQueue);
      notificationQueueSize.set({ channel: 'sms' }, smsQueue);

      span.finish();

      res.json({
        success: true,
        data: {
          stats,
          queues: {
            email: emailQueue,
            sms: smsQueue,
          },
        },
      });
    } catch (error) {
      span.setTag('error', true);
      span.finish();
      next(error);
    }
  }
}

export const notificationController = new NotificationController();
