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
      CREATE TABLE IF NOT EXISTS user_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        phone VARCHAR(20),
        address TEXT,
        avatar_url VARCHAR(500),
        preferences JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

      -- Trigger to automatically update updated_at timestamp
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';

      DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
      CREATE TRIGGER update_user_profiles_updated_at
        BEFORE UPDATE ON user_profiles
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
