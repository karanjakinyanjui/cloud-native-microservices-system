import dotenv from 'dotenv';

dotenv.config();

export interface ServiceConfig {
  name: string;
  url: string;
  healthPath: string;
}

export interface RateLimitTier {
  windowMs: number;
  max: number;
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),

  // Service URLs and configurations
  services: {
    auth: {
      name: 'auth-service',
      url: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
      healthPath: '/health',
    },
    user: {
      name: 'user-service',
      url: process.env.USER_SERVICE_URL || 'http://user-service:3002',
      healthPath: '/health',
    },
    product: {
      name: 'product-service',
      url: process.env.PRODUCT_SERVICE_URL || 'http://product-service:3003',
      healthPath: '/health',
    },
    order: {
      name: 'order-service',
      url: process.env.ORDER_SERVICE_URL || 'http://order-service:3004',
      healthPath: '/health',
    },
    payment: {
      name: 'payment-service',
      url: process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3005',
      healthPath: '/health',
    },
    notification: {
      name: 'notification-service',
      url: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3006',
      healthPath: '/health',
    },
  } as Record<string, ServiceConfig>,

  // Rate limiting tiers
  rateLimit: {
    general: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    },
    authenticated: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
      max: parseInt(process.env.RATE_LIMIT_AUTHENTICATED_MAX || '500', 10),
    },
    premium: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
      max: parseInt(process.env.RATE_LIMIT_PREMIUM_MAX || '1000', 10),
    },
  } as Record<string, RateLimitTier>,

  // Circuit breaker settings
  circuitBreaker: {
    timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '3000', 10),
    errorThresholdPercentage: parseInt(process.env.CIRCUIT_BREAKER_ERROR_THRESHOLD || '50', 10),
    resetTimeout: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT || '30000', 10),
  },

  // Jaeger tracing configuration
  jaeger: {
    serviceName: 'api-gateway',
    agentHost: process.env.JAEGER_AGENT_HOST || 'jaeger',
    agentPort: parseInt(process.env.JAEGER_AGENT_PORT || '6831', 10),
    samplerType: process.env.JAEGER_SAMPLER_TYPE || 'const',
    samplerParam: parseFloat(process.env.JAEGER_SAMPLER_PARAM || '1'),
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },

  // Request timeout
  requestTimeout: 30000, // 30 seconds

  // Health check interval
  healthCheckInterval: 30000, // 30 seconds
};

export default config;
