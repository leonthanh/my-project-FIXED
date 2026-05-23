const { test, expect } = require('@playwright/test');

test('screenshot admin listening submissions', async ({ page }) => {
  await page.addInitScript(() => {
    const user = JSON.stringify({ id: 1, name: 'thanh', role: 'teacher', canManageTests: true });
    localStorage.setItem('user', user);
    sessionStorage.setItem('user', user);
    sessionStorage.setItem('accessToken', 'e2e.teacher.token');
  });

  await page.route('**/api/listening-submissions/admin/list', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 1,
          userName: 'thanh',
          userPhone: '0912345678',
          computedCorrect: 32,
          computedTotal: 40,
          computedPercentage: 80,
          finished: true,
          ListeningTest: { id: 3, title: 'Sample Test', classCode: '348-IX-1A-S3', teacherName: 'Minh Thu' },
          createdAt: new Date().toISOString(),
        },
      ]),
    });
  });

  await page.goto('http://localhost:3000/admin/listening-submissions', { waitUntil: 'networkidle' });
  await page.waitForSelector('#listening-submission-row-1', { timeout: 10000 });
  await page.screenshot({ path: 'tmp/admin-listening-submissions.png', fullPage: true });
  expect(page.locator('#listening-submission-row-1')).toBeTruthy();
});
