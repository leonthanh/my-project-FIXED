const { test, expect } = require('@playwright/test');

test('admin list band matches detail page band for first submission', async ({ page }) => {
  // Setup teacher user
  await page.addInitScript(() => {
    localStorage.setItem('user', JSON.stringify({ id: 1, name: 'thanh', role: 'teacher' }));
  });

  // Go to admin list
  // Intercept admin list and submission detail API calls to return deterministic data for CI
  await page.route('**/api/listening-submissions/admin/list', async (route) => {
    const body = [
      {
        id: 1,
        userName: 'thanh',
        correct: 40,
        total: 40,
        computedCorrect: 40,
        computedTotal: 40,
        computedPercentage: 100,
        band: 9,
        details: null,
        ListeningTest: { id: 3, title: 'Sample Test', classCode: '348-IX-1A-S3', teacherName: 'Minh Thu' },
        createdAt: new Date().toISOString(),
      }
    ];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });

  await page.route('**/api/listening-submissions/1', async (route) => {
    const details = Array.from({ length: 40 }).map((_, i) => ({ questionNumber: i+1, isCorrect: true }));
    const body = { submission: { id: 1, correct: 40, total: 40, scorePercentage: 100, band: 9, details, answers: {} }, test: null };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });

  await page.goto('http://localhost:3000/admin/listening-submissions', { waitUntil: 'networkidle' });
  await page.waitForSelector('.admin-table', { timeout: 10000 });
  // Allow client-side enrichment/mock to settle
  await page.waitForTimeout(500);

  // Grab first row's band value and score
  const firstRow = page.locator('.admin-table tbody tr').first();
  const adminBandText = (await firstRow.locator('td:nth-child(6)').innerText()).trim();
  const adminScoreText = (await firstRow.locator('td:nth-child(5)').innerText()).trim();

  // Parse numbers
  const adminBand = parseFloat(adminBandText) || null;
  const adminScore = adminScoreText.split('\n').join(' ').trim(); // keep as string for debugging

  // Open details
  await firstRow.locator('button', { hasText: 'Chi tiết' }).click();
  await page.waitForSelector('text=Band IELTS', { timeout: 10000 });
  await page.waitForTimeout(500);

  const detailBandText = await page.locator('text=Band IELTS').locator('..').locator('div').first().innerText();
  const detailBand = parseFloat(detailBandText) || null;

  // Assert equality
  expect(adminBand).not.toBeNull();
  expect(detailBand).not.toBeNull();
  expect(adminBand).toBe(detailBand);

  // Helpful trace on failure
  console.log('Admin band:', adminBand, 'Detail band:', detailBand, 'Admin score cell:', adminScore);
});