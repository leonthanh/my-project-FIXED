export const parseJsonValue = (rawValue) => {
  let value = rawValue;
  let parseDepth = 0;

  while (typeof value === "string" && parseDepth < 2) {
    try {
      value = JSON.parse(value);
    } catch {
      return value;
    }
    parseDepth += 1;
  }

  return value;
};

export const summarizeDetailedResults = (rawResults) => {
  const results = parseJsonValue(rawResults);
  const entries = Array.isArray(results)
    ? results
    : results && typeof results === "object"
      ? Object.values(results)
      : [];
  const scoredResults = entries.filter(
    (result) => result && typeof result === "object" && typeof result.isCorrect === "boolean"
  );

  if (!scoredResults.length) return null;

  const correct = scoredResults.filter((result) => result.isCorrect).length;
  const total = scoredResults.length;

  return {
    correct,
    wrong: total - correct,
    total,
    percentage: Math.round((correct / total) * 100),
  };
};
