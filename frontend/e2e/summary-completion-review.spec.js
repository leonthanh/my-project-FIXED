const { test, expect } = require('@playwright/test');

test.describe('Summary Completion - Review modal numbering & teacher answers', () => {
  test.beforeEach(async ({ page }) => {
    // Make user a teacher so editor & Review button are available
    await page.addInitScript(() => {
      // Use privileged teacher so ProtectedRoute(role='teacher') passes and canManageCategory returns true
      localStorage.setItem('user', JSON.stringify({ name: 'E2E Teacher', role: 'teacher', phone: '0784611179' }));
    });

    // Log page errors to the terminal for debugging
    page.on('console', msg => console.log('PAGE LOG', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR', err && err.message));
  });

  test('review modal shows continuous numbering and teacher answers for summary-completion', async ({ page }) => {
    // Mock reading test GET response for edit page with a summary-completion question numbered 27-31
    await page.route('**/api/reading-tests/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '1',
          title: 'Summary Preview Test',
          passages: [
            {
              index: 1,
              id: 'p1',
              passageTitle: 'Passage 1',
              passageText: 'First blank [BLANK] second blank [BLANK] third blank [BLANK] fourth blank [BLANK] fifth blank [BLANK]',
              sections: [
                {
                  id: 's1',
                  sectionTitle: 'Section 1',
                  questions: [
                    {
                      id: 'q1',
                      questionNumber: '27-31',
                      questionType: 'summary-completion',
                      questionText: 'First blank [BLANK] second blank [BLANK] third blank [BLANK] fourth blank [BLANK] fifth blank [BLANK]',
                      options: ['institution','mass production','mechanical processes','public','paints','artist','size','underlying ideas','basic technology','readers','picture frames','assistants'],
                      blanks: [
                        { correctAnswer: 'B' },
                        { correctAnswer: 'H' },
                        { correctAnswer: 'L' },
                        { correctAnswer: 'G' },
                        { correctAnswer: 'D' }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        })
      });
    });

    // Open the editor on the Edit page so the mocked GET is used
    await page.goto('/reading-tests/1/edit');
    // Debug: log a short snapshot of page HTML to help diagnose missing elements
    const html = await page.content();
    console.log('PAGE HTML (snippet):', html.slice(0, 4000));

    // Wait for editor content from mocked test to render (give more time for hydration)
    await expect(page.locator('text=Passage 1')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Section 1')).toBeVisible({ timeout: 15000 });

    // Find the summary-completion question header in the editor and expand it (if collapsed)
    // Find the collapsed question header by its display label (English) and expand it
    const summaryHeader = page.locator('text=Summary Completion').first();
    await expect(summaryHeader).toBeVisible({ timeout: 5000 });
    // Click to expand the question editor
    await summaryHeader.click();

    // Wait for the teacher answers area to appear (use Vietnam label 'Câu' which we render)
    await expect(page.locator('text=Câu 27')).toBeVisible({ timeout: 5000 });

    // Labels should show continuous numbering based on questionNumber (27..31) and inputs contain values
    const expected = ['B','H','L','G','D'];
    for (let i = 0; i < expected.length; i++) {
      const labelNum = 27 + i;
      await expect(page.locator(`text=Câu ${labelNum}`)).toBeVisible({ timeout: 2000 });

      // the input next to the label should contain the teacher answer we prefilled
      const inputLocator = page.locator(`xpath=//div[text()="Câu ${labelNum}"]/following-sibling::input[1]`);
      await expect(inputLocator).toHaveValue(expected[i], { timeout: 2000 });
    }
  });
});
