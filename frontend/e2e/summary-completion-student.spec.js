const { test, expect } = require('@playwright/test');

test.describe('Summary Completion - Student view combobox', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure a student user is present in localStorage
    await page.addInitScript(() => {
      localStorage.setItem('user', JSON.stringify({ name: 'E2E Student', role: 'student', phone: '0912345678' }));
    });

    page.on('console', msg => console.log('PAGE LOG', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR', err && err.message));
    page.on('request', req => { if (req.url().includes('/reading-tests')) console.log('PAGE REQ', req.method(), req.url()); });
  });

  test('student sees select dropdowns for summary-completion when options exist', async ({ page }) => {
    // Mock test GET to return a reading test with summary-completion question (27-31)
    await page.route('**/api/reading-tests/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '1',
          title: 'Student Summary Test',
          durationMinutes: 45,
          passages: [
            {
              index: 0,
              passageTitle: 'Passage 1',
              sections: [
                {
                  sectionTitle: 'Questions 27-31',
                  questions: [
                    {
                      startQuestion: 27,
                      questionType: 'summary-completion',
                      questionText: '... first [BLANK] second [BLANK] third [BLANK] fourth [BLANK] fifth [BLANK] ...',
                      options: ['institution','mass production','mechanical processes','public','paints','artist','size','underlying ideas','basic technology','readers','picture frames','assistants'],
                      blanks: [ {}, {}, {}, {}, {} ]
                    }
                  ]
                }
              ]
            }
          ]
        })
      });
    });

    // Mark the test as started in localStorage so we land directly in the active test UI
    await page.addInitScript(() => {
      localStorage.setItem('reading_test_1_started', 'true');
      localStorage.setItem('reading_test_1_timeRemaining', String(45 * 60));
    });

    // Open the active test page directly
    await page.goto('/reading/1');

    // Debug snapshot: capture HTML to help diagnose why selects aren't rendering
    const html = await page.content();
    console.log('PAGE HTML SNAPSHOT:', html.slice(0, 4000));

    // Wait for cloze select elements (blanks) to render
    await page.waitForSelector('select.cloze-select, select.cloze-inline-select', { timeout: 10000 });

    // Assert there are 5 cloze selects on the page for the blanks
    const selects = page.locator('select.cloze-select, select.cloze-inline-select');
    await expect(selects).toHaveCount(5, { timeout: 5000 });

    // Check the first select is visible and includes option 'A. institution' in its option list
    await expect(selects.nth(0)).toBeVisible();
    const firstOptionTexts = await selects.nth(0).evaluate((el) => Array.from(el.options).map(o => o.textContent.trim()));
    expect(firstOptionTexts).toContain('A. institution');

    // Check numbering 27..31 present near inputs (number badges)
    for (let n = 27; n <= 31; n++) {
      const badge = page.locator(`.cloze-inline-number:has-text("${n}"), .cloze-blank-number:has-text("${n}")`);
      await expect(badge.first()).toBeVisible({ timeout: 2000 });
    }
  });
});
