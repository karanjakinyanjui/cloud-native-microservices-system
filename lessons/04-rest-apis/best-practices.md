# REST API Best Practices

## Naming Conventions

### ✅ Good Examples
```
GET    /api/users
POST   /api/users
GET    /api/users/123
PUT    /api/users/123
DELETE /api/users/123
GET    /api/users/123/orders
POST   /api/orders
GET    /api/products?category=electronics
```

### ❌ Bad Examples
```
GET    /api/getUsers
POST   /api/createUser
GET    /api/user/123
DELETE /api/deleteUser/123
GET    /api/getUserOrders/123
POST   /api/order/create
```

## HTTP Methods

### Use Correct Methods
- **GET**: Retrieve resources (safe, idempotent, cacheable)
- **POST**: Create resources (not idempotent)
- **PUT**: Replace entire resource (idempotent)
- **PATCH**: Partial update (may be idempotent)
- **DELETE**: Remove resource (idempotent)

### Idempotency Matters
```typescript
// PUT and DELETE should be idempotent
PUT /api/users/123    // Same result every time
DELETE /api/users/123 // Same result every time

// POST creates new resources
POST /api/users // Creates different user each time
```

## Status Codes

### Success Codes
- **200 OK**: Successful GET, PUT, PATCH
- **201 Created**: Successful POST (resource created)
- **204 No Content**: Successful DELETE

### Client Error Codes
- **400 Bad Request**: Invalid syntax
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Authenticated but not authorized
- **404 Not Found**: Resource doesn't exist
- **409 Conflict**: Resource conflict
- **422 Unprocessable Entity**: Validation failed
- **429 Too Many Requests**: Rate limit exceeded

### Server Error Codes
- **500 Internal Server Error**: Generic server error
- **503 Service Unavailable**: Temporary unavailable

## Response Formats

### Consistent Structure
```json
{
  "data": {},
  "meta": {},
  "error": null
}
```

### List Responses
```json
{
  "data": [...],
  "pagination": {
    "total": 1000,
    "page": 1,
    "pageSize": 20,
    "totalPages": 50
  }
}
```

### Error Responses
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {"field": "email", "message": "Invalid email format"}
    ]
  }
}
```

## Security

### 1. Authentication
```typescript
// Always use Bearer tokens
Authorization: Bearer <token>
```

### 2. Input Validation
```typescript
import Joi from 'joi';

const schema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(2).max(50).required()
});

const { error } = schema.validate(req.body);
if (error) {
  return res.status(422).json({ error: error.details });
}
```

### 3. Rate Limiting
```typescript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);
```

### 4. CORS
```typescript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS,
  credentials: true
}));
```

## Performance

### 1. Pagination
Always paginate large datasets:
```http
GET /api/products?page=1&limit=20
```

### 2. Caching
```typescript
res.set('Cache-Control', 'public, max-age=3600');
res.set('ETag', generateETag(data));
```

### 3. Compression
```typescript
import compression from 'compression';
app.use(compression());
```

### 4. Field Selection
```http
GET /api/users?fields=id,name,email
```

## Versioning

### URL Versioning (Recommended)
```
/api/v1/users
/api/v2/users
```

**Pros**: Clear, easy to route
**Cons**: Multiple URLs for same resource

### Header Versioning
```
GET /api/users
Accept: application/vnd.api.v1+json
```

**Pros**: Clean URLs
**Cons**: Harder to test

## Documentation

### Use OpenAPI/Swagger
```yaml
openapi: 3.0.0
info:
  title: User API
  version: 1.0.0
paths:
  /users:
    get:
      summary: List users
      parameters:
        - in: query
          name: page
          schema:
            type: integer
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserList'
```

## Testing

### Example Test
```typescript
describe('GET /api/users', () => {
  it('should return paginated users', async () => {
    const res = await request(app)
      .get('/api/users?page=1&limit=10')
      .expect(200);

    expect(res.body.data).toHaveLength(10);
    expect(res.body.pagination).toBeDefined();
  });

  it('should filter by status', async () => {
    const res = await request(app)
      .get('/api/users?status=active')
      .expect(200);

    expect(res.body.data.every(u => u.status === 'active')).toBe(true);
  });
});
```

## Common Mistakes

### ❌ Using verbs in URLs
```
/api/getUsers
/api/createUser
```

### ❌ Wrong status codes
```typescript
// Wrong: returning 200 for all responses
res.status(200).json({ error: 'Not found' });

// Correct:
res.status(404).json({ error: 'Not found' });
```

### ❌ Not handling errors
```typescript
// Wrong: letting errors crash the server
app.get('/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  res.json(user);
});

// Correct: handling errors
app.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### ❌ Exposing sensitive data
```typescript
// Wrong: returning password hash
res.json(user);

// Correct: excluding sensitive fields
const { password, ...safeUser } = user;
res.json(safeUser);
```

## Checklist

- [ ] Use nouns for resource names
- [ ] Use plural forms
- [ ] Implement proper HTTP methods
- [ ] Return correct status codes
- [ ] Handle errors gracefully
- [ ] Validate all inputs
- [ ] Implement authentication
- [ ] Add rate limiting
- [ ] Support pagination
- [ ] Enable CORS properly
- [ ] Version your API
- [ ] Document with OpenAPI
- [ ] Write comprehensive tests
- [ ] Monitor API performance
