import { Pool } from 'pg';
import { config } from './config';
import { logger } from './utils/logger';

export class Database {
  private static instance: Database;
  private pool: Pool | null = null;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(): Promise<void> {
    if (this.pool) {
      return;
    }

    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test connection
    try {
      const client = await this.pool.connect();
      logger.info('Database connection pool established');
      client.release();
      await this.initSchema();
    } catch (error) {
      logger.error('Failed to establish database connection', error);
      throw error;
    }

    // Error handling for pool
    this.pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', err);
    });
  }

  public async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      logger.info('Database connection pool closed');
    }
  }

  public getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database pool not initialized. Call connect() first.');
    }
    return this.pool;
  }

  public async query(text: string, params?: any[]): Promise<any> {
    const pool = this.getPool();
    const start = Date.now();
    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed query', { text, duration, rows: result.rowCount });
      return result;
    } catch (error) {
      logger.error('Query error', { text, error });
      throw error;
    }
  }

  private async initSchema(): Promise<void> {
    const schema = `
      -- Payments table
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
        currency VARCHAR(3) NOT NULL DEFAULT 'USD',
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded')),
        payment_method VARCHAR(50) NOT NULL,
        payment_gateway VARCHAR(50) NOT NULL DEFAULT 'stripe',
        transaction_id VARCHAR(255) UNIQUE,
        idempotency_key VARCHAR(255) UNIQUE,
        metadata JSONB DEFAULT '{}',
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Refunds table
      CREATE TABLE IF NOT EXISTS refunds (
        id SERIAL PRIMARY KEY,
        payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
        amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
        reason TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
        transaction_id VARCHAR(255),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Indexes for better query performance
      CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
      CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
      CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
      CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);
      CREATE INDEX IF NOT EXISTS idx_payments_idempotency_key ON payments(idempotency_key);
      CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
      CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON refunds(payment_id);
      CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);

      -- Trigger to automatically update updated_at timestamp
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
      CREATE TRIGGER update_payments_updated_at
        BEFORE UPDATE ON payments
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `;

    try {
      await this.query(schema);
      logger.info('Database schema initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database schema', error);
      throw error;
    }
  }
}
