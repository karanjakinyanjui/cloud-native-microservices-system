# Module 11: Observability - Monitoring, Logging, and Tracing

## Overview

Observability is the ability to understand system internal state from external outputs. This module covers the three pillars: metrics (Prometheus/Grafana), logging (structured logs), and distributed tracing (Jaeger).

## Learning Objectives

- ✅ Implement comprehensive metrics with Prometheus
- ✅ Create dashboards with Grafana
- ✅ Set up distributed tracing with Jaeger
- ✅ Configure centralized logging
- ✅ Design alerting rules
- ✅ Measure SLIs and SLOs

## The Three Pillars

### 1. Metrics (Prometheus)
Numerical measurements over time (CPU, memory, requests/sec)

### 2. Logs (Structured Logging)
Discrete events (errors, warnings, info messages)

### 3. Traces (Jaeger)
Request flow across services

## Prometheus Metrics

### Metric Types

**Counter**: Monotonically increasing value
```typescript
import { Counter } from 'prom-client';

const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

httpRequestsTotal.inc({ method: 'GET', route: '/api/users', status_code: '200' });
```

**Gauge**: Value that can go up or down
```typescript
import { Gauge } from 'prom-client';

const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

activeConnections.set(42);
activeConnections.inc(); // Increment
activeConnections.dec(); // Decrement
```

**Histogram**: Distribution of values
```typescript
import { Histogram } from 'prom-client';

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const end = httpRequestDuration.startTimer({ method: 'GET', route: '/api/users' });
// ... handle request
end();
```

### Complete Implementation

```typescript
// metrics.ts
import { register, Counter, Histogram, Gauge } from 'prom-client';

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
});

export const databaseQueryDuration = new Histogram({
  name: 'database_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['query', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1]
});

export const activeUsers = new Gauge({
  name: 'active_users',
  help: 'Number of active users'
});

// Middleware
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;

    httpRequestsTotal.inc({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode
    });

    httpRequestDuration.observe(
      {
        method: req.method,
        route: req.route?.path || req.path,
        status_code: res.statusCode
      },
      duration
    );
  });

  next();
}

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

## Grafana Dashboards

### Example Dashboard JSON

```json
{
  "dashboard": {
    "title": "User Service Metrics",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{service=\"user-service\"}[5m])"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{status_code=~\"5..\"}[5m]) / rate(http_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Response Time (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
          }
        ]
      }
    ]
  }
}
```

## Distributed Tracing with Jaeger

### OpenTelemetry Implementation

```typescript
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const provider = new NodeTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'user-service',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  }),
});

const exporter = new JaegerExporter({
  endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
});

provider.addSpanProcessor(new BatchSpanProcessor(exporter));
provider.register();

registerInstrumentations({
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
  ],
});

// Custom span
import { trace } from '@opentelemetry/api';

async function processOrder(orderId: string) {
  const tracer = trace.getTracer('user-service');
  const span = tracer.startSpan('processOrder');

  span.setAttribute('order.id', orderId);

  try {
    // Business logic
    await orderRepository.findById(orderId);
    span.addEvent('Order fetched');

    await paymentService.process(orderId);
    span.addEvent('Payment processed');

    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message
    });
    span.recordException(error);
    throw error;
  } finally {
    span.end();
  }
}
```

## Structured Logging

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'user-service',
    version: '1.0.0'
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Usage
logger.info('User created', {
  userId: user.id,
  email: user.email,
  requestId: req.id
});

logger.error('Database connection failed', {
  error: error.message,
  stack: error.stack,
  database: 'users'
});
```

## SLIs and SLOs

### Service Level Indicators (SLIs)
Quantitative measures of service level

```typescript
// Availability SLI
const availability = successfulRequests / totalRequests;

// Latency SLI (p95)
const latencyP95 = calculatePercentile(requestDurations, 0.95);

// Error Rate SLI
const errorRate = errorRequests / totalRequests;
```

### Service Level Objectives (SLOs)
Target values for SLIs

```yaml
SLOs:
  Availability: 99.9%  # Max 43 minutes downtime per month
  Latency: p95 < 500ms
  Error Rate: < 1%
```

## Alerting Rules

```yaml
# prometheus-alerts.yml
groups:
- name: user-service
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High error rate on user-service"
      description: "Error rate is {{ $value }} (threshold: 0.05)"

  - alert: HighResponseTime
    expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "High response time"
      description: "P95 latency is {{ $value }}s"

  - alert: ServiceDown
    expr: up{job="user-service"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "User service is down"
      description: "User service has been down for more than 1 minute"
```

## Summary

- ✅ Prometheus metrics (counter, gauge, histogram)
- ✅ Grafana dashboard creation
- ✅ Distributed tracing with Jaeger
- ✅ Structured logging with Winston
- ✅ SLIs and SLOs
- ✅ Alerting rules

## Next Steps

1. Complete exercises in [exercises/](./exercises/)
2. Review [dashboard-guide.md](./dashboard-guide.md)
3. Complete [assignment.md](./assignment.md)
4. Proceed to [Module 12: Service Mesh](../12-service-mesh/README.md)
