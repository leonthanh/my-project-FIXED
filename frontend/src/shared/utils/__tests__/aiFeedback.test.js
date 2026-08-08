import {
  buildAiDraftStorageKey,
  buildAiFeedbackStatus,
  clearAiDraftFromStorage,
  getAiFallbackRateLimitMessage,
  getAiRequestErrorMessage,
  getAiSourceMeta,
  getAiStatusStyle,
  loadAiDraftFromStorage,
  mergeAiSuggestionText,
  saveAiDraftToStorage,
} from "../aiFeedback";

describe("aiFeedback utils", () => {
  test("maps backend 429 with retry hint", () => {
    const message = getAiRequestErrorMessage(429, {
      rateLimitSource: "backend:ai-feedback",
      limiter: "ai-feedback",
      retryAfterSeconds: 3,
    });

    expect(message).toContain("ai-feedback");
    expect(message).toContain("3s");
  });

  test("maps upstream 429 provider label", () => {
    const message = getAiRequestErrorMessage(429, {
      rateLimitSource: "upstream:openai",
    });

    expect(message).toBe("Openai returned 429 Too Many Requests.");
  });

  test("returns fallback rate-limit helper message", () => {
    const message = getAiFallbackRateLimitMessage({
      fallback: true,
      rateLimitSource: "upstream:gemini",
    });

    expect(message).toContain("Gemini returned 429");
  });

  test("builds warning status for fallback payload", () => {
    const status = buildAiFeedbackStatus({
      fallback: true,
      warning: "Fallback draft generated.",
    });

    expect(status.tone).toBe("warning");
    expect(status.text).toBe("Fallback draft generated.");
    expect(status.sourceLabel).toBe("Fallback");
  });

  test("builds info status for gemini shared payload", () => {
    const status = buildAiFeedbackStatus({
      source: "gemini",
      shared: true,
      upstreamProvider: "openai",
      upstreamStatus: 429,
    });

    expect(status.tone).toBe("info");
    expect(status.text).toContain("OpenAI returned 429");
  });

  test("returns default success status", () => {
    const status = buildAiFeedbackStatus({});
    expect(status.tone).toBe("success");
    expect(status.text).toBe("AI draft generated successfully.");
    expect(status.sourceLabel).toBe("OpenAI");
  });

  test("resolves status style by tone", () => {
    const style = getAiStatusStyle("error");
    expect(style.color).toBe("#991b1b");
  });

  test("resolves source meta for gemini", () => {
    const source = getAiSourceMeta({ source: "gemini" });
    expect(source.sourceLabel).toBe("Gemini");
  });

  test("merges AI suggestion in append mode", () => {
    const merged = mergeAiSuggestionText("Teacher intro", "New AI draft", true);
    expect(merged).toContain("Teacher intro");
    expect(merged).toContain("---");
    expect(merged).toContain("New AI draft");
  });

  test("saves and restores local draft", () => {
    const submissionId = "unit-1";
    saveAiDraftToStorage(submissionId, {
      feedback: "Draft feedback",
      teacherName: "Teacher A",
      bandTask1: "6",
      bandTask2: "6.5",
      appendAiMode: true,
    });

    const restored = loadAiDraftFromStorage(submissionId);
    expect(restored.feedback).toBe("Draft feedback");
    expect(restored.teacherName).toBe("Teacher A");
    expect(restored.bandTask1).toBe("6");
    expect(restored.bandTask2).toBe("6.5");
    expect(restored.appendAiMode).toBe(true);
  });

  test("clears local draft", () => {
    const submissionId = "unit-2";
    saveAiDraftToStorage(submissionId, {
      feedback: "To be cleared",
    });

    clearAiDraftFromStorage(submissionId);
    expect(window.localStorage.getItem(buildAiDraftStorageKey(submissionId))).toBeNull();
  });
});
