import { Registry, Counter, Histogram, Gauge } from 'prom-client';

export const register = new Registry();

// HTTP Metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
  buckets: [0.1, 0.5, 1, 2, 5],
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Notification Metrics
export const notificationsSentTotal = new Counter({
  name: 'notifications_sent_total',
  help: 'Total number of notifications sent',
  labelNames: ['channel', 'type', 'status'],
  registers: [register],
});

export const notificationDuration = new Histogram({
  name: 'notification_duration_seconds',
  help: 'Duration of notification processing in seconds',
  labelNames: ['channel', 'type'],
  registers: [register],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

export const notificationQueueSize = new Gauge({
  name: 'notification_queue_size',
  help: 'Number of notifications in queue',
  labelNames: ['channel'],
  registers: [register],
});

// Email Metrics
export const emailsSentTotal = new Counter({
  name: 'emails_sent_total',
  help: 'Total number of emails sent',
  labelNames: ['status'],
  registers: [register],
});

export const emailFailuresTotal = new Counter({
  name: 'email_failures_total',
  help: 'Total number of email failures',
  labelNames: ['error_type'],
  registers: [register],
});

// SMS Metrics
export const smsSentTotal = new Counter({
  name: 'sms_sent_total',
  help: 'Total number of SMS sent',
  labelNames: ['status'],
  registers: [register],
});

export const smsFailuresTotal = new Counter({
  name: 'sms_failures_total',
  help: 'Total number of SMS failures',
  labelNames: ['error_type'],
  registers: [register],
});

// Database Metrics
export const databaseQueryDuration = new Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  registers: [register],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
});

export const databaseConnectionsActive = new Gauge({
  name: 'database_connections_active',
  help: 'Number of active database connections',
  registers: [register],
});

export const databaseErrorsTotal = new Counter({
  name: 'database_errors_total',
  help: 'Total number of database errors',
  labelNames: ['operation', 'error_type'],
  registers: [register],
});
