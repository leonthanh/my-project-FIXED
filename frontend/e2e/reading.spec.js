const { test, expect } = require('@playwright/test');

test.describe('DoReadingTest E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure user is logged in via localStorage and test is marked started
    await page.addInitScript(() => {
      localStorage.setItem('user', JSON.stringify({ name: 'E2E Student', role: 'student', phone: '0912345678' }));
      // Mark the reading test as started so the UI shows navigator and footer
      localStorage.setItem('reading_test_1_started', 'true');
      localStorage.removeItem('reading_test_1_answers');
    });
  });

  test('clicking part dot focuses first question of that part', async ({ page }) => {
    // Mock the reading test GET response so the page loads predictable data
    await page.route('**/api/reading-tests/1', (route) => {
      // Make passage 1 contain 3 questions so passage 2 starts at question 4
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '1',
          title: 'E2E Reading Test',
          passages: [
            { index: 1, passageTitle: 'Passage 1', questions: [
                { type: 'multiple-choice', questionText: 'Q1' },
                { type: 'multiple-choice', questionText: 'Q2' },
                { type: 'multiple-choice', questionText: 'Q3' }
              ]
            },
            { index: 2, passageTitle: 'Passage 2', questions: [
                { type: 'multiple-choice', questionText: 'Q4' },
                { type: 'multiple-choice', questionText: 'Q5' }
              ]
            }
          ]
        }),
      });
    });

    await page.goto('/reading/1');

    // Wait for the navigator/palette to render
    await page.waitForSelector('.nav-question-btn', { timeout: 20000 });

    const part2 = page.locator('[title="Passage 2"]');
    await expect(part2).toBeVisible({ timeout: 20000 });
    await part2.click();

    // give a moment for UI animations & scroll to complete
    await page.waitForTimeout(600);

    // The first question in Passage 2 is expected to be Question 4 in fixtures
    const q4 = page.locator('button[title^="Question 4"]');
    await expect(q4).toHaveClass(/active/, { timeout: 5000 });
  });

  test('submitting the test posts answers and navigates to results', async ({ page }) => {
    // Mock the submit endpoint
    await page.route('**/api/reading-tests/1/submit', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ score: 35, total: 40, message: 'Mocked result' }),
      });
    });

    // Mock the reading test GET response so the page loads predictable data
    await page.route('**/api/reading-tests/1', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '1',
          title: 'E2E Reading Test',
          passages: [
            { index: 1, passageTitle: 'Passage 1', questions: [{ type: 'multiple-choice', questionText: 'First Q' }] },
            { index: 2, passageTitle: 'Passage 2', questions: [{ type: 'multiple-choice', questionText: 'Second Q' }] }
          ]
        }),
      });
    });

    await page.goto('/reading/1');

    // Override native confirm to avoid blocking dialogs
    await page.evaluate(() => { window.confirm = () => true; });

    // Click the submit button (wait until submit area is present)
    await page.waitForSelector('span.submit-text', { timeout: 20000 });
    const submitBtn = page.locator('button:has(span.submit-text)');
    await expect(submitBtn).toBeVisible({ timeout: 10000 });
    await submitBtn.click();

    // allow UI to show confirm modal animation
    await page.waitForTimeout(300);

    // Confirm modal "Xác nhận" should appear
    const confirmBtn = page.locator('button', { hasText: 'Xác nhận' });
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();

    // Expect navigation to the results page
    await page.waitForURL('**/reading-results/1', { timeout: 10000 });
    expect(page.url()).toContain('/reading-results/1');
  });
});