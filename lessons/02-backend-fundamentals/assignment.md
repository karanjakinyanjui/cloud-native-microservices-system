# Module 2: Assignment - Build a Simple API Server

## Objective

Build a complete HTTP API server from scratch using only Node.js built-in modules (no Express or other frameworks). This will solidify your understanding of HTTP fundamentals, request-response cycle, and routing.

## Requirements

### Functional Requirements

Build a **Task Management API** with the following endpoints:

#### 1. Health Check
```http
GET /health
Response: 200 OK
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

#### 2. List All Tasks
```http
GET /tasks
Response: 200 OK
[
  {
    "id": 1,
    "title": "Complete assignment",
    "completed": false,
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
]
```

#### 3. Get Single Task
```http
GET /tasks/1
Response: 200 OK
{
  "id": 1,
  "title": "Complete assignment",
  "completed": false
}

Response: 404 Not Found
{
  "error": "Task not found"
}
```

#### 4. Create Task
```http
POST /tasks
Content-Type: application/json

{
  "title": "New task"
}

Response: 201 Created
{
  "id": 2,
  "title": "New task",
  "completed": false,
  "createdAt": "2025-01-15T10:30:00.000Z"
}

Response: 400 Bad Request (missing title)
{
  "error": "Title is required"
}
```

#### 5. Update Task
```http
PUT /tasks/1
Content-Type: application/json

{
  "title": "Updated task",
  "completed": true
}

Response: 200 OK
{
  "id": 1,
  "title": "Updated task",
  "completed": true
}

Response: 404 Not Found
{
  "error": "Task not found"
}
```

#### 6. Partial Update Task
```http
PATCH /tasks/1
Content-Type: application/json

{
  "completed": true
}

Response: 200 OK
{
  "id": 1,
  "title": "Original title",
  "completed": true
}
```

#### 7. Delete Task
```http
DELETE /tasks/1
Response: 204 No Content

Response: 404 Not Found
{
  "error": "Task not found"
}
```

#### 8. Filter Tasks
```http
GET /tasks?completed=true
Response: 200 OK
[
  {
    "id": 1,
    "title": "Completed task",
    "completed": true
  }
]
```

### Technical Requirements

1. **Use Only Built-in Modules**
   - `http` for server
   - `url` for URL parsing
   - No external dependencies (no Express, no npm packages)

2. **Proper HTTP Status Codes**
   - 200 OK for successful GET, PUT, PATCH
   - 201 Created for successful POST
   - 204 No Content for successful DELETE
   - 400 Bad Request for invalid input
   - 404 Not Found for missing resources
   - 405 Method Not Allowed for unsupported methods
   - 500 Internal Server Error for server errors

3. **Request Validation**
   - Validate required fields
   - Validate data types
   - Return clear error messages

4. **Error Handling**
   - Handle malformed JSON
   - Handle invalid IDs
   - Catch and handle all errors
   - Never expose stack traces to clients

5. **Logging**
   - Log all requests: `[GET] /tasks - 200 (45ms)`
   - Log errors with details
   - Include timestamps

6. **Code Quality**
   - Clean, readable code
   - Proper function separation
   - Comments for complex logic
   - Consistent code style

## Starter Code Structure

```javascript
// server.js
const http = require('http');
const url = require('url');

// In-memory data store
let tasks = [
  {
    id: 1,
    title: 'Learn HTTP',
    completed: false,
    createdAt: new Date().toISOString()
  }
];

let nextId = 2;

// Utility functions
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error('Invalid JSON'));
      }
    });
  });
}

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function sendError(res, statusCode, message) {
  sendJSON(res, statusCode, { error: message });
}

// Request handlers
async function handleGetTasks(req, res, query) {
  // TODO: Implement
}

async function handleGetTask(req, res, id) {
  // TODO: Implement
}

async function handleCreateTask(req, res) {
  // TODO: Implement
}

async function handleUpdateTask(req, res, id) {
  // TODO: Implement
}

async function handlePatchTask(req, res, id) {
  // TODO: Implement
}

async function handleDeleteTask(req, res, id) {
  // TODO: Implement
}

// Router
async function router(req, res) {
  const startTime = Date.now();
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Log request
  console.log(`[${method}] ${pathname}`);

  try {
    // Route to handlers
    if (pathname === '/health' && method === 'GET') {
      sendJSON(res, 200, {
        status: 'ok',
        timestamp: new Date().toISOString()
      });
    }
    else if (pathname === '/tasks' && method === 'GET') {
      await handleGetTasks(req, res, parsedUrl.query);
    }
    // TODO: Add more routes
    else {
      sendError(res, 404, 'Not Found');
    }
  } catch (error) {
    console.error('Error:', error);
    sendError(res, 500, 'Internal Server Error');
  } finally {
    const duration = Date.now() - startTime;
    console.log(`[${method}] ${pathname} - ${res.statusCode} (${duration}ms)`);
  }
}

// Create server
const server = http.createServer(router);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

## Implementation Steps

### Step 1: Complete Route Handling
Implement the routing logic to match URLs and methods.

### Step 2: Implement GET /tasks
- Return all tasks
- Support filtering by `completed` query parameter
- Handle empty results

### Step 3: Implement GET /tasks/:id
- Parse ID from URL
- Find task by ID
- Return 404 if not found

### Step 4: Implement POST /tasks
- Parse request body
- Validate title is provided
- Create new task with auto-incremented ID
- Return 201 with created task

### Step 5: Implement PUT /tasks/:id
- Parse request body
- Validate task exists
- Replace entire task
- Return updated task

### Step 6: Implement PATCH /tasks/:id
- Parse request body
- Validate task exists
- Update only provided fields
- Return updated task

### Step 7: Implement DELETE /tasks/:id
- Validate task exists
- Remove task from array
- Return 204 No Content

### Step 8: Add Error Handling
- Handle invalid JSON
- Handle invalid IDs
- Handle missing required fields
- Return appropriate status codes

### Step 9: Add Request Logging
- Log all requests with method and path
- Log response status code
- Log request duration

### Step 10: Test All Endpoints
Write a test script or use curl to verify all functionality.

## Testing

### Test Script (Bash)
```bash
#!/bin/bash

BASE_URL="http://localhost:3000"

# Test health check
echo "Testing health check..."
curl -s $BASE_URL/health | jq

# Test create task
echo "Creating task..."
curl -s -X POST $BASE_URL/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Test task"}' | jq

# Test get all tasks
echo "Getting all tasks..."
curl -s $BASE_URL/tasks | jq

# Test get single task
echo "Getting task 1..."
curl -s $BASE_URL/tasks/1 | jq

# Test update task
echo "Updating task 1..."
curl -s -X PUT $BASE_URL/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated task","completed":true}' | jq

# Test partial update
echo "Partially updating task 1..."
curl -s -X PATCH $BASE_URL/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"completed":false}' | jq

# Test filter
echo "Getting completed tasks..."
curl -s "$BASE_URL/tasks?completed=true" | jq

# Test delete
echo "Deleting task 1..."
curl -s -X DELETE $BASE_URL/tasks/1 -v

# Test 404
echo "Testing 404..."
curl -s $BASE_URL/tasks/999 | jq
```

## Bonus Challenges

### Challenge 1: Add Sorting
```http
GET /tasks?sort=createdAt&order=desc
```

### Challenge 2: Add Pagination
```http
GET /tasks?page=1&limit=10
```

### Challenge 3: Add CORS Headers
Allow requests from any origin:
```javascript
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
```

### Challenge 4: Add Request ID
Generate a unique ID for each request and include in logs:
```javascript
const requestId = Math.random().toString(36).substring(7);
console.log(`[${requestId}] ${method} ${pathname}`);
```

### Challenge 5: Add Rate Limiting
Limit each IP to 100 requests per minute.

## Submission Checklist

- [ ] All required endpoints implemented
- [ ] Correct HTTP status codes used
- [ ] Request validation implemented
- [ ] Error handling for all edge cases
- [ ] Request logging added
- [ ] Code is clean and well-commented
- [ ] All manual tests pass
- [ ] README with setup instructions

## Evaluation Criteria

| Criterion | Points | Description |
|-----------|--------|-------------|
| **Functionality** | 40 | All endpoints work correctly |
| **Status Codes** | 15 | Proper status codes for all scenarios |
| **Error Handling** | 15 | Graceful error handling |
| **Validation** | 10 | Input validation |
| **Logging** | 10 | Request logging |
| **Code Quality** | 10 | Clean, readable code |
| **Total** | 100 | |

**Passing Score**: 70/100

## Tips

1. **Start Simple**: Get basic routing working first
2. **Test Often**: Test each endpoint as you implement it
3. **Handle Errors**: Don't let your server crash
4. **Use Postman**: Or Thunder Client for easier testing
5. **Check Status Codes**: Use browser DevTools or curl -v
6. **Read Docs**: Node.js http module documentation

## Solution

A complete solution is available in [../../solutions/02-backend-fundamentals/](../../solutions/02-backend-fundamentals/) but try to complete the assignment yourself first!

## Next Steps

After completing this assignment:
1. Review your code for improvements
2. Add the bonus challenges
3. Share your solution for peer review
4. Proceed to Module 3: Node.js & TypeScript
