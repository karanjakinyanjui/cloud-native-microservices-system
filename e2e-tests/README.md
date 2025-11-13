# E2E Tests

End-to-end tests for the cloud-native microservices e-commerce system using Playwright.

## Setup

```bash
npm install
npx playwright install
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in headed mode (see browser)
npm run test:headed

# Run tests in debug mode
npm run test:debug

# Run tests with UI mode
npm run test:ui

# Run specific browser tests
npm run test:chrome
npm run test:firefox
npm run test:webkit

# Run mobile tests
npm run test:mobile

# Run specific test suites
npm run test:checkout
npm run test:user-journey
npm run test:admin
```

## Test Suites

### Checkout Flow (`checkout-flow.spec.ts`)
- Complete checkout process
- Empty cart validation
- Stock availability checks
- Payment validation
- Discount codes
- Shipping address management

### User Journey (`user-journey.spec.ts`)
- User registration
- Profile management
- Product browsing and search
- Cart operations
- Complete purchase flow
- Order history
- Guest checkout

### Admin Operations (`admin-operations.spec.ts`)
- Dashboard overview
- Product management
- Inventory management
- Order management
- User management
- Analytics and reports
- System settings
- Bulk operations

## View Reports

```bash
npm run report
```

## Generate Tests

```bash
npm run codegen
```

## Configuration

Edit `playwright.config.ts` to customize:
- Test directories
- Browser configurations
- Timeouts
- Screenshots and videos
- Parallelization

## Environment Variables

Copy `.env.example` to `.env` and configure:
- `BASE_URL` - Application URL
- `TEST_USER_EMAIL` - Test user credentials
- `ADMIN_EMAIL` - Admin credentials
- Browser and viewport settings

## CI/CD Integration

Tests are configured to run in CI with:
- Automatic retries (2)
- Single worker
- HTML, JSON, and JUnit reports
- Screenshots and videos on failure

## Coverage

E2E tests cover:
- User flows from registration to order completion
- Admin operations and management
- Error handling and edge cases
- Mobile and tablet viewports
- Cross-browser compatibility

## Best Practices

1. Use data-testid attributes for stable selectors
2. Wait for elements before interacting
3. Use meaningful test descriptions
4. Keep tests independent
5. Clean up test data
6. Use page object pattern for reusable code
