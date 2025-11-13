import { Pool, PoolClient, QueryResult } from 'pg';
import { config } from './config';
import { logger } from './utils/logger';
import { databaseConnectionsActive, databaseQueryDuration, databaseErrorsTotal } from './utils/metrics';

class Database {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.database,
      user: config.database.user,
      password: config.database.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('connect', () => {
      databaseConnectionsActive.inc();
      logger.debug('New database connection established');
    });

    this.pool.on('remove', () => {
      databaseConnectionsActive.dec();
      logger.debug('Database connection removed');
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected database error', { error: err.message });
      databaseErrorsTotal.inc({ operation: 'connection', error_type: err.name });
    });

    logger.info('Database pool created', {
      host: config.database.host,
      database: config.database.database,
    });
  }

  async query(text: string, params?: any[]): Promise<QueryResult> {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = (Date.now() - start) / 1000;
      databaseQueryDuration.observe({ operation: 'query', table: 'unknown' }, duration);
      return result;
    } catch (error: any) {
      const duration = (Date.now() - start) / 1000;
      databaseQueryDuration.observe({ operation: 'query', table: 'unknown' }, duration);
      databaseErrorsTotal.inc({ operation: 'query', error_type: error.name });
      logger.error('Database query error', { error: error.message, query: text });
      throw error;
    }
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async initializeSchema(): Promise<void> {
    logger.info('Initializing database schema...');

    const client = await this.getClient();
    try {
      await client.query('BEGIN');

      // Create notifications table
      await client.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          type VARCHAR(100) NOT NULL,
          channel VARCHAR(50) NOT NULL,
          subject VARCHAR(500),
          content TEXT NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'pending',
          metadata JSONB DEFAULT '{}',
          error_message TEXT,
          sent_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes for notifications table
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
        CREATE INDEX IF NOT EXISTS idx_notifications_channel ON notifications(channel);
        CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
        CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
      `);

      // Create notification_templates table
      await client.query(`
        CREATE TABLE IF NOT EXISTS notification_templates (
          id SERIAL PRIMARY KEY,
          type VARCHAR(100) NOT NULL UNIQUE,
          channel VARCHAR(50) NOT NULL,
          subject_template TEXT,
          content_template TEXT NOT NULL,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create index for notification_templates
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(type);
        CREATE INDEX IF NOT EXISTS idx_notification_templates_channel ON notification_templates(channel);
      `);

      // Insert default templates
      await this.insertDefaultTemplates(client);

      await client.query('COMMIT');
      logger.info('Database schema initialized successfully');
    } catch (error: any) {
      await client.query('ROLLBACK');
      logger.error('Error initializing database schema', { error: error.message });
      throw error;
    } finally {
      client.release();
    }
  }

  private async insertDefaultTemplates(client: PoolClient): Promise<void> {
    const templates = [
      {
        type: 'order_created',
        channel: 'email',
        subject_template: 'Order Confirmation - Order #{{orderId}}',
        content_template: `
          <h2>Thank you for your order!</h2>
          <p>Hi {{userName}},</p>
          <p>Your order #{{orderId}} has been successfully created.</p>
          <p><strong>Order Total:</strong> ${{totalAmount}}</p>
          <p>We'll send you a notification when your order is shipped.</p>
          <p>Thank you for shopping with us!</p>
        `,
      },
      {
        type: 'order_created',
        channel: 'sms',
        subject_template: null,
        content_template: 'Your order #{{orderId}} has been confirmed. Total: ${{totalAmount}}. Thank you!',
      },
      {
        type: 'order_paid',
        channel: 'email',
        subject_template: 'Payment Received - Order #{{orderId}}',
        content_template: `
          <h2>Payment Confirmed</h2>
          <p>Hi {{userName}},</p>
          <p>We have received your payment for order #{{orderId}}.</p>
          <p><strong>Amount Paid:</strong> ${{totalAmount}}</p>
          <p><strong>Payment Method:</strong> {{paymentMethod}}</p>
          <p>Your order is being processed and will be shipped soon.</p>
        `,
      },
      {
        type: 'order_shipped',
        channel: 'email',
        subject_template: 'Your Order Has Shipped - Order #{{orderId}}',
        content_template: `
          <h2>Your order is on its way!</h2>
          <p>Hi {{userName}},</p>
          <p>Great news! Your order #{{orderId}} has been shipped.</p>
          <p><strong>Tracking Number:</strong> {{trackingNumber}}</p>
          <p><strong>Estimated Delivery:</strong> {{estimatedDelivery}}</p>
          <p>You can track your package using the tracking number above.</p>
        `,
      },
      {
        type: 'order_shipped',
        channel: 'sms',
        subject_template: null,
        content_template: 'Your order #{{orderId}} has shipped! Tracking: {{trackingNumber}}',
      },
      {
        type: 'order_delivered',
        channel: 'email',
        subject_template: 'Order Delivered - Order #{{orderId}}',
        content_template: `
          <h2>Your order has been delivered!</h2>
          <p>Hi {{userName}},</p>
          <p>Your order #{{orderId}} has been successfully delivered.</p>
          <p>We hope you enjoy your purchase!</p>
          <p>If you have any questions or concerns, please don't hesitate to contact us.</p>
        `,
      },
      {
        type: 'order_cancelled',
        channel: 'email',
        subject_template: 'Order Cancelled - Order #{{orderId}}',
        content_template: `
          <h2>Order Cancellation Confirmation</h2>
          <p>Hi {{userName}},</p>
          <p>Your order #{{orderId}} has been cancelled as requested.</p>
          <p><strong>Refund Amount:</strong> ${{refundAmount}}</p>
          <p>The refund will be processed within 5-7 business days.</p>
          <p>If you have any questions, please contact our support team.</p>
        `,
      },
    ];

    for (const template of templates) {
      await client.query(
        `
        INSERT INTO notification_templates (type, channel, subject_template, content_template)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (type) DO NOTHING
        `,
        [template.type, template.channel, template.subject_template, template.content_template]
      );
    }

    logger.info('Default notification templates inserted');
  }

  async close(): Promise<void> {
    await this.pool.end();
    logger.info('Database pool closed');
  }
}

export const database = new Database();
