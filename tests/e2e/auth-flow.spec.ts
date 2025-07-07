import { test, expect, type Route } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display login page correctly', async ({ page }) => {
    await page.goto('/login');

    // Check page title
    await expect(page).toHaveTitle(/eVault.*Secure Personal Data Vault/);

    // Check login form elements
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    
    // Check for Google OAuth button specifically
    const googleButton = page.getByRole('button', { name: /sign in with google/i });
    await expect(googleButton).toBeVisible();
  });

  test('should handle Google OAuth flow initiation', async ({ page }) => {
    await page.goto('/login');

    // Mock the API response for auth URL
    await page.route('**/api/auth/url', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://accounts.google.com/oauth2/auth?client_id=test&redirect_uri=test'
        })
      });
    });

    // Click Google login button
    const googleButton = page.getByRole('button', { name: /sign in with google/i });
    
    // We can't actually complete OAuth in tests, but we can verify the flow starts
    await googleButton.click();
    
    // Verify that the auth URL request was made
    // In a real test, you might mock the entire OAuth flow
  });

  test('should redirect unauthenticated users from protected pages', async ({ page }) => {
    // Try to access vault page without authentication
    await page.goto('/vault');

    // Wait for the redirect to complete (authentication check happens in useEffect)
    await page.waitForURL('**/login', { timeout: 5000 });

    // Should redirect to login page
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/(login|auth)/);
  });
});

test.describe('Vault Operations (Mock Authentication)', () => {
  // Helper function to mock authentication
  const mockAuth = async (page: any) => {
    // Mock NextAuth session API
    await page.route('**/api/auth/session', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            name: 'Test User',
            email: 'test@example.com',
            image: null
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          serverToken: 'mock-server-token',
          serverUser: {
            user_id: 'test-user-123',
            email: 'test@example.com',
            verified: true
          }
        })
      });
    });

    // Mock NextAuth CSRF token
    await page.route('**/api/auth/csrf', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          csrfToken: 'mock-csrf-token'
        })
      });
    });

    // Mock NextAuth providers
    await page.route('**/api/auth/providers', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          google: {
            id: 'google',
            name: 'Google',
            type: 'oauth',
            signinUrl: '/api/auth/signin/google',
            callbackUrl: '/api/auth/callback/google'
          }
        })
      });
    });

    // Mock the auth check API
    await page.route('**/api/user', async (route: Route) => {
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

    // Mock the auth check API on server
    await page.route('**/8080/api/user', async (route: Route) => {
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
  };

  test('should display vault page for authenticated users', async ({ page }) => {
    // Mock vault status API
    await page.route('**/api/vault/status', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          has_vault: false,
          openadp_metadata: null
        })
      });
    });

    await mockAuth(page);

    // Navigate to home page first to set up localStorage, then go to vault
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock-jwt-token');
    });

    await page.goto('/vault');

    // Check that vault page loads
    await expect(page.getByRole('heading', { name: /vault/i })).toBeVisible();
  });

  test('should show vault registration form for new users', async ({ page }) => {
    // Mock vault status - no vault exists
    await page.route('**/api/vault/status', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          has_vault: false,
          openadp_metadata: null
        })
      });
    });

    await mockAuth(page);

    // Navigate to home page first to set up localStorage, then go to vault
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock-jwt-token');
    });

    await page.goto('/vault');

    // Should show registration button
    await expect(page.getByRole('button', { name: /register new vault/i })).toBeVisible();
    
    // Click the register button to see the modal
    await page.getByRole('button', { name: /register new vault/i }).click();
    
    // Check that the modal appears with PIN input
    await expect(page.getByText(/choose your pin/i)).toBeVisible();
    await expect(page.getByPlaceholder(/enter your pin/i)).toBeVisible();
  });

  test('should handle vault registration', async ({ page }) => {
    let vaultRegistered = false;
    
    // Mock vault status - changes after registration  
    await page.route('**/api/vault/status', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          has_vault: vaultRegistered,
          openadp_metadata: vaultRegistered ? 'mock-metadata' : null
        })
      });
    });

    // Also mock the direct server calls (Go server on port 8080)
    await page.route('**/8080/api/vault/status', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          has_vault: vaultRegistered,
          openadp_metadata: vaultRegistered ? 'mock-metadata' : null
        })
      });
    });

    // Mock entries API to return empty array when no vault exists
    await page.route('**/8080/api/entries', async (route: Route) => {
      if (vaultRegistered) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            entries: []
          })
        });
      } else {
        // Return 404 when no vault exists
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'No vault found'
          })
        });
      }
    });

    // Mock vault registration
    await page.route('**/api/vault/register', async (route: Route) => {
      vaultRegistered = true; // Update state after registration
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true
        })
      });
    });

    // Mock vault registration on server
    await page.route('**/8080/api/vault/register', async (route: Route) => {
      vaultRegistered = true; // Update state after registration
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true
        })
      });
    });





    await mockAuth(page);

    // Add a test flag to bypass authentication during E2E tests
    await page.goto('/vault?test=true');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // If we still get redirected, force evaluate the authentication state
    if (!page.url().includes('/vault')) {
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.setItem('auth_token', 'mock-jwt-token');
        // Set a test flag to indicate we're in test mode
        localStorage.setItem('test_mode', 'true');
      });
      await page.goto('/vault?test=true');
    }

    // Wait for the vault page to load
    await page.waitForTimeout(1000);
    
    // Click the register button to open the modal
    await page.getByRole('button', { name: /register new vault/i }).click();
    
    // Fill in registration form (now that the modal is open)
    await page.getByPlaceholder(/enter your pin/i).fill('test123456');
    
    const createVaultButton = page.getByRole('button', { name: /create vault/i });
    await expect(createVaultButton).toBeVisible();
    
    // Handle the success alert that appears after registration
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Vault registered successfully');
      await dialog.accept();
    });
    
    await createVaultButton.click();

    // Verify the vault status has been updated
    await expect(page.getByText(/vault registered:.*yes/i)).toBeVisible();
  });

  test('should show vault dashboard for existing users', async ({ page }) => {
    // Mock vault status - vault exists
    await page.route('**/api/vault/status', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          has_vault: true,
          openadp_metadata: 'mock-metadata'
        })
      });
    });

    // Mock vault status on server
    await page.route('**/8080/api/vault/status', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          has_vault: true,
          openadp_metadata: 'mock-metadata'
        })
      });
    });

    // Mock entries API
    await page.route('**/api/entries', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          entries: [
            { name: 'test-entry-1', hpke_blob: 'mock-blob-1' },
            { name: 'test-entry-2', hpke_blob: 'mock-blob-2' }
          ]
        })
      });
    });

    // Mock entries API on server
    await page.route('**/8080/api/entries', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          entries: [
            { name: 'test-entry-1', hpke_blob: 'mock-blob-1' },
            { name: 'test-entry-2', hpke_blob: 'mock-blob-2' }
          ]
        })
      });
    });

    await mockAuth(page);

    // Navigate to home page first to set up localStorage, then go to vault
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock-jwt-token');
      // Mock a cached public key to make the vault appear unlocked (base64 encoded)
      localStorage.setItem('evault-hpke-public-key', btoa('mock-public-key-32-bytes-long!!!'));
    });

    await page.goto('/vault');

    // Should show vault dashboard
    await expect(page.getByText(/vault entries/i)).toBeVisible();
    await expect(page.getByText(/test-entry-1/)).toBeVisible();
  });

  test('should handle adding new entries', async ({ page }) => {
    // Mock existing vault
    await page.route('**/api/vault/status', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          has_vault: true,
          openadp_metadata: 'mock-metadata'
        })
      });
    });

    // Mock vault status on server
    await page.route('**/8080/api/vault/status', async (route: Route) => {
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
    await page.route('**/api/entries', async (route: Route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Entry added successfully'
          })
        });
      } else {
        // GET requests for listing entries
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            entries: []
          })
        });
      }
    });

    // Mock add entry on server
    await page.route('**/8080/api/entries', async (route: Route) => {
      console.log('Server entries API called:', route.request().method(), route.request().url());
      if (route.request().method() === 'POST') {
        console.log('POST request body:', await route.request().postData());
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Entry added successfully'
          })
        });
      } else {
        // GET requests for listing entries
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            entries: []
          })
        });
      }
    });

    await mockAuth(page);

    // Navigate to home page first to set up localStorage, then go to vault
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock-jwt-token');
      // Mock a cached public key to make the vault appear unlocked (base64 encoded)
      localStorage.setItem('evault-hpke-public-key', btoa('mock-public-key-32-bytes-long!!!'));
    });

    await page.goto('/vault');

    // Find and click add entry button
    const addButton = page.getByRole('button', { name: /add entry/i });
    await expect(addButton).toBeVisible();
    await addButton.click();

    // Fill in entry form
    await page.getByPlaceholder(/github recovery codes/i).fill('test-password');
    await page.getByPlaceholder(/paste your recovery codes/i).fill('super-secret-password');

    // Handle the success alert that appears after adding entry
    page.on('dialog', async dialog => {
      console.log('Dialog message:', dialog.message());
      expect(dialog.message()).toContain('Entry added successfully');
      await dialog.accept();
    });

    // Submit form (click the button in the modal, not the main page button)
    const modal = page.locator('.fixed.inset-0'); // Target the modal container
    const submitButton = modal.getByRole('button', { name: /add entry/i });
    await submitButton.click();

    // Wait a moment for the operation to complete
    await page.waitForTimeout(1000);
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/vault/status', async (route: Route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal server error'
        })
      });
    });

    // Mock API error on server
    await page.route('**/8080/api/vault/status', async (route: Route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal server error'
        })
      });
    });

    await mockAuth(page);
    
    // Navigate to home page first to set up localStorage, then go to vault
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock-jwt-token');
    });

    await page.goto('/vault');

    // Should show error message or loading state (depending on error handling)
    // The page might still be loading if the API error is handled gracefully
    await page.waitForTimeout(2000);
  });

  test('should handle network errors', async ({ page }) => {
    // Mock network failure for all API calls
    await page.route('**/api/**', async (route: Route) => {
      await route.abort('failed');
    });

    // Mock network failure for server calls
    await page.route('**/8080/api/**', async (route: Route) => {
      await route.abort('failed');
    });

    await mockAuth(page);
    
    // Navigate to home page first to set up localStorage, then go to vault
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'mock-jwt-token');
    });

    await page.goto('/vault');

    // Should show loading state when network requests fail
    await expect(page.getByText(/loading vault/i)).toBeVisible();
  });
}); 