# Order Service

A production-ready Order Service built with TypeScript and Node.js for managing orders in a cloud-native microservices architecture.

## Features

- **Order Management**: Create, retrieve, update, and cancel orders
- **Distributed Transactions**: Implements saga pattern with compensation for failed transactions
- **Order Status Workflow**: pending → paid → processing → shipped → delivered
- **Inter-Service Communication**: Integrates with Product, Payment, and Notification services
- **Stock Management**: Automatic stock updates with rollback on failure
- **Payment Processing**: Integrated payment flow with automatic refunds on cancellation
- **Distributed Tracing**: Jaeger integration for request tracing
- **Metrics**: Prometheus metrics for monitoring
- **Health Checks**: Kubernetes-ready liveness and readiness probes
- **Authentication & Authorization**: JWT-based auth with role-based access control

## Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Tracing**: Jaeger
- **Metrics**: Prometheus (prom-client)
- **Logging**: Winston

## API Endpoints

### Orders

- `POST /api/orders` - Create a new order (authenticated)
- `GET /api/orders` - List orders with pagination (authenticated)
- `GET /api/orders/:id` - Get order by ID (authenticated)
- `PATCH /api/orders/:id/status` - Update order status (admin only)
- `POST /api/orders/:id/cancel` - Cancel an order (authenticated)

### Health Checks

- `GET /health` - Basic health check
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

### Metrics

- `GET /metrics` - Prometheus metrics

## Order Status Flow

```
pending → paid → processing → shipped → delivered
                    ↓
                cancelled / failed
```

## Database Schema

### Orders Table

```sql
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  total_amount DECIMAL(10, 2) NOT NULL,
  shipping_address JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Order Items Table

```sql
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Environment Variables

See `.env.example` for all configuration options.

Key variables:
- `PORT` - Service port (default: 3004)
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - Database configuration
- `PRODUCT_SERVICE_URL` - Product service endpoint
- `PAYMENT_SERVICE_URL` - Payment service endpoint
- `NOTIFICATION_SERVICE_URL` - Notification service endpoint
- `JAEGER_AGENT_HOST`, `JAEGER_AGENT_PORT` - Jaeger configuration
- `JWT_SECRET` - JWT secret for authentication

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Running instances of Product, Payment, and Notification services

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Update .env with your configuration
```

### Development

```bash
# Run in development mode
npm run dev
```

### Production

```bash
# Build
npm run build

# Start
npm start
```

### Docker

```bash
# Build image
docker build -t order-service:latest .

# Run container
docker run -p 3004:3004 --env-file .env order-service:latest
```

## Order Creation Flow

1. **Validate Request**: Check order items and shipping address
2. **Verify Products**: Call Product Service to verify all products exist
3. **Check Stock**: Verify sufficient stock for all items
4. **Calculate Total**: Calculate order total amount
5. **Create Order**: Insert order and order items into database
6. **Update Stock**: Decrease stock for all products
7. **Process Payment**: Call Payment Service to process payment
8. **Update Status**: Update order status to 'paid' on success
9. **Send Notification**: Notify user about order creation
10. **Compensation**: Rollback stock if payment fails

## Error Handling & Compensation

The service implements a distributed transaction pattern with compensation:

- If payment fails after stock is reduced, stock is automatically restored
- If service calls fail, retries with exponential backoff are attempted
- All errors are logged and traced for debugging
- Proper HTTP status codes are returned for different error scenarios

## Monitoring

### Metrics Available

- `http_request_duration_seconds` - HTTP request duration
- `http_requests_total` - Total HTTP requests
- `orders_created_total` - Total orders created
- `orders_status_total` - Orders by status
- `order_processing_duration_seconds` - Order processing duration
- `external_service_requests_total` - External service calls
- `external_service_duration_seconds` - External service call duration
- `database_query_duration_seconds` - Database query duration

### Logging

Logs are written to:
- Console (all levels)
- `logs/all.log` (all levels)
- `logs/error.log` (errors only)

## Security

- JWT authentication for all protected routes
- Role-based authorization (admin/user)
- Helmet.js for HTTP security headers
- CORS configuration
- Input validation
- SQL injection prevention via parameterized queries

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test

# Watch mode
npm run test:watch
```

## License

MIT
