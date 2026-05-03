const {
  getCambridgeResponseFeedbackText,
  hasCambridgeResponseFeedback,
  parseCambridgeResponseFeedback,
  upsertCambridgeResponseFeedback,
} = require('../modules/cambridge/shared/feedbackUtils');
const { countPendingManualAnswers } = require('../modules/cambridge/shared/submissionUtils');

describe('Cambridge response feedback helpers', () => {
  const buildSubmission = (overrides = {}) => ({
    status: 'submitted',
    feedback: null,
    feedbackBy: null,
    responseFeedback: null,
    finished: true,
    detailedResults: {
      response_1: {
        isCorrect: null,
        userAnswer: 'First answer',
      },
      response_2: {
        isCorrect: null,
        userAnswer: 'Second answer',
      },
      mc_3: {
        isCorrect: true,
        userAnswer: 'A',
      },
    },
    ...overrides,
  });

  test('parses structured response feedback and reads feedback by key', () => {
    const parsed = parseCambridgeResponseFeedback({
      version: 1,
      items: {
        response_1: {
          feedback: 'Task 1 feedback',
          label: 'Response 1',
        },
      },
    });

    expect(parsed).toEqual({
      type: 'cambridge-response-feedback',
      version: 1,
      items: {
        response_1: {
          feedback: 'Task 1 feedback',
          label: 'Response 1',
        },
      },
    });
    expect(getCambridgeResponseFeedbackText(parsed, 'response_1')).toBe('Task 1 feedback');
    expect(hasCambridgeResponseFeedback(parsed)).toBe(true);
  });

  test('upserts per-response feedback while preserving other responses', () => {
    const withFirst = upsertCambridgeResponseFeedback({
      responseKey: 'response_1',
      feedback: 'Feedback 1',
      label: 'Response 1',
      feedbackBy: 'Teacher A',
    });
    const withSecond = upsertCambridgeResponseFeedback({
      existingValue: withFirst,
      responseKey: 'response_2',
      feedback: 'Feedback 2',
      label: 'Response 2',
      feedbackBy: 'Teacher A',
    });

    expect(withSecond.items.response_1.feedback).toBe('Feedback 1');
    expect(withSecond.items.response_2.feedback).toBe('Feedback 2');
  });

  test('counts only unresolved open-ended responses when structured response feedback is partial', () => {
    const responseFeedback = upsertCambridgeResponseFeedback({
      responseKey: 'response_1',
      feedback: 'Good first task',
      label: 'Response 1',
    });

    expect(
      countPendingManualAnswers(
        buildSubmission({ responseFeedback })
      )
    ).toBe(1);
  });

  test('treats legacy overall feedback as fully reviewed for backward compatibility', () => {
    expect(
      countPendingManualAnswers(
        buildSubmission({
          feedback: 'Legacy overall feedback',
          feedbackBy: 'Teacher A',
          status: 'reviewed',
        })
      )
    ).toBe(0);
  });
});