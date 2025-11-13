import { test, expect } from '@playwright/test';

test.describe('Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3000');
  });

  test('should complete full checkout process', async ({ page }) => {
    // 1. Register/Login
    await page.click('text=Login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button:has-text("Login")');

    await expect(page.locator('text=Welcome')).toBeVisible({ timeout: 5000 });

    // 2. Browse products
    await page.click('text=Products');
    await expect(page.locator('[data-testid="product-card"]').first()).toBeVisible();

    // 3. Add product to cart
    await page.click('[data-testid="product-card"]').first();
    await page.click('button:has-text("Add to Cart")');

    await expect(page.locator('text=Added to cart')).toBeVisible();

    // 4. View cart
    await page.click('[data-testid="cart-icon"]');
    await expect(page.locator('[data-testid="cart-item"]')).toBeVisible();

    // 5. Proceed to checkout
    await page.click('button:has-text("Proceed to Checkout")');

    // 6. Fill shipping information
    await page.fill('input[name="address"]', '123 Test St');
    await page.fill('input[name="city"]', 'Test City');
    await page.fill('input[name="zipCode"]', '12345');

    // 7. Select payment method
    await page.click('input[value="credit_card"]');
    await page.fill('input[name="cardNumber"]', '4242424242424242');
    await page.fill('input[name="cardExpiry"]', '12/25');
    await page.fill('input[name="cardCvc"]', '123');

    // 8. Place order
    await page.click('button:has-text("Place Order")');

    // 9. Verify order confirmation
    await expect(page.locator('text=Order Confirmed')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="order-number"]')).toBeVisible();

    // 10. Verify order appears in order history
    await page.click('text=My Orders');
    await expect(page.locator('[data-testid="order-item"]').first()).toBeVisible();
  });

  test('should validate empty cart', async ({ page }) => {
    await page.click('text=Login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button:has-text("Login")');

    await page.click('[data-testid="cart-icon"]');
    await expect(page.locator('text=Your cart is empty')).toBeVisible();

    const checkoutButton = page.locator('button:has-text("Proceed to Checkout")');
    await expect(checkoutButton).toBeDisabled();
  });

  test('should handle insufficient stock', async ({ page }) => {
    await page.click('text=Login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button:has-text("Login")');

    await page.click('text=Products');
    await page.click('[data-testid="product-card"]').first();

    // Try to add more than available stock
    const quantityInput = page.locator('input[name="quantity"]');
    await quantityInput.fill('1000');
    await page.click('button:has-text("Add to Cart")');

    await expect(page.locator('text=Insufficient stock')).toBeVisible();
  });

  test('should validate payment information', async ({ page }) => {
    // Login and add product to cart (abbreviated)
    await page.click('text=Login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button:has-text("Login")');

    await page.click('text=Products');
    await page.click('[data-testid="product-card"]').first();
    await page.click('button:has-text("Add to Cart")');
    await page.click('[data-testid="cart-icon"]');
    await page.click('button:has-text("Proceed to Checkout")');

    // Fill shipping info
    await page.fill('input[name="address"]', '123 Test St');
    await page.fill('input[name="city"]', 'Test City');
    await page.fill('input[name="zipCode"]', '12345');

    // Try to submit with invalid card
    await page.fill('input[name="cardNumber"]', '1234');
    await page.click('button:has-text("Place Order")');

    await expect(page.locator('text=Invalid card number')).toBeVisible();
  });

  test('should calculate correct totals', async ({ page }) => {
    await page.click('text=Login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button:has-text("Login")');

    await page.click('text=Products');

    // Add multiple products
    const productCards = page.locator('[data-testid="product-card"]');
    const firstProduct = productCards.first();
    await firstProduct.click();

    const priceText = await page.locator('[data-testid="product-price"]').textContent();
    const price = parseFloat(priceText?.replace('$', '') || '0');

    await page.click('button:has-text("Add to Cart")');
    await page.click('[data-testid="cart-icon"]');

    // Verify cart total
    const cartTotal = await page.locator('[data-testid="cart-total"]').textContent();
    expect(cartTotal).toContain(`$${price.toFixed(2)}`);
  });

  test('should allow order cancellation', async ({ page }) => {
    // Complete an order first
    await page.click('text=Login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button:has-text("Login")');

    // Navigate to orders
    await page.click('text=My Orders');
    await expect(page.locator('[data-testid="order-item"]').first()).toBeVisible();

    // Cancel the order
    await page.click('button:has-text("Cancel Order")').first();
    await page.click('button:has-text("Confirm")');

    await expect(page.locator('text=Order cancelled')).toBeVisible();
  });

  test('should apply discount codes', async ({ page }) => {
    await page.click('text=Login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button:has-text("Login")');

    await page.click('text=Products');
    await page.click('[data-testid="product-card"]').first();
    await page.click('button:has-text("Add to Cart")');
    await page.click('[data-testid="cart-icon"]');

    // Apply discount code
    await page.fill('input[name="discountCode"]', 'SAVE10');
    await page.click('button:has-text("Apply")');

    await expect(page.locator('text=Discount applied')).toBeVisible();
    await expect(page.locator('[data-testid="discount-amount"]')).toBeVisible();
  });

  test('should handle payment failures gracefully', async ({ page }) => {
    await page.click('text=Login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button:has-text("Login")');

    await page.click('text=Products');
    await page.click('[data-testid="product-card"]').first();
    await page.click('button:has-text("Add to Cart")');
    await page.click('[data-testid="cart-icon"]');
    await page.click('button:has-text("Proceed to Checkout")');

    await page.fill('input[name="address"]', '123 Test St');
    await page.fill('input[name="city"]', 'Test City');
    await page.fill('input[name="zipCode"]', '12345');

    // Use a test card that will be declined
    await page.fill('input[name="cardNumber"]', '4000000000000002');
    await page.fill('input[name="cardExpiry"]', '12/25');
    await page.fill('input[name="cardCvc"]', '123');

    await page.click('button:has-text("Place Order")');

    await expect(page.locator('text=Payment failed')).toBeVisible();
  });

  test('should save shipping address for future use', async ({ page }) => {
    await page.click('text=Login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button:has-text("Login")');

    await page.click('text=Products');
    await page.click('[data-testid="product-card"]').first();
    await page.click('button:has-text("Add to Cart")');
    await page.click('[data-testid="cart-icon"]');
    await page.click('button:has-text("Proceed to Checkout")');

    await page.fill('input[name="address"]', '123 Test St');
    await page.fill('input[name="city"]', 'Test City');
    await page.fill('input[name="zipCode"]', '12345');

    // Save address
    await page.check('input[name="saveAddress"]');

    await page.fill('input[name="cardNumber"]', '4242424242424242');
    await page.fill('input[name="cardExpiry"]', '12/25');
    await page.fill('input[name="cardCvc"]', '123');
    await page.click('button:has-text("Place Order")');

    await expect(page.locator('text=Order Confirmed')).toBeVisible({ timeout: 10000 });

    // Start new order and verify address is pre-filled
    await page.click('text=Products');
    await page.click('[data-testid="product-card"]').first();
    await page.click('button:has-text("Add to Cart")');
    await page.click('[data-testid="cart-icon"]');
    await page.click('button:has-text("Proceed to Checkout")');

    const addressInput = page.locator('input[name="address"]');
    await expect(addressInput).toHaveValue('123 Test St');
  });

  test('should display order tracking information', async ({ page }) => {
    await page.click('text=Login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button:has-text("Login")');

    await page.click('text=My Orders');
    await page.click('[data-testid="order-item"]').first();

    await expect(page.locator('[data-testid="order-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="tracking-number"]')).toBeVisible();
  });
});
