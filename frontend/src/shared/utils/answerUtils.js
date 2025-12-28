// Utilities to normalize and compare short text answers
export function normalizeAnswer(s) {
  if (s === null || s === undefined) return "";
  const str = String(s);
  // NFD + remove diacritics
  // Decompose and remove combining marks
  let withoutDiacritics = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // Map common special letters (Vietnamese đ/Đ -> d)
  withoutDiacritics = withoutDiacritics.replace(/đ/g, "d").replace(/Đ/g, "d");
  // Replace punctuation with space so words remain separated, then collapse
  const removedPunct = withoutDiacritics.replace(/[^\p{L}\p{N}\s]/gu, " ");
  // Collapse spaces and lowercase
  return removedPunct.replace(/\s+/g, " ").trim().toLowerCase();
}

// Levenshtein distance (small input strings only)
export function levenshtein(a, b) {
  const A = String(a);
  const B = String(b);
  const m = A.length;
  const n = B.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = A[i - 1] === B[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

// expected: string or array of accepted answers (strings)
// actual: student provided string
// options: { toleranceRatio } - threshold of allowed edit distance relative to expected length
export function isAnswerCorrect(expected, actual, options = {}) {
  if (actual === null || actual === undefined) return false;
  const toleranceRatio = options.toleranceRatio || 0.17; // allow small typos

  const actualNorm = normalizeAnswer(actual);
  if (!actualNorm) return false;

  const expectedArr = Array.isArray(expected)
    ? expected
    : (expected || "").toString().split(/\s*\|\s*|\s*,\s*|\s*\/\s*/).filter(Boolean);

  for (let e of expectedArr) {
    const eNorm = normalizeAnswer(e);
    if (!eNorm) continue;
    if (eNorm === actualNorm) return true; // exact match
    // accept if student answer contains expected phrase
    if (actualNorm.includes(eNorm) || eNorm.includes(actualNorm)) return true;
    // allow small edit distance proportional to expected length
    const maxDist = Math.max(1, Math.floor(eNorm.length * toleranceRatio));
    const d = levenshtein(eNorm, actualNorm);
    if (d <= maxDist) return true;
    // token match: check intersection of tokens
    const eTokens = new Set(eNorm.split(' '));
    const aTokens = new Set(actualNorm.split(' '));
    const common = [...eTokens].filter(t => aTokens.has(t));
    if (common.length >= Math.min(1, eTokens.size)) return true;
  }

  return false;
}
