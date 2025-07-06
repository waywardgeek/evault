import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display login page correctly', async ({ page }) => {
    await page.goto('/login');

    // Check page title
    await expect(page).toHaveTitle(/eVault.*Login/);

    // Check login form elements
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByText(/Google/i)).toBeVisible();
    
    // Check for Google OAuth button
    const googleButton = page.getByRole('button', { name: /continue with google/i });
    await expect(googleButton).toBeVisible();
  });

  test('should handle Google OAuth flow initiation', async ({ page }) => {
    await page.goto('/login');

    // Mock the API response for auth URL
    await page.route('**/api/auth/url', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://accounts.google.com/oauth2/auth?client_id=test&redirect_uri=test'
        })
      });
    });

    // Click Google login button
    const googleButton = page.getByRole('button', { name: /continue with google/i });
    
    // We can't actually complete OAuth in tests, but we can verify the flow starts
    await googleButton.click();
    
    // Verify that the auth URL request was made
    // In a real test, you might mock the entire OAuth flow
  });

  test('should redirect unauthenticated users from protected pages', async ({ page }) => {
    // Try to access vault page without authentication
    await page.goto('/vault');

    // Should redirect to login or show authentication required
    // This depends on your implementation
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/(login|auth)/);
  });
});

test.describe('Vault Operations (Mock Authentication)', () => {
  // Helper function to mock authentication
  const mockAuth = async (page: any) => {
    // Mock the auth check API
    await page.route('**/api/user', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            user_id: 'test-user-123',
            email: 'test@example.com',
            verified: true
          }
        })
      });
    });

    // Set a mock JWT token in localStorage
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock-jwt-token');
    });
  };

  test('should display vault page for authenticated users', async ({ page }) => {
    await mockAuth(page);

    // Mock vault status API
    await page.route('**/api/vault/status', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          has_vault: false,
          openadp_metadata: null
        })
      });
    });

    await page.goto('/vault');

    // Check that vault page loads
    await expect(page.getByRole('heading', { name: /vault/i })).toBeVisible();
  });

  test('should show vault registration form for new users', async ({ page }) => {
    await mockAuth(page);

    // Mock vault status - no vault exists
    await page.route('**/api/vault/status', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          has_vault: false,
          openadp_metadata: null
        })
      });
    });

    await page.goto('/vault');

    // Should show registration form
    await expect(page.getByText(/register.*vault/i)).toBeVisible();
    await expect(page.getByLabelText(/pin/i)).toBeVisible();
  });

  test('should handle vault registration', async ({ page }) => {
    await mockAuth(page);

    // Mock vault status - no vault exists
    await page.route('**/api/vault/status', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          has_vault: false,
          openadp_metadata: null
        })
      });
    });

    // Mock vault registration
    await page.route('**/api/vault/register', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true
        })
      });
    });

    await page.goto('/vault');

    // Fill in registration form
    await page.getByLabelText(/pin/i).fill('test123456');
    
    const registerButton = page.getByRole('button', { name: /register/i });
    await expect(registerButton).toBeVisible();
    await registerButton.click();

    // Verify success feedback
    await expect(page.getByText(/success/i)).toBeVisible();
  });

  test('should show vault dashboard for existing users', async ({ page }) => {
    await mockAuth(page);

    // Mock vault status - vault exists
    await page.route('**/api/vault/status', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          has_vault: true,
          openadp_metadata: 'mock-metadata'
        })
      });
    });

    // Mock entries list
    await page.route('**/api/entries/list', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          names: ['test-entry-1', 'test-entry-2']
        })
      });
    });

    await page.goto('/vault');

    // Should show vault dashboard
    await expect(page.getByText(/entries/i)).toBeVisible();
    await expect(page.getByText(/test-entry-1/)).toBeVisible();
  });

  test('should handle adding new entries', async ({ page }) => {
    await mockAuth(page);

    // Mock existing vault
    await page.route('**/api/vault/status', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          has_vault: true,
          openadp_metadata: 'mock-metadata'
        })
      });
    });

    // Mock add entry
    await page.route('**/api/entries', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Entry added successfully'
          })
        });
      }
    });

    await page.goto('/vault');

    // Find and click add entry button
    const addButton = page.getByRole('button', { name: /add entry/i });
    await expect(addButton).toBeVisible();
    await addButton.click();

    // Fill in entry form
    await page.getByLabelText(/name/i).fill('test-password');
    await page.getByLabelText(/value/i).fill('super-secret-password');

    // Submit form
    const submitButton = page.getByRole('button', { name: /save/i });
    await submitButton.click();

    // Verify success
    await expect(page.getByText(/added successfully/i)).toBeVisible();
  });
});

test.describe('Error Handling', () => {
  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/vault/status', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal server error'
        })
      });
    });

    await page.goto('/vault');

    // Should show error message
    await expect(page.getByText(/error/i)).toBeVisible();
  });

  test('should handle network errors', async ({ page }) => {
    // Mock network failure
    await page.route('**/api/**', async route => {
      await route.abort('failed');
    });

    await page.goto('/vault');

    // Should show network error or loading state
    // This depends on your error handling implementation
  });
}); 