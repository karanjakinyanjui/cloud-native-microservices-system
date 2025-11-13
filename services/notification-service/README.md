# Notification Service

A production-ready microservice for handling email and SMS notifications in a cloud-native architecture.

## Features

- **Multi-Channel Support**: Send notifications via email and SMS
- **Template Management**: Template-based notifications with Handlebars
- **Notification Tracking**: Track notification status and delivery
- **Batch Processing**: Send multiple notifications in batches
- **Queue Support**: Ready for Redis/RabbitMQ integration
- **Production Ready**: Comprehensive logging, metrics, and tracing
- **Health Checks**: Kubernetes-ready health and readiness probes
- **Mock Mode**: Test without real SMTP/SMS credentials

## Architecture

```
notification-service/
├── src/
│   ├── index.ts                 # Main application entry point
│   ├── config.ts                # Configuration management
│   ├── database.ts              # PostgreSQL connection and schema
│   ├── controllers/
│   │   └── notification.controller.ts
│   ├── routes/
│   │   ├── notification.routes.ts
│   │   └── health.routes.ts
│   ├── services/
│   │   ├── emailService.ts      # Email sending service
│   │   └── smsService.ts        # SMS sending service
│   ├── middleware/
│   │   ├── errorHandler.ts
│   │   └── auth.middleware.ts
│   ├── utils/
│   │   ├── logger.ts            # Winston logger
│   │   ├── tracer.ts            # Jaeger tracing
│   │   └── metrics.ts           # Prometheus metrics
│   └── templates/
│       └── email-templates.ts   # Email template definitions
├── Dockerfile
├── package.json
└── tsconfig.json
```

## Database Schema

### Notifications Table
```sql
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  type VARCHAR(100) NOT NULL,
  channel VARCHAR(50) NOT NULL,
  subject VARCHAR(500),
  content TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Notification Templates Table
```sql
CREATE TABLE notification_templates (
  id SERIAL PRIMARY KEY,
  type VARCHAR(100) NOT NULL UNIQUE,
  channel VARCHAR(50) NOT NULL,
  subject_template TEXT,
  content_template TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### Send Notification
```http
POST /api/notifications
Content-Type: application/json

{
  "userId": 123,
  "type": "order_created",
  "channel": "email",
  "recipient": {
    "email": "user@example.com"
  },
  "data": {
    "orderId": "12345",
    "userName": "John Doe",
    "totalAmount": "99.99",
    "orderDate": "2025-11-13",
    "orderUrl": "https://example.com/orders/12345"
  }
}
```

### Get Notification
```http
GET /api/notifications/:id
```

### List Notifications
```http
GET /api/notifications?userId=123&type=order_created&page=1&limit=20
```

### Resend Notification
```http
POST /api/notifications/:id/resend
```

### Get Statistics
```http
GET /api/notifications/stats/summary
```

## Health Endpoints

- `GET /health` - Basic health check
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe
- `GET /health/detailed` - Detailed component health
- `GET /metrics` - Prometheus metrics

## Configuration

Environment variables (see `.env.example`):

```bash
# Server
PORT=3006
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=notification_db
DB_USER=postgres
DB_PASSWORD=postgres

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-password
EMAIL_FROM=noreply@example.com

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Tracing
JAEGER_AGENT_HOST=localhost
JAEGER_AGENT_PORT=6831
JAEGER_SERVICE_NAME=notification-service
```

## Notification Types

Built-in templates for:
- `order_created` - Order confirmation
- `order_paid` - Payment confirmation
- `order_shipped` - Shipping notification
- `order_delivered` - Delivery confirmation
- `order_cancelled` - Cancellation confirmation

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build
npm run build

# Run in production
npm start

# Lint
npm run lint
```

## Docker

```bash
# Build image
docker build -t notification-service:latest .

# Run container
docker run -p 3006:3006 \
  -e DB_HOST=postgres \
  -e DB_NAME=notification_db \
  notification-service:latest
```

## Monitoring

### Prometheus Metrics
- `http_request_duration_seconds` - HTTP request duration
- `http_requests_total` - Total HTTP requests
- `notifications_sent_total` - Total notifications sent
- `notification_duration_seconds` - Notification processing time
- `emails_sent_total` - Total emails sent
- `sms_sent_total` - Total SMS sent
- `database_query_duration_seconds` - Database query duration

### Jaeger Tracing
All operations are traced with distributed tracing support:
- Notification sending operations
- Database queries
- Email/SMS delivery
- HTTP requests

## Mock Mode

The service runs in mock mode when SMTP/SMS credentials are not configured:
- Email service logs instead of sending
- SMS service logs instead of sending
- Perfect for development and testing

## Production Considerations

1. **Email Service**: Configure real SMTP credentials or use a service like SendGrid, AWS SES
2. **SMS Service**: Configure Twilio credentials for real SMS delivery
3. **Queue System**: Integrate Redis or RabbitMQ for better scalability
4. **Rate Limiting**: Adjust rate limits based on your needs
5. **Database**: Use connection pooling and read replicas for scale
6. **Monitoring**: Set up alerts for failed notifications

## Security

- Helmet.js for security headers
- Rate limiting on API endpoints
- Input validation
- Error message sanitization
- Non-root Docker user
- No sensitive data in logs

## License

MIT
