import { test, expect } from '@playwright/test';

test.describe('eVault Homepage', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/');

    // Check page title
    await expect(page).toHaveTitle(/eVault/);

    // Check main heading - use more specific selector to avoid strict mode violation
    await expect(page.getByRole('heading', { name: 'Welcome to eVault' })).toBeVisible();

    // Check for main sections
    await expect(page.getByText(/nation-state resistant protection/i)).toBeVisible();
  });

  test('should have working navigation', async ({ page }) => {
    await page.goto('/');

    // Check for navigation links
    const loginLink = page.getByRole('link', { name: /login/i });
    await expect(loginLink).toBeVisible();

    // Navigate to login page
    await loginLink.click();
    await expect(page).toHaveURL(/.*login/);
  });

  test('should display features section', async ({ page }) => {
    await page.goto('/');

    // Check for features section based on actual content
    await expect(page.getByText(/Secure Storage/i)).toBeVisible();
    await expect(page.getByText(/Distributed Trust/i)).toBeVisible();
    await expect(page.getByText(/Nation-State Resistant/i)).toBeVisible();
  });

  test('should have responsive design', async ({ page }) => {
    // Test desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Welcome to eVault' })).toBeVisible();

    // Test mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Welcome to eVault' })).toBeVisible();
  });
}); 