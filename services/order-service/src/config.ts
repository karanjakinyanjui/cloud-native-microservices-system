import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3004', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  // Database Configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'order_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: parseInt(process.env.DB_POOL_MAX || '20', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000', 10),
  },

  // Jaeger Configuration
  jaeger: {
    agentHost: process.env.JAEGER_AGENT_HOST || 'localhost',
    agentPort: parseInt(process.env.JAEGER_AGENT_PORT || '6831', 10),
    serviceName: 'order-service',
  },

  // Service URLs
  services: {
    productService: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002',
    paymentService: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3005',
    notificationService: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3006',
  },

  // Retry Configuration
  retry: {
    maxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS || '3', 10),
    delayMs: parseInt(process.env.RETRY_DELAY_MS || '1000', 10),
    backoffMultiplier: parseFloat(process.env.RETRY_BACKOFF_MULTIPLIER || '2'),
  },
};

export default config;
