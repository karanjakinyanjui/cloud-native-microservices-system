import { Registry, Counter, Histogram, Gauge } from 'prom-client';

const register = new Registry();

// HTTP request metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'service'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  registers: [register],
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'service'],
  registers: [register],
});

export const httpRequestErrors = new Counter({
  name: 'http_request_errors_total',
  help: 'Total number of HTTP request errors',
  labelNames: ['method', 'route', 'error_type', 'service'],
  registers: [register],
});

// Circuit breaker metrics
export const circuitBreakerStatus = new Gauge({
  name: 'circuit_breaker_status',
  help: 'Circuit breaker status (0=closed, 1=open, 2=half-open)',
  labelNames: ['service'],
  registers: [register],
});

export const circuitBreakerFailures = new Counter({
  name: 'circuit_breaker_failures_total',
  help: 'Total number of circuit breaker failures',
  labelNames: ['service'],
  registers: [register],
});

// Rate limiting metrics
export const rateLimitExceeded = new Counter({
  name: 'rate_limit_exceeded_total',
  help: 'Total number of rate limit exceeded events',
  labelNames: ['tier', 'route'],
  registers: [register],
});

// Service health metrics
export const serviceHealthStatus = new Gauge({
  name: 'service_health_status',
  help: 'Health status of backend services (1=healthy, 0=unhealthy)',
  labelNames: ['service'],
  registers: [register],
});

// Active connections
export const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  registers: [register],
});

// Request size
export const requestSize = new Histogram({
  name: 'http_request_size_bytes',
  help: 'Size of HTTP requests in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 1000, 10000, 100000, 1000000],
  registers: [register],
});

// Response size
export const responseSize = new Histogram({
  name: 'http_response_size_bytes',
  help: 'Size of HTTP responses in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 1000, 10000, 100000, 1000000],
  registers: [register],
});

export function getMetrics(): Promise<string> {
  return register.metrics();
}

export { register };

export default {
  httpRequestDuration,
  httpRequestTotal,
  httpRequestErrors,
  circuitBreakerStatus,
  circuitBreakerFailures,
  rateLimitExceeded,
  serviceHealthStatus,
  activeConnections,
  requestSize,
  responseSize,
  getMetrics,
  register,
};
