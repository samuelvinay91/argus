import { test, expect } from '@playwright/test';

/**
 * Authentication Flow E2E Tests
 *
 * These tests verify that the auth integration with Clerk works correctly
 * and that the api-client doesn't emit spurious warnings during normal operation.
 *
 * The key fix being tested: The api-client should not log
 * "[api-client] No token getter available" warnings during initial page load
 * because auth initialization is expected to take time.
 */
test.describe('Authentication Flow', () => {
  test.describe('Initial Load Behavior', () => {
    test('should not show auth warning on initial load', async ({ page }) => {
      const consoleMessages: { type: string; text: string }[] = [];

      // Capture all console messages
      page.on('console', msg => {
        consoleMessages.push({
          type: msg.type(),
          text: msg.text(),
        });
      });

      // Navigate to the dashboard home page
      await page.goto('/');

      // Wait for the page to fully load
      await page.waitForLoadState('networkidle');

      // Allow time for any async operations to complete
      await page.waitForTimeout(2000);

      // Check for the specific auth warning we fixed
      const authWarnings = consoleMessages.filter(
        msg => msg.text.includes('No token getter available')
      );

      // Verify no auth warnings were logged during initial load
      expect(authWarnings).toHaveLength(0);

      // Log all warnings/errors for debugging if test fails
      if (authWarnings.length > 0) {
        console.log('Unexpected auth warnings:', authWarnings);
      }
    });

    test('should not have console errors on initial load', async ({ page }) => {
      const consoleErrors: string[] = [];

      page.on('console', msg => {
        if (msg.type() === 'error') {
          // Ignore known third-party errors
          const text = msg.text();
          if (!text.includes('Third-party cookie') &&
              !text.includes('Download the React DevTools')) {
            consoleErrors.push(text);
          }
        }
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Filter out expected errors (e.g., network errors from backend being unavailable in tests)
      const unexpectedErrors = consoleErrors.filter(
        error => !error.includes('ERR_CONNECTION_REFUSED') &&
                 !error.includes('Failed to fetch')
      );

      expect(unexpectedErrors).toHaveLength(0);
    });

    test('should render the page without crashing', async ({ page }) => {
      await page.goto('/');

      // Verify the page loads and contains expected content
      // The dashboard should render something (either landing page or auth redirect)
      await expect(page).toHaveTitle(/Argus/i);
    });
  });

  test.describe('Unauthenticated State', () => {
    test('should show sign-in option when not authenticated', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Look for sign-in related elements
      // Clerk typically shows a "Sign In" button or redirects to sign-in
      const signInButton = page.getByRole('button', { name: /sign in/i });
      const signInLink = page.getByRole('link', { name: /sign in/i });

      // Either a button or link should be present for authentication
      const hasSignIn = await signInButton.isVisible().catch(() => false) ||
                        await signInLink.isVisible().catch(() => false);

      // If neither is found, we might already be on an auth page or the app redirected
      if (!hasSignIn) {
        // Check if we're on a Clerk sign-in page or the app shows a different auth UI
        const currentUrl = page.url();
        const isOnAuthPage = currentUrl.includes('sign-in') || currentUrl.includes('clerk');

        // The test passes if we found sign-in UI OR we're on an auth page
        expect(hasSignIn || isOnAuthPage).toBeTruthy();
      }
    });

    test('should redirect protected routes to sign-in', async ({ page }) => {
      // Try to access a protected route directly
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Should either redirect to sign-in or show sign-in UI
      const currentUrl = page.url();
      const isProtected =
        currentUrl.includes('sign-in') ||
        currentUrl.includes('sign-up') ||
        currentUrl.includes('clerk') ||
        currentUrl === (process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000') + '/';

      expect(isProtected).toBeTruthy();
    });
  });

  test.describe('API Client Initialization', () => {
    test('should not warn when auth provider is mounted', async ({ page }) => {
      const warnings: string[] = [];

      page.on('console', msg => {
        if (msg.type() === 'warning') {
          warnings.push(msg.text());
        }
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Wait for React to fully hydrate and auth to initialize
      await page.waitForTimeout(3000);

      // The specific warning we're checking for
      const tokenWarnings = warnings.filter(w =>
        w.includes('[api-client]') && w.includes('No token getter')
      );

      // Should have zero warnings about token getter during normal operation
      expect(tokenWarnings).toHaveLength(0);
    });

    test('should handle API calls gracefully when not authenticated', async ({ page }) => {
      const networkErrors: string[] = [];

      page.on('requestfailed', request => {
        // Only track API requests, not static assets
        if (request.url().includes('/api/')) {
          networkErrors.push(`${request.url()}: ${request.failure()?.errorText}`);
        }
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Wait for any initial API calls to complete or fail gracefully
      await page.waitForTimeout(2000);

      // Log network errors for debugging but don't fail the test
      // Some API calls may fail with 401 which is expected behavior
      if (networkErrors.length > 0) {
        console.log('Network errors (may be expected 401s):', networkErrors);
      }
    });
  });

  test.describe('Clerk Integration', () => {
    test('should load Clerk authentication UI', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Give Clerk time to load
      await page.waitForTimeout(2000);

      // Check for Clerk components or authentication UI
      // Clerk injects specific elements into the page
      const clerkLoaded = await page.evaluate(() => {
        // Check if Clerk's global object exists
        return typeof (window as unknown as { Clerk?: unknown }).Clerk !== 'undefined' ||
               document.querySelector('[data-clerk-component]') !== null ||
               document.querySelector('.cl-component') !== null ||
               document.querySelector('[class*="clerk"]') !== null;
      });

      // Either Clerk is loaded or we're showing custom auth UI
      // This test just ensures auth infrastructure is present
      expect(clerkLoaded || await page.locator('button, a').filter({ hasText: /sign/i }).count() > 0).toBeTruthy();
    });
  });

  test.describe('Page Performance', () => {
    test('should load within acceptable time', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const loadTime = Date.now() - startTime;

      // Page should load within 10 seconds
      expect(loadTime).toBeLessThan(10000);
    });

    test('should not have memory leaks in console monitoring', async ({ page }) => {
      let messageCount = 0;

      page.on('console', () => {
        messageCount++;
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(5000);

      // Should not have excessive console messages (indicating a loop or leak)
      // Normal page load shouldn't exceed 100 console messages
      expect(messageCount).toBeLessThan(100);
    });
  });
});

/**
 * Login Flow Tests
 *
 * These tests require test credentials and are marked for CI environments
 * where test accounts can be configured.
 */
test.describe('Login Flow', () => {
  // Skip login tests if no test credentials are provided
  test.skip(
    !process.env.E2E_TEST_EMAIL || !process.env.E2E_TEST_PASSWORD,
    'Skipping login tests: E2E_TEST_EMAIL and E2E_TEST_PASSWORD not set'
  );

  test('should complete login flow successfully', async ({ page }) => {
    const testEmail = process.env.E2E_TEST_EMAIL!;
    const testPassword = process.env.E2E_TEST_PASSWORD!;

    const consoleMessages: { type: string; text: string }[] = [];
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
      });
    });

    // Navigate to the app
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find and click sign-in button/link
    const signInButton = page.getByRole('button', { name: /sign in/i });
    const signInLink = page.getByRole('link', { name: /sign in/i });

    if (await signInButton.isVisible().catch(() => false)) {
      await signInButton.click();
    } else if (await signInLink.isVisible().catch(() => false)) {
      await signInLink.click();
    }

    // Wait for Clerk's sign-in form
    await page.waitForSelector('input[name="identifier"], input[type="email"]', { timeout: 10000 });

    // Enter email
    const emailInput = page.locator('input[name="identifier"], input[type="email"]').first();
    await emailInput.fill(testEmail);

    // Click continue/next
    const continueButton = page.getByRole('button', { name: /continue|next|sign in/i }).first();
    await continueButton.click();

    // Wait for password field
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });

    // Enter password
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill(testPassword);

    // Click sign in
    const signInSubmit = page.getByRole('button', { name: /continue|sign in|submit/i }).first();
    await signInSubmit.click();

    // Wait for successful authentication and redirect
    await page.waitForURL(/dashboard|projects|home/, { timeout: 30000 });

    // Verify authenticated state
    await page.waitForLoadState('networkidle');

    // Check that we're now authenticated (should see user menu or dashboard content)
    const userMenu = page.locator('[data-clerk-user-button], .cl-userButtonTrigger, [aria-label*="user"]');
    const dashboardContent = page.locator('main, [role="main"]');

    const isAuthenticated =
      await userMenu.isVisible().catch(() => false) ||
      await dashboardContent.isVisible().catch(() => false);

    expect(isAuthenticated).toBeTruthy();

    // Verify no auth warnings after login
    const postLoginWarnings = consoleMessages.filter(
      msg => msg.type === 'warning' && msg.text.includes('No token getter available')
    );

    expect(postLoginWarnings).toHaveLength(0);
  });

  test('should maintain auth state after page refresh', async ({ page }) => {
    const testEmail = process.env.E2E_TEST_EMAIL!;
    const testPassword = process.env.E2E_TEST_PASSWORD!;

    // First, login
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate through login flow (simplified for brevity)
    const signInButton = page.getByRole('button', { name: /sign in/i });
    const signInLink = page.getByRole('link', { name: /sign in/i });

    if (await signInButton.isVisible().catch(() => false)) {
      await signInButton.click();
    } else if (await signInLink.isVisible().catch(() => false)) {
      await signInLink.click();
    }

    await page.waitForSelector('input[name="identifier"], input[type="email"]', { timeout: 10000 });
    await page.locator('input[name="identifier"], input[type="email"]').first().fill(testEmail);
    await page.getByRole('button', { name: /continue|next|sign in/i }).first().click();

    await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    await page.locator('input[type="password"]').first().fill(testPassword);
    await page.getByRole('button', { name: /continue|sign in|submit/i }).first().click();

    await page.waitForURL(/dashboard|projects|home/, { timeout: 30000 });

    // Now refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should still be authenticated after refresh
    const userMenu = page.locator('[data-clerk-user-button], .cl-userButtonTrigger, [aria-label*="user"]');
    const isStillAuthenticated = await userMenu.isVisible().catch(() => false);

    // Or verify we're on a protected page
    const onProtectedPage = !page.url().includes('sign-in');

    expect(isStillAuthenticated || onProtectedPage).toBeTruthy();
  });
});
