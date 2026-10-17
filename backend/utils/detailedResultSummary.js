const summarizeDetailedResults = (rawResults) => {
  let results = rawResults;
  let parseDepth = 0;

  while (typeof results === 'string' && parseDepth < 2) {
    try {
      results = JSON.parse(results);
    } catch {
      return null;
    }
    parseDepth += 1;
  }

  const entries = Array.isArray(results)
    ? results
    : results && typeof results === 'object'
      ? Object.values(results)
      : [];
  const scoredResults = entries.filter(
    (result) => result && typeof result === 'object' && typeof result.isCorrect === 'boolean'
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

module.exports = { summarizeDetailedResults };
