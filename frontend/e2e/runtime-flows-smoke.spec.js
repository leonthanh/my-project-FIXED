const { test, expect } = require('@playwright/test');

const studentUser = {
  id: 9001,
  name: 'Smoke Student',
  role: 'student',
  phone: '0900000001',
};

const ixReadingTest = {
  id: '9101',
  title: 'Smoke IX Reading',
  durationMinutes: 1,
  passages: [
    {
      index: 1,
      passageTitle: 'Passage 1',
      questions: [
        {
          type: 'multiple-choice',
          questionText: 'What is the correct answer?',
          options: ['A', 'B'],
          correctAnswer: 'A',
        },
      ],
    },
  ],
};

const ixListeningTest = {
  id: '9201',
  title: 'Smoke IX Listening',
  duration: 1,
  partInstructions: [
    {
      title: 'Part 1',
      sections: [
        {
          sectionTitle: 'Questions 1-1',
          questionType: 'multiple-choice',
        },
      ],
    },
  ],
  partAudioUrls: [null],
  questions: [
    {
      partIndex: 0,
      sectionIndex: 0,
      questionIndex: 0,
      questionType: 'multiple-choice',
      questionText: 'Choose the correct option.',
      options: ['A', 'B'],
      correctAnswer: 'A',
    },
  ],
};

const cambridgeReadingTest = {
  id: '9301',
  title: 'Smoke Cambridge Reading',
  testType: 'ket-reading',
  duration: 1,
  parts: [
    {
      title: 'Part 1',
      instruction: 'Choose the correct answer.',
      sections: [
        {
          questionType: 'multiple-choice',
          questions: [
            {
              questionType: 'multiple-choice',
              questionText: 'Question 1',
              options: ['A', 'B'],
              correctAnswer: 'A',
            },
          ],
        },
      ],
    },
  ],
};

const cambridgeListeningTest = {
  id: '9401',
  title: 'Smoke Cambridge Listening',
  testType: 'ket-listening',
  parts: [
    {
      title: 'Part 1',
      audioUrl: '/smoke-audio.mp3',
      instruction: 'Choose the correct answer.',
      sections: [
        {
          questionType: 'multiple-choice',
          questions: [
            {
              questionType: 'multiple-choice',
              questionText: 'Question 1',
              options: ['A', 'B'],
              correctAnswer: 'A',
            },
          ],
        },
      ],
    },
  ],
};

const cambridgeListeningSubmission = {
  id: 'cambridge-listening-smoke-sub',
  submissionId: 'cambridge-listening-smoke-sub',
  testId: '9401',
  testType: 'ket-listening',
  testTitle: 'Smoke Cambridge Listening',
  score: 1,
  total: 1,
  percentage: 100,
  correct: 1,
  incorrect: 0,
  answers: { smoke: 'A' },
  detailedResults: {
    smoke: { isCorrect: true, userAnswer: 'A', correctAnswer: 'A' },
  },
  submittedAt: '2026-01-23T10:00:00.000Z',
};

function fulfillJson(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function primeLocalStorage(page, entries) {
  await page.goto('/');
  await page.evaluate((pairs) => {
    for (const [key, value] of Object.entries(pairs)) {
      localStorage.setItem(key, value);
    }
  }, entries);
}

test.describe.serial('Runtime smoke flows', () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript((user) => {
      localStorage.setItem('user', JSON.stringify(user));
      sessionStorage.setItem('user', JSON.stringify(user));
      sessionStorage.setItem('accessToken', 'smoke.token.value');
    }, studentUser);
  });

  test('IX Reading start, submit, result, and time-up flow', async ({ page, context }) => {
    await context.route('**/api/reading-tests/9101', (route) => fulfillJson(route, ixReadingTest));
    await context.route('**/api/reading-submissions/9101/active**', (route) => fulfillJson(route, { submission: null }));
    await context.route('**/api/reading-tests/9101/submit', (route) =>
      fulfillJson(route, {
        submissionId: 'ix-reading-smoke-sub',
        total: 1,
        correct: 1,
        scorePercentage: 100,
        band: 9,
      })
    );

    await page.goto('/reading/9101');
    await expect(page.getByText('Start test')).toBeVisible({ timeout: 20000 });
    await page.getByRole('button', { name: 'Start test' }).click();

    await expect(page.getByTestId('submit-button')).toBeVisible({ timeout: 20000 });
    await page.getByTestId('submit-button').click();
    await expect(page.getByText('Submit reading test?')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('confirm-btn').click();
    await expect(page.getByTestId('result-band')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Reading Results')).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).last().click();

    const timeoutPage = await context.newPage();
    await primeLocalStorage(timeoutPage, {
      [`reading_test_9101_started:${studentUser.id}`]: 'true',
      [`reading_test_9101_expiresAt:${studentUser.id}`]: String(Date.now() - 5 * 60 * 1000),
      [`reading_test_9101_answers:${studentUser.id}`]: JSON.stringify({ q_1: 'A' }),
    });

    await timeoutPage.goto('/reading/9101');
    await expect(timeoutPage.getByTestId('result-band')).toBeVisible({ timeout: 10000 });
  });

  test('IX Listening start, submit, result, and time-up flow', async ({ page, context }) => {
    await context.route('**/api/listening-tests/9201', (route) => fulfillJson(route, ixListeningTest));
    await context.route('**/api/listening-submissions/9201/active**', (route) => fulfillJson(route, { submission: null }));
    await context.route('**/api/listening-tests/9201/submit', (route) =>
      fulfillJson(route, {
        total: 1,
        correct: 1,
        scorePercentage: 100,
        band: 9,
      })
    );

    await page.goto('/listening/9201');
    await expect(page.getByText('Play & Start')).toBeVisible({ timeout: 20000 });
    await page.getByRole('button', { name: 'Play & Start' }).click();

    await expect(page.locator('input[type="radio"]').first()).toBeVisible({ timeout: 10000 });
    await page.locator('input[type="radio"]').first().check();

    await expect(page.getByTestId('submit-button')).toBeVisible({ timeout: 20000 });
    await page.getByTestId('submit-button').click();
    await expect(page.getByText('Submit listening test?')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('confirm-btn').click();
    await expect(page.getByText('Listening Results')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('result-band')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Close' }).last().click();

    const timeoutPage = await context.newPage();
    await primeLocalStorage(timeoutPage, {
      [`listening:9201:expiresAt:${studentUser.id}`]: String(Date.now() - 5 * 60 * 1000),
      [`listening:9201:state:${studentUser.id}`]: JSON.stringify({
        started: true,
        answers: { smoke_answer: 'A' },
        submissionId: 'draft-listening-smoke',
        expiresAt: Date.now() - 5 * 60 * 1000,
      }),
    });

    await timeoutPage.goto('/listening/9201');
    await expect(timeoutPage.getByText('Listening Results')).toBeVisible({ timeout: 10000 });
    await expect(timeoutPage.getByTestId('result-band')).toBeVisible({ timeout: 10000 });
  });

  test('Cambridge Reading start, submit, result, and time-up flow', async ({ page, context }) => {
    await context.route('**/api/cambridge/reading-tests/9301', (route) => fulfillJson(route, cambridgeReadingTest));
    await context.route('**/api/cambridge/submissions/active**', (route) => fulfillJson(route, { submission: null }));
    await context.route('**/api/cambridge/reading-tests/9301/submit', (route) =>
      fulfillJson(route, {
        score: 1,
        total: 1,
        percentage: 100,
        detailedResults: {
          smoke: { isCorrect: true, userAnswer: 'A', correctAnswer: 'A' },
        },
      })
    );

    await page.goto('/cambridge/ket-reading/9301');
    await expect(page.getByText('Start test')).toBeVisible({ timeout: 20000 });
    await page.getByRole('button', { name: 'Start test' }).click();

    await expect(page.getByTestId('submit-button')).toBeVisible({ timeout: 20000 });
    await page.getByTestId('submit-button').click();
    await expect(page.getByText('Submit Cambridge Reading?')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('confirm-btn').click();
    await expect(page.getByRole('heading', { name: /Test Results/ }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('1/1 points')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Close' }).last().click();

    const timeoutPage = await context.newPage();
    await primeLocalStorage(timeoutPage, {
      [`cambridge_reading_9301_started:${studentUser.id}`]: 'true',
      [`cambridge_reading_9301_expiresAt:${studentUser.id}`]: String(Date.now() - 5 * 60 * 1000),
      [`cambridge_reading_9301_answers:${studentUser.id}`]: JSON.stringify({ smoke: 'A' }),
    });

    await timeoutPage.goto('/cambridge/ket-reading/9301');
    await expect(timeoutPage.getByRole('heading', { name: /Test Results/ }).first()).toBeVisible({ timeout: 10000 });
    await expect(timeoutPage.getByText('1/1 points')).toBeVisible({ timeout: 10000 });
  });

  test('Cambridge Listening start, submit, result page, and time-up flow', async ({ page, context }) => {
    await context.route('**/api/cambridge/listening-tests/9401', (route) => fulfillJson(route, cambridgeListeningTest));
    await context.route('**/api/cambridge/submissions/active**', (route) => fulfillJson(route, { submission: null }));
    await context.route('**/smoke-audio.mp3', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        body: '',
      })
    );
    await context.route('**/api/cambridge/submissions/cambridge-listening-smoke-sub', (route) =>
      fulfillJson(route, cambridgeListeningSubmission)
    );
    await context.route('**/api/cambridge/listening-tests/9401/submit', (route) =>
      fulfillJson(route, {
        ...cambridgeListeningSubmission,
      })
    );

    await page.goto('/cambridge/ket-listening/9401');
    await expect(page.getByText('Play & Start')).toBeVisible({ timeout: 20000 });
    await page.getByRole('button', { name: 'Play & Start' }).click();

    await expect(page.getByTestId('submit-button')).toBeVisible({ timeout: 20000 });
    await page.getByTestId('submit-button').click();
    await expect(page.getByText('Submit Cambridge Listening?')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('confirm-btn').click();
    await expect(page).toHaveURL(/\/cambridge\/result\/cambridge-listening-smoke-sub/, { timeout: 10000 });
    await expect(page.getByText('Orange Test Results')).toBeVisible({ timeout: 10000 });

    const timeoutPage = await context.newPage();
    await primeLocalStorage(timeoutPage, {
      [`cambridgeListeningProgress-ket-listening-9401-${studentUser.id}`]: JSON.stringify({
        testStarted: true,
        answers: { smoke: 'A' },
        endTime: Date.now() - 5 * 60 * 1000,
        submissionId: 'draft-cambridge-listening-smoke',
      }),
    });

    await timeoutPage.goto('/cambridge/ket-listening/9401');
    await expect(timeoutPage).toHaveURL(/\/cambridge\/result\/cambridge-listening-smoke-sub/, { timeout: 10000 });
    await expect(timeoutPage.getByText('Orange Test Results')).toBeVisible({ timeout: 10000 });
  });
});