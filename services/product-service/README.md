# Product Service

A production-ready product catalog and inventory management microservice built with TypeScript and Node.js.

## Features

- Complete CRUD operations for products
- Advanced search and filtering capabilities
- Pagination support
- Stock management
- Category management
- Input validation with Joi
- Production-ready error handling
- Structured logging with Winston
- Distributed tracing with Jaeger
- Prometheus metrics
- Health checks (liveness and readiness)
- Role-based access control (RBAC)

## Tech Stack

- **Runtime**: Node.js 20
- **Language**: TypeScript
- **Framework**: Express
- **Database**: PostgreSQL
- **Validation**: Joi
- **Logging**: Winston
- **Tracing**: Jaeger
- **Metrics**: Prometheus (prom-client)

## Database Schema

### Products Table
- `id` (SERIAL PRIMARY KEY)
- `name` (VARCHAR 255)
- `description` (TEXT)
- `price` (DECIMAL 10,2)
- `category_id` (INTEGER, FK to categories)
- `stock_quantity` (INTEGER)
- `images` (TEXT[])
- `metadata` (JSONB)
- `is_active` (BOOLEAN)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Categories Table
- `id` (SERIAL PRIMARY KEY)
- `name` (VARCHAR 255)
- `description` (TEXT)
- `slug` (VARCHAR 255)
- `is_active` (BOOLEAN)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## API Endpoints

### Products

#### List Products
```
GET /api/products
Query Parameters:
  - page (default: 1)
  - limit (default: 20, max: 100)
  - search (search in name/description)
  - category (filter by category slug)
  - minPrice (minimum price)
  - maxPrice (maximum price)
  - isActive (true/false)
  - sortBy (name, price, created_at, stock_quantity)
  - sortOrder (ASC/DESC)
```

#### Get Product
```
GET /api/products/:id
```

#### Create Product (Admin)
```
POST /api/products
Body:
{
  "name": "Product Name",
  "description": "Product description",
  "price": 99.99,
  "category_id": 1,
  "stock_quantity": 100,
  "images": ["https://example.com/image.jpg"],
  "metadata": {},
  "is_active": true
}
```

#### Update Product (Admin)
```
PUT /api/products/:id
Body: (partial update supported)
{
  "name": "Updated Name",
  "price": 89.99
}
```

#### Delete Product (Admin)
```
DELETE /api/products/:id
```

#### Update Stock (Admin)
```
PATCH /api/products/:id/stock
Body:
{
  "quantity": 10,
  "operation": "add" | "subtract" | "set"
}
```

### Categories

#### List Categories
```
GET /api/categories
```

#### Get Category
```
GET /api/categories/:id
```

### Health Checks

#### Liveness Probe
```
GET /health/liveness
```

#### Readiness Probe
```
GET /health/readiness
```

### Metrics
```
GET /metrics
```

## Authentication

All endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

Admin-only endpoints also require the user to have the `admin` role.

## Environment Variables

See `.env.example` for required environment variables.

## Running Locally

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Run in development mode:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
npm start
```

## Docker

Build the image:
```bash
docker build -t product-service:latest .
```

Run the container:
```bash
docker run -p 3003:3003 --env-file .env product-service:latest
```

## Metrics

The service exposes the following custom metrics:

- `http_request_duration_seconds` - HTTP request duration
- `http_requests_total` - Total HTTP requests
- `product_operations_total` - Product operations counter
- `stock_updates_total` - Stock update operations
- `active_products_total` - Number of active products

## Logging

Logs are structured JSON format in production and colorized console format in development.

## Tracing

Distributed tracing is enabled via Jaeger. Configure the Jaeger agent host and port via environment variables.
