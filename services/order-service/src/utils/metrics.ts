import promClient from 'prom-client';

// Create a Registry to register metrics
export const register = new promClient.Registry();

// Add default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ register });

// Custom metrics for order service
export const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register],
});

export const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const ordersCreatedTotal = new promClient.Counter({
  name: 'orders_created_total',
  help: 'Total number of orders created',
  labelNames: ['status'],
  registers: [register],
});

export const ordersStatusTotal = new promClient.Counter({
  name: 'orders_status_total',
  help: 'Total number of orders by status',
  labelNames: ['status'],
  registers: [register],
});

export const orderProcessingDuration = new promClient.Histogram({
  name: 'order_processing_duration_seconds',
  help: 'Duration of order processing in seconds',
  labelNames: ['status'],
  buckets: [0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

export const externalServiceRequests = new promClient.Counter({
  name: 'external_service_requests_total',
  help: 'Total number of external service requests',
  labelNames: ['service', 'method', 'status'],
  registers: [register],
});

export const externalServiceDuration = new promClient.Histogram({
  name: 'external_service_duration_seconds',
  help: 'Duration of external service requests in seconds',
  labelNames: ['service', 'method'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register],
});

export const databaseQueryDuration = new promClient.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

export default {
  register,
  httpRequestDuration,
  httpRequestTotal,
  ordersCreatedTotal,
  ordersStatusTotal,
  orderProcessingDuration,
  externalServiceRequests,
  externalServiceDuration,
  databaseQueryDuration,
};
