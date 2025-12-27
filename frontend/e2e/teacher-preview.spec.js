const { test, expect } = require('@playwright/test');

test.describe('Teacher Preview (show answers & correctness)', () => {
  test.beforeEach(async ({ page }) => {
    // Make user a teacher so editor & Preview button are available
    await page.addInitScript(() => {
      localStorage.setItem('user', JSON.stringify({ name: 'E2E Teacher', role: 'teacher' }));
    });

    // Log console messages and page errors to help debugging
    page.on('console', msg => console.log('PAGE LOG', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR', err && err.message));
  });

  test('preview modal shows correct answers and fuzzy-correctness for short answer', async ({ page }) => {
    // Mock reading test GET response with predictable questions
    await page.route('**/api/reading-tests/1', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '1',
          title: 'Teacher Preview Test',
          passages: [
            {
              index: 1,
              passageTitle: 'Passage 1',
              sections: [
                {
                  sectionTitle: 'Section 1',
                  questions: [
                    {
                      type: 'multiple-choice',
                      questionText: 'Choose the correct option',
                      options: ['A', 'B', 'C'],
                      correctAnswer: 'A'
                    },
                    {
                      type: 'short-answer',
                      questionText: 'Capital of Vietnam',
                      correctAnswer: 'Hà Nội'
                    }
                  ]
                }
              ]
            }
          ]
        }),
      });
    });

    // Try editor create route where preview is also available
    await page.goto('/admin/create-reading');

    // Click Preview button (title attr used in markup)
    const previewBtn = page.locator('button[title="Xem trước (Preview)"]');
    await expect(previewBtn).toBeVisible({ timeout: 10000 });
    console.log('previewBtn count', await previewBtn.count());
    console.log('previewBtn outerHTML', await previewBtn.first().evaluate(e => e.outerHTML));
    // Force click in case element is covered by overlay
    await previewBtn.first().click({ force: true });

    // As a fallback, press the Preview keyboard shortcut (Ctrl+P) which also triggers preview
    await page.keyboard.press('Control+P');

    // Wait for modal header
    // Wait for modal to appear (close button visible)
    await page.waitForSelector('button:has-text("✕")', { timeout: 10000 });

    // Debug: dump short snippet of page content so we can inspect DOM in CI logs
    const html = await page.content();
    console.log('PAGE HTML (start):', html.slice(0, 2000));

    // List checkboxes on page for debugging
    const checkboxCount = await page.locator('input[type="checkbox"]').count();
    console.log('checkboxCount', checkboxCount);
    for (let i = 0; i < checkboxCount; i++) {
      const label = await page.locator('input[type="checkbox"]').nth(i).locator('..').innerText().catch(() => 'no parent text');
      console.log('checkbox', i, 'parent text:', label);
    }

    // Toggle "Hiển thị đáp án" checkbox (try first checkbox on modal)
    const firstCheckbox = page.locator('input[type="checkbox"]').first();
    await expect(firstCheckbox).toBeVisible({ timeout: 10000 });
    await firstCheckbox.check();

    // For multiple-choice the correct option should show a badge "✓ Đáp án đúng"
    await expect(page.locator('text=✓ Đáp án đúng')).toBeVisible({ timeout: 5000 });

    // For short-answer a teacher-facing line should show the correct answer
    await expect(page.locator('text=Đáp án: Hà Nội')).toBeVisible({ timeout: 5000 });

    // Now type a fuzzy-correct student answer (no diacritics) and ensure correctness shows ✓ Chính xác!
    const shortInput = page.locator('input[placeholder="Nhập câu trả lời..."]');
    await expect(shortInput).toBeVisible();
    await shortInput.fill('Ha Noi');

    // The correctness indicator should update
    await expect(page.locator('text=✓ Chính xác!')).toBeVisible({ timeout: 3000 });
  });
});
