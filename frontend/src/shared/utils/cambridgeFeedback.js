const isPlainObject = (value) =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const parseJsonIfString = (value) => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const normalizeResponseFeedbackItem = (value) => {
  if (typeof value === 'string') {
    const feedback = value.trim();
    return feedback ? { feedback } : null;
  }

  if (!isPlainObject(value)) {
    return null;
  }

  const feedback = String(value.feedback || '').trim();
  if (!feedback) {
    return null;
  }

  const item = { feedback };

  const feedbackBy = String(value.feedbackBy || '').trim();
  if (feedbackBy) item.feedbackBy = feedbackBy;

  const feedbackAt = String(value.feedbackAt || '').trim();
  if (feedbackAt) item.feedbackAt = feedbackAt;

  const label = String(value.label || '').trim();
  if (label) item.label = label;

  const prompt = String(value.prompt || '').trim();
  if (prompt) item.prompt = prompt;

  const questionType = String(value.questionType || '').trim();
  if (questionType) item.questionType = questionType;

  return item;
};

export const parseCambridgeResponseFeedback = (value) => {
  const parsed = parseJsonIfString(value);
  if (!isPlainObject(parsed) || !isPlainObject(parsed.items)) {
    return null;
  }

  const items = Object.entries(parsed.items).reduce((acc, [key, rawItem]) => {
    const normalizedItem = normalizeResponseFeedbackItem(rawItem);
    if (!normalizedItem) {
      return acc;
    }

    acc[key] = normalizedItem;
    return acc;
  }, {});

  return {
    version: Number(parsed.version) || 1,
    items,
  };
};

export const hasCambridgeStructuredFeedback = (value) =>
  Object.keys(parseCambridgeResponseFeedback(value)?.items || {}).length > 0;

export const getCambridgeResponseFeedbackText = (value, responseKey) =>
  String(parseCambridgeResponseFeedback(value)?.items?.[responseKey]?.feedback || '').trim();

export const buildCambridgeResponseFeedbackDraftMap = (value) =>
  Object.entries(parseCambridgeResponseFeedback(value)?.items || {}).reduce(
    (acc, [key, item]) => ({
      ...acc,
      [key]: item.feedback,
    }),
    {}
  );

export const buildCambridgeResponseFeedbackEntries = (value) =>
  Object.entries(parseCambridgeResponseFeedback(value)?.items || {}).map(
    ([key, item]) => ({
      key,
      ...item,
    })
  );

export const upsertCambridgeResponseFeedback = ({
  existingValue,
  responseKey,
  feedback,
  feedbackBy,
  feedbackAt,
  label,
  prompt,
  questionType,
} = {}) => {
  const normalizedKey = String(responseKey || '').trim();
  if (!normalizedKey) {
    return parseCambridgeResponseFeedback(existingValue);
  }

  const nextFeedback = String(feedback || '').trim();
  const base = parseCambridgeResponseFeedback(existingValue) || {
    version: 1,
    items: {},
  };
  const items = { ...base.items };

  if (!nextFeedback) {
    delete items[normalizedKey];
  } else {
    items[normalizedKey] = normalizeResponseFeedbackItem({
      ...items[normalizedKey],
      feedback: nextFeedback,
      feedbackBy,
      feedbackAt,
      label,
      prompt,
      questionType,
    });
  }

  return Object.keys(items).length
    ? {
        version: 1,
        items,
      }
    : null;
};

export const countMissingCambridgeResponseFeedback = (
  responses = [],
  responseFeedback
) =>
  (Array.isArray(responses) ? responses : []).filter(
    (item) => !getCambridgeResponseFeedbackText(responseFeedback, item?.key)
  ).length;

export const hasAnyVisibleCambridgeFeedback = (submission) =>
  Boolean(String(submission?.feedback || '').trim()) ||
  hasCambridgeStructuredFeedback(submission?.responseFeedback);

export const hasResolvedSubmissionFeedback = (submission) => {
  const explicitStatus = String(submission?.status || '').trim().toLowerCase();

  if (Boolean(String(submission?.feedback || '').trim())) {
    return true;
  }

  if (hasCambridgeStructuredFeedback(submission?.responseFeedback)) {
    const pendingManualCount = Number(submission?.pendingManualCount);
    if (Number.isFinite(pendingManualCount)) {
      return pendingManualCount === 0;
    }
    return explicitStatus === 'reviewed';
  }

  return explicitStatus === 'reviewed' || Boolean(String(submission?.feedbackBy || '').trim());
};