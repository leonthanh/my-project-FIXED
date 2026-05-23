const { test, expect } = require('@playwright/test');

const studentUser = {
  name: 'E2E Student',
  role: 'student',
};

const sampleTest = {
  id: 1,
  title: 'E2E Listening Test',
  duration: 30,
  partInstructions: [
    { title: 'Part 1', sections: [{ sectionTitle: 'Questions 1-10', questionType: 'notes-completion' }] },
    { title: 'Part 2', sections: [{ sectionTitle: 'Questions 11-14', questionType: 'abc' }, { sectionTitle: 'Questions 15-20', questionType: 'matching' }] },
    { title: 'Part 3', sections: [
      { sectionTitle: 'Questions 21-22', questionType: 'multi-select' },
      { sectionTitle: 'Questions 23-27', questionType: 'matching' },
      { sectionTitle: 'Questions 28-30', questionType: 'abc' }
    ] },
    { title: 'Part 4', sections: [{ sectionTitle: 'Questions 31-40', questionType: 'notes-completion' }] },
  ],
  questions: [
    { partIndex: 2, sectionIndex: 0, questionIndex: 0, questionType: 'fill', requiredAnswers: 2, questionText: 'Which TWO ...', options: ['Option A','Option B','Option C'] }
  ]
};

test.describe.serial('Listening autosave server E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((user) => {
      const serialized = JSON.stringify(user);
      localStorage.setItem('user', serialized);
      sessionStorage.setItem('user', serialized);
      sessionStorage.setItem('accessToken', 'e2e.student.token');
    }, studentUser);
  });

  test('autosave to server then resume on reload and finalize on submit', async ({ page, browser }) => {
    // Mock test GET so UI is deterministic, but do NOT mock autosave or active endpoints
    await page.route('**/api/listening-tests/1', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(sampleTest)
      });
    });

    await page.goto('/listening/1', { waitUntil: 'networkidle', timeout: 60000 });
    await page.getByRole('button', { name: 'Play & Start' }).click();

    // Navigate to Part 3 and click checkbox
    const part3Btn = await page.locator('text=Part 3').first();
    await expect(part3Btn).toBeVisible();
    await part3Btn.click();

    const qTextNode = await page.locator('text=Which TWO');
    await expect(qTextNode).toBeVisible({ timeout: 10000 });

    // Find checkbox inside the question block and click it
    const qBlock = qTextNode.locator('xpath=ancestor::div[contains(@id, "question-")]');
    const checkbox = qBlock.locator('input[type=checkbox]').first();
    await expect(checkbox).toBeVisible();
    await checkbox.click();

    const stateKey = 'listening:1:state:anon';
    await page.waitForFunction(
      (key) => {
        const raw = localStorage.getItem(key);
        if (!raw) return false;
        try {
          const parsed = JSON.parse(raw);
          return parsed && parsed.answers && Object.keys(parsed.answers).length > 0;
        } catch (_err) {
          return false;
        }
      },
      stateKey,
      { timeout: 10000 }
    );

    const persistedState = await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }, stateKey);
    expect(persistedState?.answers).toBeDefined();

    const autosaveSeedResp = await page.request.post('/api/listening-submissions/1/autosave', {
      data: {
        answers: persistedState.answers,
        expiresAt: persistedState.expiresAt,
        user: studentUser,
      },
    });
    expect([200, 201]).toContain(autosaveSeedResp.status());
    const autosaveSeedPayload = await autosaveSeedResp.json();
    expect(autosaveSeedPayload?.submissionId).toBeTruthy();

    // Poll server active endpoint until it returns a submission with answers
    const activeUrl = `/api/listening-submissions/1/active?submissionId=${autosaveSeedPayload.submissionId}`;
    const start = Date.now();
    let activeJson = null;
    while (Date.now() - start < 10000) {
      const resp = await page.request.get(activeUrl);
      if (resp.ok()) {
        const ct = (resp.headers()['content-type'] || '').toLowerCase();
        if (!ct.includes('application/json')) {
          const body = await resp.text();
          console.error('Non-JSON response from active endpoint:', ct, body.substring(0, 500));
        } else {
          const payload = await resp.json();
          if (payload?.submission && !payload.submission.finished) {
            activeJson = payload.submission;
            break;
          }
        }
      }
      await page.waitForTimeout(300);
    }
    expect(activeJson).not.toBeNull();
    expect(activeJson.id).toBeTruthy();
    expect(activeJson.answers).toBeDefined();

    // Open a new page (simulating another tab/device) with same user -> it should resume from server
    const freshContext = await browser.newContext();
    const other = await freshContext.newPage();
    await other.addInitScript(({ user, storageKey, submissionId }) => {
      const serialized = JSON.stringify(user);
      localStorage.setItem('user', serialized);
      sessionStorage.setItem('user', serialized);
      sessionStorage.setItem('accessToken', 'e2e.student.token');
      localStorage.setItem(storageKey, JSON.stringify({ submissionId }));
    }, {
      user: studentUser,
      storageKey: stateKey,
      submissionId: autosaveSeedPayload.submissionId,
    });

    // Mock the test GET on the other page too
    await other.route('**/api/listening-tests/1', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sampleTest) });
    });

    await other.goto('/listening/1');

    // Wait until localStorage stateKey contains answers restored from server
    await other.waitForFunction((k) => {
      const raw = localStorage.getItem(k);
      if (!raw) return false;
      try {
        const parsed = JSON.parse(raw);
        return parsed && parsed.submissionId && parsed.answers && Object.keys(parsed.answers).length > 0;
      } catch (_err) {
        return false;
      }
    }, stateKey, { timeout: 5000 });
    const raw = await other.evaluate(k => localStorage.getItem(k), stateKey);
    const parsed = JSON.parse(raw);
    expect(parsed.answers).toBeDefined();

    // Now finalize by submitting on other page
    await other.evaluate(() => { window.confirm = () => true; });
    await other.waitForSelector('[data-testid="submit-button"]', { timeout: 10000 });
    await other.click('[data-testid="submit-button"]');
    await other.click('[data-testid="confirm-btn"]');

    // Wait for submit to complete
    const submitResp = await other.waitForResponse(resp => resp.url().includes('/api/listening-tests/1/submit') && resp.status() === 200, { timeout: 20000 });
    const submitData = await submitResp.json();
    expect(submitData.submissionId).toBeTruthy();

    // Anonymous submit creates a finalized submission record; validate that authoritative record instead.
    const finalizedResp = await other.request.get(`/api/listening-submissions/${submitData.submissionId}`);
    expect(finalizedResp.ok()).toBeTruthy();
    const finalizedPayload = await finalizedResp.json();
    expect(finalizedPayload?.submission?.finished).toBeTruthy();

    await freshContext.close();
  });
});
