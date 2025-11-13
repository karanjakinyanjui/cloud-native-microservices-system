# Testing Documentation

Comprehensive testing guide for the cloud-native microservices e-commerce system.

## Overview

This project implements a complete testing strategy with:
- **Unit Tests**: Testing individual components and functions
- **Integration Tests**: Testing API endpoints and database operations
- **E2E Tests**: Testing complete user flows with Playwright
- **Frontend Tests**: Testing React components with React Testing Library
- **Performance Tests**: Testing response times and load handling

## Test Coverage Goals

- **Minimum Coverage**: 80% across all services
- **Target Coverage**: 90%+
- **Critical Paths**: 100%

## Running Tests

### All Services

```bash
# Run all tests across all services
npm run test:all

# Run tests with coverage
npm run test:coverage
```

### Individual Services

```bash
# Auth Service
cd services/auth-service
npm test
npm run test:coverage

# User Service
cd services/user-service
npm test

# Product Service
cd services/product-service
npm test

# Order Service
cd services/order-service
npm test

# Payment Service
cd services/payment-service
npm test

# Notification Service
cd services/notification-service
npm test

# API Gateway
cd services/api-gateway
npm test
```

### Frontend Tests

```bash
cd frontend
npm test
npm run test:coverage
npm run test:watch
```

### E2E Tests

```bash
cd e2e-tests
npm test
npm run test:headed
npm run test:debug
npm run test:ui
```

## Test Structure

### Backend Services

Each service follows this test structure:

```
services/{service}/src/__tests__/
├── unit/
│   ├── controllers.test.ts    # Controller logic tests
│   ├── services.test.ts       # Business logic tests
│   ├── middleware.test.ts     # Middleware tests
│   └── utils.test.ts          # Utility function tests
├── integration/
│   ├── api.test.ts            # API endpoint tests
│   ├── database.test.ts       # Database operation tests
│   └── auth.test.ts           # Authentication flow tests
├── mocks/
│   ├── mockDatabase.ts        # Database mocks
│   └── mockServices.ts        # Service mocks
├── jest.config.js             # Jest configuration
└── setup.ts                   # Test setup and teardown
```

### Frontend

```
frontend/src/__tests__/
├── components/                 # Component tests
│   ├── ProductCard.test.tsx
│   ├── Cart.test.tsx
│   └── ...
├── pages/                      # Page tests
│   ├── Login.test.tsx
│   ├── ProductList.test.tsx
│   └── ...
├── hooks/                      # Custom hook tests
│   ├── useAuth.test.tsx
│   ├── useCart.test.tsx
│   └── ...
├── utils/                      # Utility tests
└── setup.ts                    # Test setup
```

### E2E Tests

```
e2e-tests/
├── tests/
│   ├── checkout-flow.spec.ts      # Complete checkout process
│   ├── user-journey.spec.ts       # User registration to order
│   └── admin-operations.spec.ts   # Admin features
├── fixtures/                       # Test data and fixtures
├── playwright.config.ts            # Playwright configuration
└── package.json                    # E2E dependencies
```

## Test Categories

### Unit Tests

**Purpose**: Test individual functions and components in isolation

**Examples**:
- Controller methods
- Business logic functions
- Utility functions
- Middleware functions
- Validators

**Best Practices**:
- Mock all external dependencies
- Test edge cases and error scenarios
- Keep tests fast (<100ms each)
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

### Integration Tests

**Purpose**: Test interactions between components

**Examples**:
- API endpoint tests
- Database operations
- Authentication flows
- Service-to-service communication

**Best Practices**:
- Use test databases
- Clean up after each test
- Test error handling
- Verify status codes and response formats
- Test authorization

### E2E Tests

**Purpose**: Test complete user workflows

**Examples**:
- User registration and login
- Product browsing and purchase
- Checkout process
- Admin operations

**Best Practices**:
- Test critical user paths
- Use realistic test data
- Test across browsers
- Include mobile viewports
- Verify error recovery

### Frontend Tests

**Purpose**: Test React components and user interactions

**Examples**:
- Component rendering
- User interactions
- Form validation
- State management
- Custom hooks

**Best Practices**:
- Test user behavior, not implementation
- Use accessible queries
- Test error states
- Mock API calls
- Test loading states

## Testing Tools

### Backend
- **Jest**: Test runner and assertion library
- **Supertest**: HTTP assertion library
- **ts-jest**: TypeScript support for Jest

### Frontend
- **Jest**: Test runner
- **React Testing Library**: Component testing
- **@testing-library/user-event**: User interaction simulation

### E2E
- **Playwright**: Browser automation and testing
- **Multiple browsers**: Chrome, Firefox, Safari
- **Mobile testing**: iOS and Android simulators

## Writing Tests

### Unit Test Example

```typescript
describe('AuthController', () => {
  it('should register a new user', async () => {
    // Arrange
    const mockRequest = {
      body: { email: 'test@example.com', password: 'password123' }
    };
    const mockResponse = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    // Act
    await authController.register(mockRequest, mockResponse, mockNext);

    // Assert
    expect(mockResponse.status).toHaveBeenCalledWith(201);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          user: expect.any(Object),
          accessToken: expect.any(String)
        })
      })
    );
  });
});
```

### Integration Test Example

```typescript
describe('POST /api/auth/login', () => {
  it('should login user with valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'user@example.com',
        password: 'password123'
      });

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('accessToken');
  });
});
```

### Frontend Test Example

```typescript
describe('Login Component', () => {
  it('should submit login form', async () => {
    const mockLogin = jest.fn();
    render(<Login onLogin={mockLogin} />);

    await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /login/i }));

    expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
  });
});
```

### E2E Test Example

```typescript
test('should complete checkout', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.click('text=Login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button:has-text("Login")');

  await page.click('text=Products');
  await page.click('[data-testid="product-card"]').first();
  await page.click('button:has-text("Add to Cart")');
  await page.click('[data-testid="cart-icon"]');
  await page.click('button:has-text("Checkout")');

  await expect(page.locator('text=Order Confirmed')).toBeVisible();
});
```

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Commits to main branch
- Scheduled nightly builds

### GitHub Actions Workflow

```yaml
- name: Run Unit Tests
  run: npm test

- name: Run Integration Tests
  run: npm run test:integration

- name: Run E2E Tests
  run: cd e2e-tests && npm test

- name: Upload Coverage
  uses: codecov/codecov-action@v3
```

## Test Data Management

### Factories

Use test data factories for consistent test data:

```typescript
export const factories = {
  user: (overrides?: any) => ({
    id: 1,
    email: 'test@example.com',
    role: 'user',
    ...overrides
  }),

  product: (overrides?: any) => ({
    id: 1,
    name: 'Test Product',
    price: 99.99,
    stock: 10,
    ...overrides
  })
};
```

### Fixtures

Store reusable test data in fixtures:

```
e2e-tests/fixtures/
├── users.json
├── products.json
└── orders.json
```

## Debugging Tests

### Backend

```bash
# Run specific test file
npm test -- controllers.test.ts

# Run tests in watch mode
npm test -- --watch

# Run with debugging
node --inspect-brk node_modules/.bin/jest
```

### Frontend

```bash
# Run specific component tests
npm test -- ProductCard.test.tsx

# Run in watch mode
npm run test:watch

# Update snapshots
npm test -- -u
```

### E2E

```bash
# Run in headed mode (see browser)
npm run test:headed

# Debug mode (step through)
npm run test:debug

# Interactive UI mode
npm run test:ui
```

## Performance Testing

### Load Testing

```bash
# Using k6
k6 run load-tests/checkout-flow.js

# Using Artillery
artillery run artillery.yml
```

### Metrics

Monitor:
- Response times
- Error rates
- Throughput
- Database query performance

## Coverage Reports

### View Coverage

```bash
# Generate and open coverage report
npm run test:coverage
open coverage/lcov-report/index.html
```

### Coverage Thresholds

Configure in `jest.config.js`:

```javascript
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80
  }
}
```

## Common Issues

### Test Timeouts

Increase timeout in jest.config.js:
```javascript
testTimeout: 10000
```

### Database Connection Issues

Ensure test database is running:
```bash
docker-compose up -d postgres-test
```

### Flaky Tests

- Use waitFor for async operations
- Avoid hardcoded delays
- Clean up properly in afterEach
- Use isolated test data

## Best Practices

1. **Keep tests independent** - Each test should run in isolation
2. **Use meaningful names** - Test names should describe behavior
3. **Follow AAA pattern** - Arrange, Act, Assert
4. **Mock external services** - Don't depend on external APIs
5. **Test edge cases** - Include error scenarios
6. **Keep tests fast** - Unit tests should be <100ms
7. **Clean up resources** - Use beforeEach/afterEach
8. **Use data-testid** - For stable selectors in E2E tests
9. **Test user behavior** - Not implementation details
10. **Maintain test quality** - Treat tests like production code

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

## Support

For questions or issues:
- Create a GitHub issue
- Contact the testing team
- Check test logs in CI/CD pipeline
