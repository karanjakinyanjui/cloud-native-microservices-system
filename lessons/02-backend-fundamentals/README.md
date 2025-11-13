# Module 2: Backend Development Fundamentals

## Overview

Welcome to Module 2! Now that your development environment is set up, it's time to dive into the core concepts of backend development. This module covers the foundational principles that power all web applications: HTTP, client-server architecture, and RESTful communication.

Understanding these fundamentals is critical before building microservices. Every service in our platform communicates using HTTP, follows REST principles, and implements the request-response pattern. By mastering these concepts, you'll understand how services interact and why certain design decisions were made.

## Learning Objectives

By the end of this module, you will be able to:

- ✅ Explain client-server architecture and its components
- ✅ Understand the HTTP protocol in depth
- ✅ Use HTTP methods correctly (GET, POST, PUT, DELETE, PATCH)
- ✅ Choose appropriate HTTP status codes for responses
- ✅ Work with HTTP headers for metadata and control
- ✅ Build a simple HTTP server from scratch using Node.js
- ✅ Parse request data (query parameters, body, headers)
- ✅ Implement basic routing logic
- ✅ Handle errors gracefully with proper status codes

## Client-Server Architecture

### What is Client-Server Architecture?

Client-server is a distributed application structure that separates tasks between providers of resources (servers) and requesters (clients). This is the foundation of how the web works.

```mermaid
graph LR
    Client[Client Browser/App] -->|HTTP Request| Server[Backend Server]
    Server -->|HTTP Response| Client
    Server -->|Query| Database[(Database)]
    Database -->|Data| Server
```

### Key Components

#### Client
- **Web Browser**: Chrome, Firefox, Safari
- **Mobile App**: iOS or Android application
- **Another Service**: In microservices, services act as clients to each other
- **CLI Tool**: Command-line applications making API calls

The client initiates requests and consumes responses.

#### Server
- **Web Server**: Nginx, Apache
- **Application Server**: Node.js, Java, Python applications
- **API Server**: Provides data and functionality via APIs
- **Microservice**: Individual service handling specific domain logic

The server receives requests, processes them, and returns responses.

#### Database
- **Relational**: PostgreSQL, MySQL
- **NoSQL**: MongoDB, Redis
- **In-Memory**: Redis, Memcached
- **Search**: Elasticsearch

Stores and retrieves application data.

### How It Works

1. **Client sends request**: "GET /api/products"
2. **Server receives request**: Routes to appropriate handler
3. **Server processes**: Fetches data, applies business logic
4. **Server sends response**: Returns data with status code
5. **Client processes response**: Displays data to user

### Benefits of Client-Server Architecture

- **Separation of Concerns**: UI logic separate from business logic
- **Scalability**: Scale servers independently
- **Security**: Keep sensitive logic on server
- **Maintenance**: Update server without changing clients
- **Multiple Clients**: One server can serve web, mobile, and APIs

## HTTP Protocol Deep Dive

### What is HTTP?

HTTP (HyperText Transfer Protocol) is the foundation of data communication on the web. It's a stateless, application-layer protocol for distributed, collaborative, hypermedia information systems.

**Key Characteristics**:
- **Stateless**: Each request is independent (no memory of previous requests)
- **Text-based**: Human-readable protocol
- **Request-Response**: Always follows request → response pattern
- **Port**: Typically uses port 80 (HTTP) or 443 (HTTPS)

### HTTP Request Structure

```
GET /api/products?category=electronics HTTP/1.1
Host: api.example.com
User-Agent: Mozilla/5.0
Accept: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "filter": "available"
}
```

**Components**:
1. **Request Line**: Method, path, HTTP version
2. **Headers**: Metadata about the request
3. **Empty Line**: Separates headers from body
4. **Body** (optional): Data being sent

### HTTP Response Structure

```
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 348
Cache-Control: max-age=3600
X-Response-Time: 45ms

{
  "products": [
    {"id": 1, "name": "Laptop"},
    {"id": 2, "name": "Phone"}
  ]
}
```

**Components**:
1. **Status Line**: HTTP version, status code, status text
2. **Headers**: Metadata about the response
3. **Empty Line**: Separates headers from body
4. **Body**: Data being returned

### HTTP Methods

HTTP methods (also called verbs) indicate the desired action to be performed on a resource.

#### GET - Retrieve Data
```http
GET /api/products
GET /api/products/123
GET /api/products?category=electronics&page=1
```

**Characteristics**:
- **Safe**: Does not modify server state
- **Idempotent**: Multiple identical requests have same effect
- **Cacheable**: Responses can be cached
- **No Body**: Should not have request body

**Use Cases**:
- Fetch list of resources
- Retrieve specific resource
- Search and filter data

#### POST - Create New Resource
```http
POST /api/products
Content-Type: application/json

{
  "name": "New Laptop",
  "price": 999.99,
  "category": "electronics"
}
```

**Characteristics**:
- **Not Safe**: Modifies server state
- **Not Idempotent**: Multiple requests create multiple resources
- **Not Cacheable**: Should not be cached
- **Has Body**: Typically includes request body

**Use Cases**:
- Create new resource
- Submit form data
- Upload files
- Trigger actions

#### PUT - Update/Replace Resource
```http
PUT /api/products/123
Content-Type: application/json

{
  "id": 123,
  "name": "Updated Laptop",
  "price": 899.99,
  "category": "electronics"
}
```

**Characteristics**:
- **Not Safe**: Modifies server state
- **Idempotent**: Multiple identical requests have same effect
- **Replaces**: Completely replaces the resource

**Use Cases**:
- Update entire resource
- Replace existing data

#### PATCH - Partial Update
```http
PATCH /api/products/123
Content-Type: application/json

{
  "price": 849.99
}
```

**Characteristics**:
- **Not Safe**: Modifies server state
- **May be Idempotent**: Depends on implementation
- **Partial Update**: Only modifies specified fields

**Use Cases**:
- Update specific fields
- Partial modifications

#### DELETE - Remove Resource
```http
DELETE /api/products/123
```

**Characteristics**:
- **Not Safe**: Modifies server state
- **Idempotent**: Multiple identical requests have same effect
- **No Body**: Typically no request body

**Use Cases**:
- Delete resources
- Remove data

#### Other Methods
- **HEAD**: Like GET but only retrieves headers
- **OPTIONS**: Describes communication options
- **CONNECT**: Establishes tunnel to server
- **TRACE**: Performs message loop-back test

### HTTP Status Codes

Status codes indicate the result of the HTTP request.

#### 1xx - Informational
- **100 Continue**: Client should continue with request
- **101 Switching Protocols**: Server switching protocols

#### 2xx - Success
- **200 OK**: Request succeeded
- **201 Created**: Resource created successfully
- **202 Accepted**: Request accepted, processing not complete
- **204 No Content**: Success but no content to return
- **206 Partial Content**: Partial resource delivered

#### 3xx - Redirection
- **301 Moved Permanently**: Resource permanently moved
- **302 Found**: Temporary redirect
- **304 Not Modified**: Cached version is still valid
- **307 Temporary Redirect**: Temporary redirect, method unchanged
- **308 Permanent Redirect**: Permanent redirect, method unchanged

#### 4xx - Client Errors
- **400 Bad Request**: Malformed request syntax
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Server understood but refuses to authorize
- **404 Not Found**: Resource not found
- **405 Method Not Allowed**: Method not supported for resource
- **409 Conflict**: Request conflicts with current state
- **422 Unprocessable Entity**: Validation failed
- **429 Too Many Requests**: Rate limit exceeded

#### 5xx - Server Errors
- **500 Internal Server Error**: Generic server error
- **501 Not Implemented**: Server doesn't support functionality
- **502 Bad Gateway**: Invalid response from upstream server
- **503 Service Unavailable**: Server temporarily unavailable
- **504 Gateway Timeout**: Upstream server timeout

### Common HTTP Headers

#### Request Headers
```http
Host: api.example.com                    # Target host
User-Agent: Mozilla/5.0                  # Client information
Accept: application/json                  # Accepted response types
Content-Type: application/json            # Request body type
Authorization: Bearer <token>             # Authentication credentials
Cookie: sessionId=abc123                  # Session cookie
Cache-Control: no-cache                   # Cache directives
If-None-Match: "686897696a7c"           # Conditional request
```

#### Response Headers
```http
Content-Type: application/json            # Response body type
Content-Length: 348                       # Body size in bytes
Cache-Control: max-age=3600              # Caching directives
Set-Cookie: sessionId=abc123             # Set cookie
ETag: "686897696a7c"                     # Resource version
Location: /api/products/123              # Resource location (redirects)
X-RateLimit-Remaining: 90                # Custom header (rate limit)
```

## Request-Response Cycle

### The Complete Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    participant D as Database

    C->>S: HTTP Request (GET /api/products)
    S->>S: Parse Request
    S->>S: Authenticate
    S->>S: Validate
    S->>D: Query Database
    D->>S: Return Data
    S->>S: Format Response
    S->>C: HTTP Response (200 OK + Data)
    C->>C: Process Response
```

### Step-by-Step Breakdown

1. **Client Prepares Request**
   - Constructs URL
   - Sets HTTP method
   - Adds headers
   - Includes body if needed

2. **Network Transmission**
   - DNS lookup (domain to IP)
   - TCP connection established
   - TLS handshake (for HTTPS)
   - Request sent over network

3. **Server Receives Request**
   - Parse request line
   - Parse headers
   - Parse body

4. **Server Processes Request**
   - Route to appropriate handler
   - Authenticate user
   - Validate input
   - Execute business logic
   - Query database if needed

5. **Server Prepares Response**
   - Determine status code
   - Set response headers
   - Format response body
   - Add metadata

6. **Network Transmission**
   - Response sent over network
   - Connection closed or kept alive

7. **Client Processes Response**
   - Parse status code
   - Parse headers
   - Parse body
   - Handle errors
   - Update UI

## Building Your First HTTP Server

Let's build a simple HTTP server using Node.js's built-in `http` module:

```javascript
const http = require('http');

// Create server
const server = http.createServer((req, res) => {
  // Log request
  console.log(`${req.method} ${req.url}`);

  // Parse URL
  const url = new URL(req.url, `http://${req.headers.host}`);

  // Simple routing
  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Welcome to the API' }));
  }
  else if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  }
  else if (req.method === 'GET' && url.pathname === '/users') {
    const users = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' }
    ];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(users));
  }
  else if (req.method === 'POST' && url.pathname === '/users') {
    let body = '';

    // Collect data chunks
    req.on('data', chunk => {
      body += chunk.toString();
    });

    // Process complete body
    req.on('end', () => {
      try {
        const user = JSON.parse(body);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: 3, ...user }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
  }
  else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

// Start server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

### Testing the Server

```bash
# Test GET /
curl http://localhost:3000/

# Test GET /health
curl http://localhost:3000/health

# Test GET /users
curl http://localhost:3000/users

# Test POST /users
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Charlie","email":"charlie@example.com"}'

# Test 404
curl http://localhost:3000/unknown
```

## Best Practices

### 1. Use Appropriate HTTP Methods
- **GET** for reading
- **POST** for creating
- **PUT/PATCH** for updating
- **DELETE** for removing

### 2. Return Correct Status Codes
- **2xx** for success
- **4xx** for client errors
- **5xx** for server errors

### 3. Include Relevant Headers
- `Content-Type` for body format
- `Content-Length` for body size
- `Cache-Control` for caching
- `Authorization` for auth

### 4. Handle Errors Gracefully
```javascript
try {
  // Process request
} catch (error) {
  res.writeHead(500, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    error: 'Internal Server Error',
    message: error.message
  }));
}
```

### 5. Validate Input
- Check required fields
- Validate data types
- Sanitize input
- Return 400 for invalid data

### 6. Log Requests
- Log method and path
- Log response status
- Log response time
- Log errors with stack traces

## Real-World Example: Our Microservices

In our e-commerce platform, services communicate via HTTP:

**Order Service → Payment Service**
```http
POST /api/payments
Content-Type: application/json
Authorization: Bearer service-token

{
  "orderId": "order-123",
  "amount": 99.99,
  "currency": "USD"
}
```

**Payment Service Response**
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "paymentId": "pay-456",
  "status": "completed",
  "orderId": "order-123"
}
```

## Summary

In this module, you learned:

- ✅ Client-server architecture fundamentals
- ✅ HTTP protocol structure and mechanics
- ✅ HTTP methods and when to use each
- ✅ HTTP status codes and their meanings
- ✅ Common HTTP headers and their purposes
- ✅ Request-response lifecycle
- ✅ Building a simple HTTP server
- ✅ Best practices for HTTP APIs

## Next Steps

1. Complete the exercises in [exercises/](./exercises/)
2. Take the quiz in [quiz.md](./quiz.md)
3. Build the assignment in [assignment.md](./assignment.md)
4. Review additional resources in [resources.md](./resources.md)
5. Proceed to [Module 3: Node.js & TypeScript](../03-nodejs-typescript/README.md)

## Additional Resources

- [MDN HTTP Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP)
- [HTTP/1.1 Specification (RFC 7231)](https://tools.ietf.org/html/rfc7231)
- [HTTP Status Codes](https://httpstatuses.com/)
- [HTTP Headers Reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers)
