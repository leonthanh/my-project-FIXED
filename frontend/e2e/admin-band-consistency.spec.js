const { test, expect } = require('@playwright/test');

const teacherUser = {
  id: 1,
  name: 'thanh',
  role: 'teacher',
  canManageTests: true,
};

test('expanded submission band matches the listening results page band for the first submission', async ({ page }) => {
  await page.addInitScript((user) => {
    const serialized = JSON.stringify(user);
    localStorage.setItem('user', serialized);
    sessionStorage.setItem('user', serialized);
    sessionStorage.setItem('accessToken', 'e2e.teacher.token');
  }, teacherUser);

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
        finished: true,
        userPhone: '0912345678',
        ListeningTest: { id: 3, title: 'Sample Test', classCode: '348-IX-1A-S3', teacherName: 'Minh Thu' },
        createdAt: new Date().toISOString(),
      }
    ];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });

  await page.route('**/api/listening-submissions/1', async (route) => {
    const details = Array.from({ length: 40 }).map((_, i) => ({ questionNumber: i+1, isCorrect: true }));
    const body = {
      submission: {
        id: 1,
        testId: 3,
        correct: 40,
        total: 40,
        scorePercentage: 100,
        band: 9,
        details,
        answers: {},
      },
      test: null,
    };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });

  await page.goto('http://localhost:3000/admin/listening-submissions', { waitUntil: 'networkidle' });
  await page.waitForSelector('#listening-submission-row-1', { timeout: 10000 });

  const firstRow = page.locator('#listening-submission-row-1');
  await firstRow.click();

  const listBandText = await page.locator('xpath=//*[@id="listening-submission-row-1"]//*[text()="Band"]/preceding-sibling::div[1]').innerText();
  const listBand = parseFloat(listBandText) || null;

  await firstRow.getByRole('button', { name: 'Details' }).click();
  await page.waitForURL('**/listening-results/1', { timeout: 10000 });
  await page.waitForSelector('text=Band IX', { timeout: 10000 });

  const detailBandText = await page.locator('xpath=//*[text()="Band IX"]/preceding-sibling::div[1]').innerText();
  const detailBand = parseFloat(detailBandText) || null;

  expect(listBand).not.toBeNull();
  expect(detailBand).not.toBeNull();
  expect(listBand).toBe(detailBand);
});