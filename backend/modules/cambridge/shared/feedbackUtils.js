const isPlainObject = (value) =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const RESPONSE_FEEDBACK_TYPE = 'cambridge-response-feedback';
const RESPONSE_FEEDBACK_VERSION = 1;

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

  const item = {
    feedback,
  };

  const feedbackBy = String(value.feedbackBy || '').trim();
  if (feedbackBy) {
    item.feedbackBy = feedbackBy;
  }

  const feedbackAt = String(value.feedbackAt || '').trim();
  if (feedbackAt) {
    item.feedbackAt = feedbackAt;
  }

  const label = String(value.label || '').trim();
  if (label) {
    item.label = label;
  }

  const prompt = String(value.prompt || '').trim();
  if (prompt) {
    item.prompt = prompt;
  }

  const questionType = String(value.questionType || '').trim();
  if (questionType) {
    item.questionType = questionType;
  }

  return item;
};

const parseCambridgeResponseFeedback = (value) => {
  const parsed = parseJsonIfString(value);

  if (!isPlainObject(parsed) || !isPlainObject(parsed.items)) {
    return null;
  }

  const items = Object.entries(parsed.items).reduce((acc, [key, itemValue]) => {
    const normalizedItem = normalizeResponseFeedbackItem(itemValue);
    if (!normalizedItem) {
      return acc;
    }

    acc[key] = normalizedItem;
    return acc;
  }, {});

  return {
    type: RESPONSE_FEEDBACK_TYPE,
    version: Number(parsed.version) || RESPONSE_FEEDBACK_VERSION,
    items,
  };
};

const hasCambridgeResponseFeedback = (value) =>
  Object.keys(parseCambridgeResponseFeedback(value)?.items || {}).length > 0;

const getCambridgeResponseFeedbackText = (value, responseKey) =>
  String(parseCambridgeResponseFeedback(value)?.items?.[responseKey]?.feedback || '').trim();

const upsertCambridgeResponseFeedback = ({
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
    type: RESPONSE_FEEDBACK_TYPE,
    version: RESPONSE_FEEDBACK_VERSION,
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
        type: RESPONSE_FEEDBACK_TYPE,
        version: RESPONSE_FEEDBACK_VERSION,
        items,
      }
    : null;
};

module.exports = {
  RESPONSE_FEEDBACK_TYPE,
  RESPONSE_FEEDBACK_VERSION,
  getCambridgeResponseFeedbackText,
  hasCambridgeResponseFeedback,
  parseCambridgeResponseFeedback,
  upsertCambridgeResponseFeedback,
};