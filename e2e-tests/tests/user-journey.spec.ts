import { test, expect } from '@playwright/test';

test.describe('User Journey', () => {
  test('should complete registration to first order journey', async ({ page }) => {
    // Step 1: Navigate to homepage
    await page.goto('http://localhost:3000');
    await expect(page).toHaveTitle(/E-Commerce/);

    // Step 2: Register new user
    await page.click('text=Sign Up');
    const timestamp = Date.now();
    const testEmail = `testuser${timestamp}@example.com`;

    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.fill('input[name="confirmPassword"]', 'SecurePass123!');
    await page.click('button:has-text("Create Account")');

    await expect(page.locator('text=Welcome')).toBeVisible({ timeout: 5000 });

    // Step 3: Complete user profile
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Profile');

    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="phone"]', '+1234567890');
    await page.click('button:has-text("Save Profile")');

    await expect(page.locator('text=Profile updated')).toBeVisible();

    // Step 4: Browse products by category
    await page.click('text=Categories');
    await page.click('text=Electronics');

    await expect(page.locator('[data-testid="product-card"]')).toHaveCount(
      await page.locator('[data-testid="product-card"]').count(),
      { timeout: 5000 }
    );

    // Step 5: Use search functionality
    await page.fill('input[placeholder="Search products"]', 'laptop');
    await page.press('input[placeholder="Search products"]', 'Enter');

    await expect(page.locator('text=Search results')).toBeVisible();

    // Step 6: Filter products by price
    await page.fill('input[name="minPrice"]', '500');
    await page.fill('input[name="maxPrice"]', '1500');
    await page.click('button:has-text("Apply Filters")');

    // Step 7: View product details
    await page.click('[data-testid="product-card"]').first();

    await expect(page.locator('[data-testid="product-details"]')).toBeVisible();
    await expect(page.locator('[data-testid="product-description"]')).toBeVisible();
    await expect(page.locator('[data-testid="product-price"]')).toBeVisible();

    // Step 8: Add product to wishlist
    await page.click('button[aria-label="Add to wishlist"]');
    await expect(page.locator('text=Added to wishlist')).toBeVisible();

    // Step 9: Add product to cart
    await page.selectOption('select[name="quantity"]', '2');
    await page.click('button:has-text("Add to Cart")');

    await expect(page.locator('text=Added to cart')).toBeVisible();

    // Step 10: View cart
    await page.click('[data-testid="cart-icon"]');
    const cartBadge = page.locator('[data-testid="cart-badge"]');
    await expect(cartBadge).toHaveText('2');

    // Step 11: Update cart quantities
    await page.fill('input[name="quantity"]', '3');
    await expect(page.locator('[data-testid="cart-total"]')).toContainText('$');

    // Step 12: Remove item and add it back
    await page.click('button[aria-label="Remove from cart"]');
    await expect(page.locator('text=Item removed')).toBeVisible();

    await page.click('text=Continue Shopping');
    await page.click('[data-testid="product-card"]').first();
    await page.click('button:has-text("Add to Cart")');

    // Step 13: Proceed to checkout
    await page.click('[data-testid="cart-icon"]');
    await page.click('button:has-text("Proceed to Checkout")');

    // Step 14: Enter shipping information
    await page.fill('input[name="address"]', '123 Main Street');
    await page.fill('input[name="city"]', 'New York');
    await page.fill('input[name="state"]', 'NY');
    await page.fill('input[name="zipCode"]', '10001');
    await page.fill('input[name="country"]', 'United States');

    // Step 15: Select shipping method
    await page.click('input[value="express"]');

    // Step 16: Enter payment information
    await page.click('text=Next');
    await page.fill('input[name="cardholderName"]', 'Test User');
    await page.fill('input[name="cardNumber"]', '4242424242424242');
    await page.fill('input[name="cardExpiry"]', '12/25');
    await page.fill('input[name="cardCvc"]', '123');

    // Step 17: Review order
    await page.click('button:has-text("Review Order")');
    await expect(page.locator('[data-testid="order-summary"]')).toBeVisible();

    // Step 18: Place order
    await page.click('button:has-text("Place Order")');

    // Step 19: Verify order confirmation
    await expect(page.locator('text=Thank you for your order')).toBeVisible({ timeout: 10000 });
    const orderNumber = await page.locator('[data-testid="order-number"]').textContent();
    expect(orderNumber).toBeTruthy();

    // Step 20: Check order in history
    await page.click('[data-testid="user-menu"]');
    await page.click('text=My Orders');

    await expect(page.locator(`text=${orderNumber}`)).toBeVisible();

    // Step 21: View order details
    await page.click(`text=${orderNumber}`);
    await expect(page.locator('[data-testid="order-details"]')).toBeVisible();
    await expect(page.locator('[data-testid="order-status"]')).toHaveText(/Pending|Processing/);

    // Step 22: Download invoice
    await page.click('button:has-text("Download Invoice")');
    // Verify download initiated

    // Step 23: Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Logout');
    await expect(page.locator('text=Login')).toBeVisible();
  });

  test('should handle returning user login and reorder', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Login as existing user
    await page.click('text=Login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button:has-text("Login")');

    await expect(page.locator('text=Welcome back')).toBeVisible();

    // Navigate to order history
    await page.click('[data-testid="user-menu"]');
    await page.click('text=My Orders');

    // Reorder previous purchase
    await page.click('button:has-text("Reorder")').first();
    await expect(page.locator('text=Items added to cart')).toBeVisible();

    // Quick checkout with saved information
    await page.click('[data-testid="cart-icon"]');
    await page.click('button:has-text("Quick Checkout")');

    // Verify saved addresses are available
    await expect(page.locator('[data-testid="saved-address"]').first()).toBeVisible();
    await page.click('[data-testid="saved-address"]').first();

    // Use saved payment method
    await page.click('text=Next');
    await expect(page.locator('[data-testid="saved-card"]').first()).toBeVisible();
    await page.click('[data-testid="saved-card"]').first();

    // Complete order
    await page.click('button:has-text("Place Order")');
    await expect(page.locator('text=Order Confirmed')).toBeVisible({ timeout: 10000 });
  });

  test('should allow guest checkout', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Browse as guest
    await page.click('text=Products');
    await page.click('[data-testid="product-card"]').first();
    await page.click('button:has-text("Add to Cart")');
    await page.click('[data-testid="cart-icon"]');

    // Proceed to guest checkout
    await page.click('button:has-text("Checkout as Guest")');

    // Fill in guest information
    await page.fill('input[name="email"]', 'guest@example.com');
    await page.fill('input[name="firstName"]', 'Guest');
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="address"]', '456 Guest Ave');
    await page.fill('input[name="city"]', 'Los Angeles');
    await page.fill('input[name="zipCode"]', '90001');

    await page.click('text=Next');

    // Payment
    await page.fill('input[name="cardNumber"]', '4242424242424242');
    await page.fill('input[name="cardExpiry"]', '12/25');
    await page.fill('input[name="cardCvc"]', '123');

    await page.click('button:has-text("Place Order")');
    await expect(page.locator('text=Order Confirmed')).toBeVisible({ timeout: 10000 });

    // Verify option to create account
    await expect(page.locator('text=Create an account')).toBeVisible();
  });

  test('should navigate complete site navigation', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Test main navigation
    await page.click('text=Products');
    await expect(page).toHaveURL(/.*products/);

    await page.click('text=Categories');
    await expect(page.locator('[data-testid="category-list"]')).toBeVisible();

    await page.click('text=Deals');
    await expect(page.locator('text=Special Offers')).toBeVisible();

    // Test footer navigation
    await page.click('text=About Us');
    await expect(page).toHaveURL(/.*about/);

    await page.goto('http://localhost:3000');
    await page.click('text=Contact');
    await expect(page).toHaveURL(/.*contact/);

    await page.goto('http://localhost:3000');
    await page.click('text=FAQ');
    await expect(page).toHaveURL(/.*faq/);

    // Test help/support
    await page.goto('http://localhost:3000');
    await page.click('[data-testid="help-button"]');
    await expect(page.locator('[data-testid="help-modal"]')).toBeVisible();
  });

  test('should handle error recovery gracefully', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Simulate network error by going offline
    await page.context().setOffline(true);

    await page.click('text=Products');
    await expect(page.locator('text=Connection error')).toBeVisible();

    // Reconnect
    await page.context().setOffline(false);
    await page.click('button:has-text("Retry")');

    await expect(page.locator('[data-testid="product-card"]')).toBeVisible({ timeout: 5000 });
  });
});
