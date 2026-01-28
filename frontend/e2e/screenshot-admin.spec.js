const { test, expect } = require('@playwright/test');

test('screenshot admin listening submissions', async ({ page }) => {
  // Inject a teacher user into localStorage so ProtectedRoute allows access
  await page.addInitScript(() => {
    localStorage.setItem('user', JSON.stringify({ id: 1, name: 'thanh', role: 'teacher' }));
  });

  await page.goto('http://localhost:3000/admin/listening-submissions', { waitUntil: 'networkidle' });
  // Wait for table to appear
  await page.waitForSelector('.admin-table', { timeout: 10000 });
  // Allow some time for client-side enrichment to complete
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'tmp/admin-listening-submissions.png', fullPage: true });
});
