# Development Guide

## Table of Contents
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Code Conventions](#code-conventions)
- [Git Workflow](#git-workflow)
- [Testing Guidelines](#testing-guidelines)
- [Debugging](#debugging)
- [Contributing](#contributing)
- [Development Tools](#development-tools)

## Getting Started

### Prerequisites for Developers

Before you begin development, ensure you have:

- **Node.js**: v20.x or later
- **npm**: v10.x or later
- **Git**: v2.30 or later
- **Docker**: v24.0 or later
- **VS Code** (recommended) or your preferred IDE
- **PostgreSQL**: v15.x (for local development)
- **Redis**: v7.x (for local development)

### IDE Setup (VS Code)

#### Recommended Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-azuretools.vscode-docker",
    "ms-kubernetes-tools.vscode-kubernetes-tools",
    "redhat.vscode-yaml",
    "christian-kohler.npm-intellisense",
    "eg2.vscode-npm-script",
    "rangav.vscode-thunder-client",
    "ms-vscode.vscode-typescript-next",
    "usernamehw.errorlens",
    "eamodio.gitlens"
  ]
}
```

#### VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true
  }
}
```

### Initial Setup

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/cloud-native-microservices-system.git
cd cloud-native-microservices-system

# 2. Install dependencies for all services
npm run install:all

# 3. Copy environment files
cp .env.example .env
for service in services/*; do
  if [ -d "$service" ]; then
    cp "$service/.env.example" "$service/.env"
  fi
done

# 4. Start local dependencies (PostgreSQL, Redis)
docker-compose up -d postgres redis

# 5. Run database migrations
npm run migrate:all

# 6. Seed database (optional)
npm run seed:all

# 7. Start all services in development mode
npm run dev:all
```

### Quick Start Individual Service

```bash
# Navigate to service directory
cd services/product-service

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start in development mode
npm run dev

# The service will start with hot-reload enabled
# Server running at http://localhost:3003
```

## Project Structure

### Root Directory Structure

```
cloud-native-microservices-system/
├── .github/                  # GitHub Actions workflows
│   └── workflows/
│       ├── ci.yml           # Continuous Integration
│       ├── cd.yml           # Continuous Deployment
│       └── security.yml     # Security scanning
├── docs/                    # Documentation
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── DEPLOYMENT.md
│   ├── DEVELOPMENT.md
│   ├── MONITORING.md
│   ├── SECURITY.md
│   ├── DATABASE.md
│   ├── TROUBLESHOOTING.md
│   ├── FAQ.md
│   └── diagrams/
├── frontend/                # Frontend application
│   ├── src/
│   ├── public/
│   └── package.json
├── k8s/                     # Kubernetes manifests
│   ├── base/               # Base configurations
│   ├── overlays/           # Environment-specific overlays
│   ├── databases/          # Database configurations
│   ├── ingress/            # Ingress configurations
│   ├── monitoring/         # Monitoring stack
│   ├── service-mesh/       # Service mesh configs
│   └── tracing/            # Tracing configurations
├── scripts/                # Utility scripts
│   ├── setup.sh           # Initial setup script
│   ├── migrate.sh         # Migration script
│   ├── seed.sh            # Database seeding
│   └── test.sh            # Test runner
├── services/               # Microservices
│   ├── api-gateway/
│   ├── auth-service/
│   ├── user-service/
│   ├── product-service/
│   ├── order-service/
│   ├── payment-service/
│   └── notification-service/
├── .gitignore
├── .prettierrc
├── docker-compose.yml
├── package.json
└── README.md
```

### Service Directory Structure

Each microservice follows this structure:

```
service-name/
├── src/
│   ├── config/             # Configuration files
│   │   ├── database.ts
│   │   ├── logger.ts
│   │   └── redis.ts
│   ├── controllers/        # Request handlers
│   │   └── serviceController.ts
│   ├── middleware/         # Express middleware
│   │   ├── auth.ts
│   │   ├── validation.ts
│   │   └── errorHandler.ts
│   ├── models/            # Database models
│   │   └── serviceModel.ts
│   ├── routes/            # API routes
│   │   └── serviceRoutes.ts
│   ├── services/          # Business logic
│   │   └── serviceService.ts
│   ├── utils/             # Utility functions
│   │   ├── logger.ts
│   │   └── helpers.ts
│   ├── types/             # TypeScript types
│   │   └── index.ts
│   ├── validators/        # Input validators
│   │   └── serviceValidator.ts
│   └── index.ts           # Entry point
├── tests/                 # Test files
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── migrations/            # Database migrations
│   └── 001_initial.sql
├── .env.example          # Example environment file
├── .eslintrc.js         # ESLint configuration
├── .prettierrc          # Prettier configuration
├── Dockerfile           # Docker image definition
├── jest.config.js       # Jest configuration
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
└── README.md            # Service documentation
```

### File Naming Conventions

- **TypeScript files**: camelCase (e.g., `userController.ts`)
- **Test files**: `*.test.ts` or `*.spec.ts`
- **Constants**: UPPER_CASE (e.g., `API_VERSION`)
- **Interfaces**: PascalCase with 'I' prefix (e.g., `IUser`)
- **Types**: PascalCase (e.g., `UserType`)
- **Classes**: PascalCase (e.g., `UserService`)
- **Functions**: camelCase (e.g., `getUserById`)
- **Variables**: camelCase (e.g., `userId`)

## Code Conventions

### TypeScript Style Guide

#### Imports

```typescript
// 1. External imports
import express from 'express';
import { Pool } from 'pg';

// 2. Internal imports - absolute paths
import { logger } from '@/config/logger';
import { UserService } from '@/services/userService';

// 3. Type imports
import type { Request, Response, NextFunction } from 'express';
import type { IUser } from '@/types';
```

#### Interfaces and Types

```typescript
// Interface for objects
interface IUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  updatedAt: Date;
}

// Type for unions and primitives
type UserRole = 'user' | 'admin' | 'moderator';
type UserId = string;

// Prefer interface over type for object shapes
// Use type for unions, intersections, and mapped types
```

#### Functions

```typescript
// Use explicit return types
function calculateTotal(price: number, quantity: number): number {
  return price * quantity;
}

// Use arrow functions for callbacks
const users = await getUserList();
const userIds = users.map((user) => user.id);

// Async/await preferred over promises
async function fetchUser(userId: string): Promise<IUser> {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  return user;
}

// Error handling
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  logger.error('Operation failed', { error });
  throw error;
}
```

#### Classes

```typescript
export class UserService {
  private readonly userRepository: UserRepository;
  private readonly logger: Logger;

  constructor(userRepository: UserRepository, logger: Logger) {
    this.userRepository = userRepository;
    this.logger = logger;
  }

  async createUser(userData: CreateUserDto): Promise<IUser> {
    this.logger.info('Creating user', { email: userData.email });

    // Validate input
    this.validateUserData(userData);

    // Business logic
    const user = await this.userRepository.create(userData);

    this.logger.info('User created', { userId: user.id });
    return user;
  }

  private validateUserData(userData: CreateUserDto): void {
    if (!userData.email || !userData.password) {
      throw new Error('Email and password are required');
    }
  }
}
```

#### Error Handling

```typescript
// Custom error classes
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public errors: ValidationErrorDetail[]) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Error middleware
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Error occurred', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  if (error instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message,
        details: error.errors,
      },
    });
  }

  if (error instanceof NotFoundError) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: error.message,
      },
    });
  }

  // Default error
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
};
```

#### Logging

```typescript
import { logger } from '@/config/logger';

// Log levels: error, warn, info, debug
logger.info('User logged in', { userId: user.id });
logger.error('Failed to process payment', { error, orderId });
logger.warn('Rate limit approaching', { userId, requestCount });
logger.debug('Processing request', { requestId, path: req.path });

// Always include context
logger.info('Operation completed', {
  operation: 'createOrder',
  userId,
  orderId,
  duration: Date.now() - startTime,
});
```

### API Response Format

All API responses should follow this structure:

```typescript
// Success response
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Optional success message"
}

// Error response
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message",
    "details": {} // Optional
  }
}

// List response with pagination
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

### Database Conventions

```typescript
// Use parameterized queries
const result = await pool.query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);

// Use transactions for multiple operations
const client = await pool.connect();
try {
  await client.query('BEGIN');

  const user = await client.query(
    'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *',
    [email, hashedPassword]
  );

  await client.query(
    'INSERT INTO user_profiles (user_id, first_name, last_name) VALUES ($1, $2, $3)',
    [user.rows[0].id, firstName, lastName]
  );

  await client.query('COMMIT');
  return user.rows[0];
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}

// Table naming: snake_case, plural
// Column naming: snake_case
// Always include: id, created_at, updated_at
```

## Git Workflow

### Branch Naming

```
main                    # Production-ready code
develop                # Integration branch

feature/<ticket>-<description>   # New features
bugfix/<ticket>-<description>    # Bug fixes
hotfix/<ticket>-<description>    # Production hotfixes
release/<version>                # Release preparation
```

Examples:
- `feature/AUTH-123-add-oauth-support`
- `bugfix/PROD-456-fix-payment-timeout`
- `hotfix/CRIT-789-fix-security-vulnerability`
- `release/v1.2.0`

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `ci`: CI/CD changes

**Examples**:
```
feat(auth): add OAuth2 authentication support

Implemented OAuth2 flow with Google and GitHub providers.
Added token refresh mechanism and session management.

Closes AUTH-123

---

fix(payment): resolve transaction timeout issue

Increased timeout from 30s to 60s and added retry logic.

Fixes PROD-456

---

docs(api): update authentication endpoints documentation

Added request/response examples for all auth endpoints.
```

### Workflow

```bash
# 1. Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/AUTH-123-add-oauth

# 2. Make changes and commit
git add .
git commit -m "feat(auth): add OAuth2 support"

# 3. Keep branch updated
git fetch origin
git rebase origin/develop

# 4. Push branch
git push origin feature/AUTH-123-add-oauth

# 5. Create Pull Request
# Use GitHub UI or gh CLI
gh pr create --title "feat(auth): Add OAuth2 support" --body "Closes #123"

# 6. After PR approval, merge to develop
# Squash commits if multiple small commits
# Delete feature branch after merge
```

### Pull Request Guidelines

**PR Title**: Follow commit message format
```
feat(auth): Add OAuth2 support
fix(payment): Resolve transaction timeout
```

**PR Description Template**:
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests pass locally
- [ ] Related issues linked

## Screenshots (if applicable)

## Related Issues
Closes #123
Related to #456
```

## Testing Guidelines

### Test Structure

```typescript
// Example test file: userService.test.ts
import { UserService } from '@/services/userService';
import { UserRepository } from '@/repositories/userRepository';
import { NotFoundError } from '@/errors';

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    // Setup mocks
    mockUserRepository = {
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    userService = new UserService(mockUserRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      // Arrange
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };
      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act
      const result = await userService.getUserById(userId);

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
      expect(mockUserRepository.findById).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundError when user not found', async () => {
      // Arrange
      const userId = 'non-existent';
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(userService.getUserById(userId)).rejects.toThrow(
        NotFoundError
      );
    });
  });
});
```

### Test Types

#### Unit Tests

Test individual functions/methods in isolation:

```bash
# Run unit tests
npm run test:unit

# Run with coverage
npm run test:unit -- --coverage

# Run specific test file
npm run test:unit -- userService.test.ts

# Run in watch mode
npm run test:unit -- --watch
```

#### Integration Tests

Test multiple components together:

```typescript
// Integration test example
describe('User API Integration', () => {
  let app: Express;
  let db: Pool;

  beforeAll(async () => {
    // Setup test database
    db = await setupTestDatabase();
    app = createApp(db);
  });

  afterAll(async () => {
    await cleanupTestDatabase(db);
  });

  it('should create user and return token', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Test123!',
        firstName: 'John',
        lastName: 'Doe',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('accessToken');
  });
});
```

#### End-to-End Tests

Test complete user workflows:

```bash
# Run e2e tests
npm run test:e2e

# Run against specific environment
npm run test:e2e -- --env=staging
```

### Coverage Requirements

- **Overall**: 80% minimum
- **Critical paths**: 90% minimum
- **New features**: 100% required

```bash
# Generate coverage report
npm run test:coverage

# View coverage report
open coverage/lcov-report/index.html
```

### Test Commands

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern=tests/unit",
    "test:integration": "jest --testPathPattern=tests/integration",
    "test:e2e": "jest --testPathPattern=tests/e2e",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --maxWorkers=2"
  }
}
```

## Debugging

### VS Code Debug Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug API Gateway",
      "program": "${workspaceFolder}/services/api-gateway/src/index.ts",
      "preLaunchTask": "tsc: build - services/api-gateway/tsconfig.json",
      "outFiles": ["${workspaceFolder}/services/api-gateway/dist/**/*.js"],
      "env": {
        "NODE_ENV": "development"
      },
      "envFile": "${workspaceFolder}/services/api-gateway/.env",
      "sourceMaps": true,
      "restart": true,
      "console": "integratedTerminal"
    },
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Process",
      "port": 9229,
      "restart": true,
      "sourceMaps": true
    }
  ]
}
```

### Debug with Node Inspector

```bash
# Start service with debugging
node --inspect=0.0.0.0:9229 dist/index.js

# Or with ts-node
node --inspect=0.0.0.0:9229 -r ts-node/register src/index.ts

# In Chrome, navigate to: chrome://inspect
```

### Logging for Debug

```typescript
// Use debug log level in development
logger.debug('Request received', {
  method: req.method,
  path: req.path,
  headers: req.headers,
  body: req.body,
});

// Log database queries
logger.debug('Executing query', {
  query: 'SELECT * FROM users WHERE id = $1',
  params: [userId],
});

// Log timing
const startTime = Date.now();
const result = await operation();
logger.debug('Operation completed', {
  duration: Date.now() - startTime,
  result,
});
```

### Docker Debugging

```bash
# View logs
docker-compose logs -f api-gateway

# Execute commands in container
docker-compose exec api-gateway sh

# Debug inside container
docker-compose exec api-gateway node --inspect=0.0.0.0:9229 dist/index.js
```

### Kubernetes Debugging

```bash
# View logs
kubectl logs -f deployment/api-gateway -n microservices

# Execute commands in pod
kubectl exec -it <pod-name> -n microservices -- sh

# Port forward for debugging
kubectl port-forward deployment/api-gateway 9229:9229 -n microservices

# Debug with node inspector
node inspect localhost:9229
```

## Contributing

### Before Contributing

1. Read this development guide
2. Check existing issues and PRs
3. Discuss major changes in an issue first
4. Follow code conventions and style guide
5. Write tests for new features
6. Update documentation

### Contribution Process

1. **Fork and Clone**
   ```bash
   gh repo fork yourusername/cloud-native-microservices-system
   git clone https://github.com/yourname/cloud-native-microservices-system.git
   ```

2. **Create Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Changes**
   - Write code
   - Add tests
   - Update documentation
   - Ensure all tests pass

4. **Commit**
   ```bash
   git add .
   git commit -m "feat: add your feature"
   ```

5. **Push and PR**
   ```bash
   git push origin feature/your-feature-name
   gh pr create
   ```

### Code Review

All PRs require:
- At least one approval
- All CI checks passing
- No merge conflicts
- Up-to-date with base branch

Reviewers will check:
- Code quality and style
- Test coverage
- Documentation updates
- Performance implications
- Security considerations

## Development Tools

### Useful npm Scripts

```bash
# Development
npm run dev              # Start in dev mode with hot-reload
npm run build           # Build TypeScript to JavaScript
npm run start           # Start production server
npm run clean           # Clean build artifacts

# Testing
npm run test            # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Generate coverage report

# Code Quality
npm run lint            # Run ESLint
npm run lint:fix        # Fix ESLint errors
npm run format          # Format code with Prettier
npm run type-check      # Run TypeScript compiler check

# Database
npm run migrate         # Run migrations
npm run migrate:undo    # Undo last migration
npm run seed            # Seed database

# Docker
npm run docker:build    # Build Docker image
npm run docker:run      # Run Docker container
npm run docker:stop     # Stop Docker container
```

### Database GUI Tools

- **pgAdmin**: PostgreSQL administration
- **DBeaver**: Universal database tool
- **TablePlus**: Modern database GUI
- **Redis Commander**: Redis web interface

### API Testing

- **Thunder Client**: VS Code extension
- **Postman**: API development platform
- **Insomnia**: REST client
- **curl**: Command-line tool

### Kubernetes Tools

- **k9s**: Terminal UI for Kubernetes
- **Lens**: Kubernetes IDE
- **Octant**: Developer-centric web interface
- **Kubectx/Kubens**: Context and namespace switching

### Monitoring Tools

- **Prometheus**: Metrics collection (http://localhost:9090)
- **Grafana**: Metrics visualization (http://localhost:3001)
- **Jaeger**: Distributed tracing (http://localhost:16686)

## Resources

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Docker Documentation](https://docs.docker.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
