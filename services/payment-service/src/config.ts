import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3005', 10),
  authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'payment_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },
  jaeger: {
    serviceName: 'payment-service',
    agentHost: process.env.JAEGER_AGENT_HOST || 'localhost',
    agentPort: parseInt(process.env.JAEGER_AGENT_PORT || '6831', 10),
  },
  stripe: {
    apiKey: process.env.STRIPE_API_KEY || 'sk_test_mock_key_for_demo',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock_secret_for_demo',
  },
  paymentGateway: {
    mode: process.env.PAYMENT_GATEWAY_MODE || 'mock', // 'mock' or 'live'
  },
};
