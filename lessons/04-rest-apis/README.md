# Module 4: RESTful API Design

## Overview

REST (Representational State Transfer) is an architectural style for designing networked applications. This module teaches you how to design and build production-quality RESTful APIs following industry best practices. Our entire microservices platform uses REST for external communication, making this knowledge essential.

## Learning Objectives

- ✅ Understand REST principles and constraints
- ✅ Design resource-oriented APIs
- ✅ Implement proper CRUD operations
- ✅ Apply REST best practices for naming and structure
- ✅ Handle pagination, filtering, and sorting
- ✅ Implement API versioning strategies
- ✅ Document APIs with OpenAPI/Swagger

## REST Principles

### Six Constraints of REST

1. **Client-Server**: Separation of concerns
2. **Stateless**: Each request contains all necessary information
3. **Cacheable**: Responses must define themselves as cacheable or not
4. **Uniform Interface**: Consistent way to interact with resources
5. **Layered System**: Client can't tell if connected directly to server
6. **Code on Demand** (optional): Server can extend client functionality

### Richardson Maturity Model

```
Level 3: Hypermedia Controls (HATEOAS)
Level 2: HTTP Verbs
Level 1: Resources
Level 0: The Swamp of POX
```

## Resource Design

### Resource Naming

**Use nouns, not verbs**:
```
✅ GET /users
✅ POST /products
✅ GET /orders/123

❌ GET /getUsers
❌ POST /createProduct
❌ GET /fetchOrder/123
```

**Use plural nouns**:
```
✅ /users
✅ /products
✅ /orders

❌ /user
❌ /product
❌ /order
```

**Resource hierarchy**:
```
✅ /users/123/orders
✅ /products/456/reviews
✅ /orders/789/items

❌ /userOrders/123
❌ /productReviews/456
```

## CRUD Operations

### CREATE - POST

```http
POST /api/users
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com"
}

Response: 201 Created
Location: /api/users/123

{
  "id": 123,
  "name": "John Doe",
  "email": "john@example.com",
  "createdAt": "2025-01-15T10:00:00Z"
}
```

### READ - GET

```http
# List resources
GET /api/users
Response: 200 OK

{
  "data": [
    {"id": 1, "name": "John Doe"},
    {"id": 2, "name": "Jane Smith"}
  ],
  "total": 2,
  "page": 1,
  "pageSize": 20
}

# Get single resource
GET /api/users/123
Response: 200 OK

{
  "id": 123,
  "name": "John Doe",
  "email": "john@example.com"
}
```

### UPDATE - PUT/PATCH

```http
# Full update with PUT
PUT /api/users/123
Content-Type: application/json

{
  "name": "John Updated",
  "email": "john.updated@example.com"
}

Response: 200 OK

# Partial update with PATCH
PATCH /api/users/123
Content-Type: application/json

{
  "name": "John Partially Updated"
}

Response: 200 OK
```

### DELETE

```http
DELETE /api/users/123
Response: 204 No Content
```

## Query Parameters

### Filtering

```http
GET /api/products?category=electronics
GET /api/products?category=electronics&price_min=100&price_max=500
GET /api/users?status=active&role=admin
```

### Sorting

```http
GET /api/products?sort=price           # Ascending
GET /api/products?sort=-price          # Descending
GET /api/products?sort=category,price  # Multiple fields
```

### Pagination

**Offset-based**:
```http
GET /api/products?page=2&limit=20
```

**Cursor-based** (better for large datasets):
```http
GET /api/products?cursor=eyJpZCI6MTAwfQ&limit=20
```

**Response format**:
```json
{
  "data": [...],
  "pagination": {
    "total": 1000,
    "page": 2,
    "pageSize": 20,
    "totalPages": 50,
    "hasNext": true,
    "hasPrev": true
  }
}
```

### Field Selection

```http
GET /api/users?fields=id,name,email
```

### Search

```http
GET /api/products?q=laptop
GET /api/users?search=john
```

## API Versioning

### URL Versioning (Recommended)
```http
GET /api/v1/users
GET /api/v2/users
```

### Header Versioning
```http
GET /api/users
Accept: application/vnd.api.v1+json
```

### Query Parameter Versioning
```http
GET /api/users?version=1
```

## Error Handling

### Standard Error Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      }
    ],
    "timestamp": "2025-01-15T10:00:00Z",
    "path": "/api/users"
  }
}
```

### Common Error Responses

```typescript
// 400 Bad Request
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Invalid request data"
  }
}

// 401 Unauthorized
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}

// 403 Forbidden
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions"
  }
}

// 404 Not Found
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}

// 422 Unprocessable Entity
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [...]
  }
}

// 500 Internal Server Error
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

## Best Practices

### 1. Use Appropriate Status Codes

```typescript
app.post('/api/users', async (req, res) => {
  const user = await createUser(req.body);
  res.status(201).json(user); // 201 Created
});

app.get('/api/users/:id', async (req, res) => {
  const user = await getUserById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.status(200).json(user); // 200 OK
});
```

### 2. Return Relevant Data

```typescript
// POST response includes created resource
POST /api/users → 201 Created + user object

// PUT/PATCH response includes updated resource
PUT /api/users/123 → 200 OK + user object

// DELETE response has no content
DELETE /api/users/123 → 204 No Content
```

### 3. Use Nested Resources Appropriately

```http
✅ GET /users/123/orders          # Get orders for user 123
✅ GET /products/456/reviews      # Get reviews for product 456

❌ GET /users/123/orders/456/payments/789/receipts  # Too deep
```

### 4. Implement Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);
```

### 5. Include Metadata

```json
{
  "data": [...],
  "meta": {
    "timestamp": "2025-01-15T10:00:00Z",
    "version": "1.0",
    "requestId": "abc-123"
  }
}
```

## Real-World Example: Product Service

```typescript
// GET /api/products
router.get('/products', async (req, res) => {
  const {
    page = 1,
    limit = 20,
    sort = '-createdAt',
    category,
    minPrice,
    maxPrice,
    search
  } = req.query;

  const filters = {
    ...(category && { category }),
    ...(minPrice && { price: { $gte: minPrice } }),
    ...(maxPrice && { price: { $lte: maxPrice } }),
    ...(search && { name: { $regex: search, $options: 'i' } })
  };

  const products = await Product.find(filters)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await Product.countDocuments(filters);

  res.json({
    data: products,
    pagination: {
      total,
      page: Number(page),
      pageSize: Number(limit),
      totalPages: Math.ceil(total / limit)
    }
  });
});
```

## Summary

- ✅ REST principles and constraints
- ✅ Resource-oriented API design
- ✅ CRUD operations with proper HTTP methods
- ✅ Query parameters for filtering, sorting, pagination
- ✅ API versioning strategies
- ✅ Error handling best practices
- ✅ Real-world implementation patterns

## Next Steps

1. Complete exercises in [exercises/](./exercises/)
2. Review [best-practices.md](./best-practices.md)
3. Complete [assignment.md](./assignment.md)
4. Proceed to [Module 5: Databases](../05-databases/README.md)
