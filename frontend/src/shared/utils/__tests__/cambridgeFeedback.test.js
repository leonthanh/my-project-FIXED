import {
  buildCambridgeResponseFeedbackDraftMap,
  countMissingCambridgeResponseFeedback,
  hasAnyVisibleCambridgeFeedback,
  hasResolvedSubmissionFeedback,
  upsertCambridgeResponseFeedback,
} from '../cambridgeFeedback';

describe('cambridgeFeedback utils', () => {
  const responses = [
    { key: 'response_1', label: 'Response 1' },
    { key: 'response_2', label: 'Response 2' },
  ];

  test('keeps structured partial review in pending state', () => {
    const responseFeedback = upsertCambridgeResponseFeedback({
      responseKey: 'response_1',
      feedback: 'Feedback for response 1',
      label: 'Response 1',
    });

    expect(
      hasResolvedSubmissionFeedback({
        responseFeedback,
        pendingManualCount: 1,
        status: 'submitted',
      })
    ).toBe(false);
    expect(countMissingCambridgeResponseFeedback(responses, responseFeedback)).toBe(1);
  });

  test('treats fully reviewed structured feedback and legacy feedback as resolved', () => {
    const responseFeedback = upsertCambridgeResponseFeedback({
      existingValue: upsertCambridgeResponseFeedback({
        responseKey: 'response_1',
        feedback: 'Feedback 1',
        label: 'Response 1',
      }),
      responseKey: 'response_2',
      feedback: 'Feedback 2',
      label: 'Response 2',
    });

    expect(
      hasResolvedSubmissionFeedback({
        responseFeedback,
        pendingManualCount: 0,
        status: 'reviewed',
      })
    ).toBe(true);
    expect(hasAnyVisibleCambridgeFeedback({ responseFeedback })).toBe(true);
    expect(
      hasResolvedSubmissionFeedback({
        feedback: 'Legacy overall feedback',
        status: 'reviewed',
      })
    ).toBe(true);
  });

  test('builds textarea draft maps from structured feedback payloads', () => {
    const responseFeedback = upsertCambridgeResponseFeedback({
      existingValue: upsertCambridgeResponseFeedback({
        responseKey: 'response_1',
        feedback: 'First feedback',
        label: 'Response 1',
      }),
      responseKey: 'response_2',
      feedback: 'Second feedback',
      label: 'Response 2',
    });

    expect(buildCambridgeResponseFeedbackDraftMap(responseFeedback)).toEqual({
      response_1: 'First feedback',
      response_2: 'Second feedback',
    });
  });
});