const { test, expect } = require('@playwright/test');

test.describe.serial('DoReadingTest E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure user is logged in via localStorage
    await page.addInitScript(() => {
      localStorage.setItem('user', JSON.stringify({ name: 'E2E Student', role: 'student', phone: '0912345678' }));
    });
  });

  test('clicking part dot focuses first question of that part', async ({ page }) => {
    // Ensure test starts as 'started' so navigator renders
    await page.addInitScript(() => {
      localStorage.setItem('reading_test_1_started', 'true');
      localStorage.removeItem('reading_test_1_answers');
    });

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

    // Wait for the navigator/palette to render (first nav button appears)
    await page.waitForSelector('[data-testid="nav-question-1"]', { timeout: 20000 });

    const partDot2 = page.locator('[data-testid="part-dot-1"]');
    await expect(partDot2).toBeVisible({ timeout: 20000 });
    await partDot2.click();

    // give a moment for UI animations & scroll to complete
    await page.waitForTimeout(600);

    // The first question in Passage 2 is expected to be Question 4 in fixtures
    const q4 = page.locator('[data-testid="nav-question-4"]');
    await expect(q4).toHaveClass(/active/, { timeout: 5000 });
  });

  test('submitting the test posts answers and shows real result modal (no submit mock)', async ({ page }) => {
    // Prepare answers in localStorage to match mocked correct answers in test GET
    // Use explicit navigation and evaluate to avoid registering a persistent init script
    // Ensure we are on the app origin so localStorage is available, then set initial answers
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('reading_test_1_answers', JSON.stringify({ q_1: 'A', q_2: 'B' }));
      localStorage.setItem('reading_test_1_started', 'true');
    });

    // Mock the reading test GET response so the page loads predictable data with correctAnswer fields
    await page.route('**/api/reading-tests/1', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '1',
          title: 'E2E Reading Test',
          passages: [
            { index: 1, passageTitle: 'Passage 1', questions: [
                { type: 'multiple-choice', questionText: 'Q1', correctAnswer: 'A' },
                { type: 'multiple-choice', questionText: 'Q2', correctAnswer: 'B' }
              ]
            }
          ]
        }),
      });
    });

    // Note: do NOT mock submit route — use real backend to score and persist

    await page.goto('/reading/1');

    // Override native confirm to avoid blocking dialogs
    await page.evaluate(() => { window.confirm = () => true; });

    // Click the submit button (wait until submit area is present)
    await page.waitForSelector('[data-testid="submit-button"]', { timeout: 20000 });
    const submitBtn = page.locator('[data-testid="submit-button"]');
    await expect(submitBtn).toBeVisible({ timeout: 10000 });
    await submitBtn.click();

    // allow UI to show confirm modal animation
    await page.waitForTimeout(300);

    // Confirm modal should appear and we click confirm by test id
    const confirmBtn = page.locator('[data-testid="confirm-btn"]');
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();

    // Wait for the submit network response from backend (real submit)
    const submitResp = await page.waitForResponse(resp => resp.url().includes('/api/reading-tests/1/submit') && resp.status() === 200, { timeout: 20000 });
    const submitData = await submitResp.json();
    // debug log
    console.log('submitData', submitData);
    // ensure submission saved
    await expect(submitData.submissionId).toBeTruthy();

    // Result modal should appear and show band and submission id
    await page.waitForSelector('[data-testid="result-band"]', { timeout: 20000 });
    await expect(page.locator('[data-testid="result-band"]')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('text=Submission ID')).toBeVisible({ timeout: 20000 });

    // Close modal — but first override reload so we can assert the in-memory state update
    await page.evaluate(() => { window.location.reload = () => {}; });
    await page.locator('button:has-text("Đóng")').click();
    await expect(page.locator('[data-testid="result-band"]')).toHaveCount(0);

    // Now the component should have cleared persisted keys (answers and timer)
    await page.waitForTimeout(250);
    const answersVal = await page.evaluate(() => localStorage.getItem('reading_test_1_answers'));
    const timeVal = await page.evaluate(() => localStorage.getItem('reading_test_1_timeRemaining'));
    console.log('after close localStorage answers=', answersVal, 'time=', timeVal);
    expect(answersVal).toBeNull();
    expect(timeVal).toBeNull();


  });
});