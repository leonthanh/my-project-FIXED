const { test, expect } = require('@playwright/test');

const teacherUser = {
  id: 7101,
  name: 'E2E Teacher',
  role: 'teacher',
  phone: '0784611179',
  canManageTests: true,
};

test.describe('Summary Completion - Review modal numbering & teacher answers', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((user) => {
      const serialized = JSON.stringify(user);
      localStorage.setItem('user', serialized);
      sessionStorage.setItem('user', serialized);
      sessionStorage.setItem('accessToken', 'e2e.teacher.token');
    }, teacherUser);

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

    await expect(page.getByText('Nội dung - Passage 1')).toBeVisible({ timeout: 15000 });

    const sectionCard = page.locator('.reading-editor-nav-card-section').first();
    await expect(sectionCard).toBeVisible({ timeout: 15000 });
    await sectionCard.click();

    const summaryHeading = page.getByRole('heading', { name: 'Summary Completion' });
    await expect(summaryHeading).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Answers for blanks (use letters A-L, separate variants with |)')).toBeVisible({ timeout: 5000 });

    // Labels should show continuous numbering based on questionNumber (27..31) and values should match the teacher answers
    const expected = ['B','H','L','G','D'];
    for (let i = 0; i < expected.length; i++) {
      const labelNum = 27 + i;
      await expect(page.getByText(`Câu ${labelNum}`, { exact: true })).toBeVisible({ timeout: 2000 });
      await expect(page.getByRole('textbox', { name: 'Ví dụ: B hoặc B|C' }).nth(i)).toHaveValue(expected[i]);
    }
  });
});
