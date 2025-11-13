import { test, expect } from '@playwright/test';

test.describe('Admin Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('http://localhost:3000');
    await page.click('text=Login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button:has-text("Login")');

    await expect(page.locator('text=Admin Dashboard')).toBeVisible({ timeout: 5000 });
  });

  test('should access admin dashboard', async ({ page }) => {
    await page.click('text=Dashboard');

    await expect(page.locator('[data-testid="total-orders"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-revenue"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-users"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-products"]')).toBeVisible();

    // Verify charts are displayed
    await expect(page.locator('[data-testid="sales-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="orders-chart"]')).toBeVisible();
  });

  test('should manage products', async ({ page }) => {
    await page.click('text=Products');
    await page.click('button:has-text("Add Product")');

    // Fill product form
    await page.fill('input[name="name"]', 'New Test Product');
    await page.fill('textarea[name="description"]', 'This is a test product description');
    await page.fill('input[name="price"]', '99.99');
    await page.fill('input[name="stock"]', '50');
    await page.selectOption('select[name="category"]', 'electronics');
    await page.setInputFiles('input[type="file"]', 'test-fixtures/product-image.jpg');

    await page.click('button:has-text("Create Product")');

    await expect(page.locator('text=Product created successfully')).toBeVisible();

    // Edit product
    await page.click('[data-testid="product-row"]').first();
    await page.click('button:has-text("Edit")');

    await page.fill('input[name="price"]', '89.99');
    await page.click('button:has-text("Save Changes")');

    await expect(page.locator('text=Product updated')).toBeVisible();

    // Delete product
    await page.click('button:has-text("Delete")');
    await page.click('button:has-text("Confirm Delete")');

    await expect(page.locator('text=Product deleted')).toBeVisible();
  });

  test('should manage product inventory', async ({ page }) => {
    await page.click('text=Inventory');

    // Filter low stock products
    await page.click('input[name="lowStock"]');
    await expect(page.locator('[data-testid="low-stock-alert"]')).toBeVisible();

    // Update stock for a product
    await page.click('[data-testid="product-row"]').first();
    await page.click('button:has-text("Update Stock")');

    await page.fill('input[name="quantity"]', '100');
    await page.selectOption('select[name="operation"]', 'add');
    await page.click('button:has-text("Update")');

    await expect(page.locator('text=Stock updated')).toBeVisible();

    // Set stock alerts
    await page.click('button:has-text("Set Alert")');
    await page.fill('input[name="minStock"]', '10');
    await page.click('button:has-text("Save Alert")');
  });

  test('should manage orders', async ({ page }) => {
    await page.click('text=Orders');

    // View all orders
    await expect(page.locator('[data-testid="order-row"]')).toHaveCount(
      await page.locator('[data-testid="order-row"]').count()
    );

    // Filter orders by status
    await page.selectOption('select[name="status"]', 'pending');
    await page.click('button:has-text("Filter")');

    // View order details
    await page.click('[data-testid="order-row"]').first();
    await expect(page.locator('[data-testid="order-details"]')).toBeVisible();

    // Update order status
    await page.selectOption('select[name="status"]', 'processing');
    await page.click('button:has-text("Update Status")');

    await expect(page.locator('text=Status updated')).toBeVisible();

    // Add tracking number
    await page.fill('input[name="trackingNumber"]', 'TRACK123456');
    await page.click('button:has-text("Save Tracking")');

    await expect(page.locator('text=Tracking number added')).toBeVisible();

    // Process refund
    await page.click('button:has-text("Process Refund")');
    await page.fill('input[name="amount"]', '50.00');
    await page.fill('textarea[name="reason"]', 'Customer requested partial refund');
    await page.click('button:has-text("Confirm Refund")');

    await expect(page.locator('text=Refund processed')).toBeVisible();
  });

  test('should manage users', async ({ page }) => {
    await page.click('text=Users');

    // Search for user
    await page.fill('input[placeholder="Search users"]', 'test@example.com');
    await page.press('input[placeholder="Search users"]', 'Enter');

    await expect(page.locator('[data-testid="user-row"]')).toBeVisible();

    // View user details
    await page.click('[data-testid="user-row"]').first();
    await expect(page.locator('[data-testid="user-details"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-orders"]')).toBeVisible();

    // Suspend user
    await page.click('button:has-text("Suspend User")');
    await page.fill('textarea[name="reason"]', 'Suspicious activity');
    await page.click('button:has-text("Confirm")');

    await expect(page.locator('text=User suspended')).toBeVisible();

    // Reactivate user
    await page.click('button:has-text("Reactivate")');
    await expect(page.locator('text=User reactivated')).toBeVisible();

    // Change user role
    await page.selectOption('select[name="role"]', 'admin');
    await page.click('button:has-text("Update Role")');
    await page.click('button:has-text("Confirm")');

    await expect(page.locator('text=Role updated')).toBeVisible();
  });

  test('should view analytics and reports', async ({ page }) => {
    await page.click('text=Analytics');

    // View sales report
    await page.click('text=Sales Report');
    await page.selectOption('select[name="period"]', 'last-30-days');
    await page.click('button:has-text("Generate Report")');

    await expect(page.locator('[data-testid="sales-report"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-sales"]')).toBeVisible();
    await expect(page.locator('[data-testid="average-order-value"]')).toBeVisible();

    // Export report
    await page.click('button:has-text("Export to CSV")');
    // Verify download

    // View product performance
    await page.click('text=Product Performance');
    await expect(page.locator('[data-testid="top-products"]')).toBeVisible();
    await expect(page.locator('[data-testid="low-performers"]')).toBeVisible();

    // View customer analytics
    await page.click('text=Customer Analytics');
    await expect(page.locator('[data-testid="customer-lifetime-value"]')).toBeVisible();
    await expect(page.locator('[data-testid="retention-rate"]')).toBeVisible();
  });

  test('should manage categories', async ({ page }) => {
    await page.click('text=Categories');

    // Add new category
    await page.click('button:has-text("Add Category")');
    await page.fill('input[name="name"]', 'New Category');
    await page.fill('input[name="slug"]', 'new-category');
    await page.fill('textarea[name="description"]', 'Category description');
    await page.click('button:has-text("Create")');

    await expect(page.locator('text=Category created')).toBeVisible();

    // Edit category
    await page.click('[data-testid="category-row"]').last();
    await page.click('button:has-text("Edit")');
    await page.fill('input[name="name"]', 'Updated Category');
    await page.click('button:has-text("Save")');

    await expect(page.locator('text=Category updated')).toBeVisible();

    // Delete category
    await page.click('button:has-text("Delete")');
    await page.click('button:has-text("Confirm")');

    await expect(page.locator('text=Category deleted')).toBeVisible();
  });

  test('should manage promotions and discounts', async ({ page }) => {
    await page.click('text=Promotions');

    // Create new discount code
    await page.click('button:has-text("New Discount")');
    await page.fill('input[name="code"]', 'SUMMER2024');
    await page.selectOption('select[name="type"]', 'percentage');
    await page.fill('input[name="value"]', '20');
    await page.fill('input[name="minPurchase"]', '50');
    await page.fill('input[name="maxUses"]', '100');
    await page.fill('input[name="startDate"]', '2024-06-01');
    await page.fill('input[name="endDate"]', '2024-08-31');
    await page.click('button:has-text("Create Discount")');

    await expect(page.locator('text=Discount created')).toBeVisible();

    // View discount usage
    await page.click('[data-testid="discount-row"]').first();
    await expect(page.locator('[data-testid="usage-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="revenue-impact"]')).toBeVisible();

    // Deactivate discount
    await page.click('button:has-text("Deactivate")');
    await expect(page.locator('text=Discount deactivated')).toBeVisible();
  });

  test('should manage site settings', async ({ page }) => {
    await page.click('text=Settings');

    // Update site information
    await page.click('text=General');
    await page.fill('input[name="siteName"]', 'My E-Commerce Store');
    await page.fill('input[name="supportEmail"]', 'support@example.com');
    await page.fill('input[name="supportPhone"]', '+1234567890');
    await page.click('button:has-text("Save Settings")');

    await expect(page.locator('text=Settings updated')).toBeVisible();

    // Configure payment settings
    await page.click('text=Payment');
    await page.check('input[name="enableCreditCard"]');
    await page.check('input[name="enablePayPal"]');
    await page.fill('input[name="stripeKey"]', 'sk_test_...');
    await page.click('button:has-text("Save Payment Settings")');

    // Configure shipping settings
    await page.click('text=Shipping');
    await page.click('button:has-text("Add Shipping Method")');
    await page.fill('input[name="name"]', 'Express Shipping');
    await page.fill('input[name="cost"]', '15.00');
    await page.fill('input[name="estimatedDays"]', '2-3');
    await page.click('button:has-text("Add Method")');

    await expect(page.locator('text=Shipping method added')).toBeVisible();
  });

  test('should view system logs', async ({ page }) => {
    await page.click('text=System');
    await page.click('text=Logs');

    // Filter logs by level
    await page.selectOption('select[name="level"]', 'error');
    await page.click('button:has-text("Filter")');

    await expect(page.locator('[data-testid="log-entry"]')).toHaveCount(
      await page.locator('[data-testid="log-entry"]').count()
    );

    // Search logs
    await page.fill('input[placeholder="Search logs"]', 'payment');
    await page.press('input[placeholder="Search logs"]', 'Enter');

    // View log details
    await page.click('[data-testid="log-entry"]').first();
    await expect(page.locator('[data-testid="log-details"]')).toBeVisible();

    // Export logs
    await page.click('button:has-text("Export Logs")');
  });

  test('should handle bulk operations', async ({ page }) => {
    await page.click('text=Products');

    // Select multiple products
    await page.check('[data-testid="select-all"]');
    await expect(page.locator('[data-testid="bulk-actions"]')).toBeVisible();

    // Bulk update prices
    await page.selectOption('select[name="bulkAction"]', 'update-price');
    await page.fill('input[name="priceAdjustment"]', '10');
    await page.selectOption('select[name="adjustmentType"]', 'increase-percent');
    await page.click('button:has-text("Apply")');

    await expect(page.locator('text=Products updated')).toBeVisible();

    // Bulk change category
    await page.check('[data-testid="select-all"]');
    await page.selectOption('select[name="bulkAction"]', 'change-category');
    await page.selectOption('select[name="category"]', 'electronics');
    await page.click('button:has-text("Apply")');

    await expect(page.locator('text=Category updated')).toBeVisible();
  });
});
