import { Pool, PoolClient } from 'pg';
import { config } from './config';
import logger from './utils/logger';
import { databaseQueryDuration } from './utils/metrics';

let pool: Pool;

export const initializeDatabase = async (): Promise<void> => {
  pool = new Pool({
    host: config.database.host,
    port: config.database.port,
    database: config.database.database,
    user: config.database.user,
    password: config.database.password,
    max: config.database.max,
    idleTimeoutMillis: config.database.idleTimeoutMillis,
    connectionTimeoutMillis: config.database.connectionTimeoutMillis,
  });

  pool.on('error', (err: Error) => {
    logger.error(`Unexpected database error: ${err.message}`);
  });

  try {
    const client = await pool.connect();
    logger.info('Database connection established');

    // Create tables if they don't exist
    await createTables(client);

    client.release();
  } catch (error) {
    logger.error(`Failed to connect to database: ${error}`);
    throw error;
  }
};

const createTables = async (client: PoolClient): Promise<void> => {
  try {
    // Create orders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        total_amount DECIMAL(10, 2) NOT NULL,
        shipping_address JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create order_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        price DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id)
    `);

    // Create updated_at trigger function
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    // Create trigger for orders table
    await client.query(`
      DROP TRIGGER IF EXISTS update_orders_updated_at ON orders
    `);

    await client.query(`
      CREATE TRIGGER update_orders_updated_at
      BEFORE UPDATE ON orders
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()
    `);

    logger.info('Database tables created successfully');
  } catch (error) {
    logger.error(`Failed to create tables: ${error}`);
    throw error;
  }
};

export const getPool = (): Pool => {
  if (!pool) {
    throw new Error('Database pool not initialized');
  }
  return pool;
};

export const query = async (text: string, params?: any[]): Promise<any> => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = (Date.now() - start) / 1000;
    databaseQueryDuration.labels('query').observe(duration);
    return result;
  } catch (error) {
    logger.error(`Database query error: ${error}`);
    throw error;
  }
};

export const getClient = async (): Promise<PoolClient> => {
  return await pool.connect();
};

export const closeDatabase = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    logger.info('Database connection closed');
  }
};

export interface Order {
  id: number;
  user_id: number;
  status: string;
  total_amount: number;
  shipping_address: ShippingAddress;
  created_at: Date;
  updated_at: Date;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  price: number;
  created_at: Date;
}

export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
}

export interface CreateOrderData {
  user_id: number;
  items: {
    product_id: number;
    quantity: number;
  }[];
  shipping_address: ShippingAddress;
}

export default {
  initializeDatabase,
  getPool,
  query,
  getClient,
  closeDatabase,
};
