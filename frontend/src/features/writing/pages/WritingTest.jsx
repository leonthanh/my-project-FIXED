import React, { useState, useEffect, useCallback, useRef } from "react";
import Split from "react-split";
import {
  apiPath,
  hostPath,
  redirectInApp,
  redirectToLogin,
  clearAuth,
  getStoredUser,
  hasStoredSession,
} from "../../../shared/utils/api";
import {
  formatClock,
  getExtensionToastMessage,
  getGraceRemainingSeconds,
  getRemainingSeconds,
  toTimestamp,
} from "../../../shared/utils/testTiming";
import ExtensionToast from "../../../shared/components/ExtensionToast";
import TestStartModal from "../../../shared/components/TestStartModal";
import InlineIcon from "../../../shared/components/InlineIcon.jsx";
import "./WritingTest.css";

const SERVER_AUTOSAVE_INTERVAL_MS = 30000;
const SERVER_TIMING_RECONCILE_INTERVAL_MS = 15000;

// ====== STYLE FOR HEADER & MODAL ======
const writingHeaderStyle = {
  background: "linear-gradient(135deg, #0e276f 0%, #1a3a8f 100%)",
  color: "white",
  padding: "0 16px",
  height: 50,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  boxShadow: "0 2px 10px rgba(14, 39, 111, 0.2)",
  fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
  position: "sticky",
  top: 0,
  zIndex: 100,
};
const writingHeaderLeft = { display: "flex", alignItems: "center", gap: 10 };
const writingHeaderRight = { display: "flex", alignItems: "center", gap: 10 };
const writingBadge = {
  background: "linear-gradient(135deg, #e03 0%, #ff6b6b 100%)",
  padding: "4px 10px",
  borderRadius: 12,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 0.5,
};
const writingTimer = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: "rgba(255,255,255,0.15)",
  padding: "0 10px",
  borderRadius: 8,
  backdropFilter: "blur(10px)",
  fontSize: 15,
};
const writingLogoutBtn = {
  background: "#e03",
  color: "#fff",
  border: "none",
  padding: "8px 16px",
  borderRadius: 6,
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 15,
};
const progressRingStyle = {
  width: 40,
  height: 40,
  position: "relative",
  marginLeft: 10,
};
const progressTextStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  textAlign: "center",
  fontSize: 13,
  lineHeight: 1,
  color: "white",
};

const WritingTest = () => {
  // Resolve user ID early so all localStorage keys are per-user (prevents student A
  // seeing student B's draft when logging in on the same device)
  const user = getStoredUser();
  const uid = user?.id || 'anon';
  const writingTask1Key   = `writing_task1:${uid}`;
  const writingTask2Key   = `writing_task2:${uid}`;
  const writingTimeKey    = `writing_timeLeft:${uid}`;
  const writingStartedKey = `writing_started:${uid}`;
  const writingEndAtKey   = `writing_endAt:${uid}`;
  const [task1, setTask1] = useState(
    localStorage.getItem(writingTask1Key) || ""
  );
  const [task2, setTask2] = useState(
    localStorage.getItem(writingTask2Key) || ""
  );
  const [timeLeft, setTimeLeft] = useState(() => {
    const saved = localStorage.getItem(writingTimeKey);
    return saved ? parseInt(saved, 10) : 60 * 60;
  });
  const [endAt, setEndAt] = useState(() => {
    const saved = localStorage.getItem(writingEndAtKey);
    return saved ? parseInt(saved, 10) : 0;
  });
  const [started, setStarted] = useState(
    localStorage.getItem(writingStartedKey) === "true"
  );
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTask, setActiveTask] = useState("task1");
  const [testData, setTestData] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth <= 768 : false);
  const [selectedTestId, setSelectedTestId] = useState(() => localStorage.getItem("selectedTestId") || "");
  const [isHydratingDraft, setIsHydratingDraft] = useState(true);
  const [graceRemaining, setGraceRemaining] = useState(0);
  const [extensionToast, setExtensionToast] = useState("");
  const autoSubmittingRef = useRef(false);
  const lastAnnouncedExpiryRef = useRef(null);

  const syncTimingState = useCallback(
    (expiresAtValue, fallbackSeconds = null) => {
      const expiresAtMs = toTimestamp(expiresAtValue);
      if (Number.isFinite(expiresAtMs)) {
        setEndAt(expiresAtMs);
        try {
          localStorage.setItem(writingEndAtKey, String(expiresAtMs));
        } catch (_err) {
          // ignore storage errors
        }
        setTimeLeft(getRemainingSeconds(expiresAtMs));
        setGraceRemaining(getGraceRemainingSeconds(expiresAtMs));
        return true;
      }

      setEndAt(0);
      setGraceRemaining(0);
      if (fallbackSeconds !== null) {
        setTimeLeft(fallbackSeconds);
      }
      return false;
    },
    [writingEndAtKey]
  );

  const announceExtension = useCallback((nextExpiresAtValue, previousExpiresAtValue) => {
    const nextExpiresAtMs = toTimestamp(nextExpiresAtValue);
    const message = getExtensionToastMessage(previousExpiresAtValue, nextExpiresAtMs);
    const lastAnnouncedMs = toTimestamp(lastAnnouncedExpiryRef.current);

    if (!message || !Number.isFinite(nextExpiresAtMs)) return;
    if (Number.isFinite(lastAnnouncedMs) && Math.abs(lastAnnouncedMs - nextExpiresAtMs) <= 1000) {
      return;
    }

    lastAnnouncedExpiryRef.current = nextExpiresAtMs;
    setExtensionToast(message);
  }, []);

  useEffect(() => {
    if (!extensionToast) return;
    const timeoutId = setTimeout(() => setExtensionToast(""), 4000);
    return () => clearTimeout(timeoutId);
  }, [extensionToast]);

  useEffect(() => {
    localStorage.setItem(writingTask1Key, task1);
  }, [task1, writingTask1Key]);

  useEffect(() => {
    localStorage.setItem(writingTask2Key, task2);
  }, [task2, writingTask2Key]);

  useEffect(() => {
    localStorage.setItem(writingTimeKey, timeLeft.toString());
  }, [timeLeft, writingTimeKey]);

  useEffect(() => {
    localStorage.setItem(writingStartedKey, started.toString());
  }, [started, writingStartedKey]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Guard: redirect to login if not authenticated
  useEffect(() => {
    if (!user || !hasStoredSession()) {
      redirectToLogin({ replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedTestId) return;
    localStorage.setItem("selectedTestId", String(selectedTestId));
  }, [selectedTestId]);

  // Restore latest draft from server so students can continue on another device.
  useEffect(() => {
    let cancelled = false;

    const loadServerDraft = async () => {
      if (!user?.id) {
        setIsHydratingDraft(false);
        return;
      }

      try {
        const storedTestId = localStorage.getItem("selectedTestId") || "";
        const numericTestId = Number(storedTestId);
        const scopedQuery =
          Number.isFinite(numericTestId) && numericTestId > 0
            ? `&testId=${numericTestId}`
            : "";

        const res = await fetch(apiPath(`writing/draft/active?userId=${user.id}${scopedQuery}`));
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        const draft = data?.submission;
        if (!draft) return;

        const draftTestId = Number(draft.testId);
        if (!storedTestId && Number.isFinite(draftTestId) && draftTestId > 0) {
          const nextTestId = String(draftTestId);
          localStorage.setItem("selectedTestId", nextTestId);
          setSelectedTestId(nextTestId);
        }

        setTask1(typeof draft.task1 === "string" ? draft.task1 : "");
        setTask2(typeof draft.task2 === "string" ? draft.task2 : "");

        if (Number.isFinite(Number(draft.timeLeft))) {
          setTimeLeft(Number(draft.timeLeft));
        }

        if (draft.draftEndAt) {
          syncTimingState(draft.draftEndAt);
        }

        if (typeof draft.draftStarted === "boolean") {
          setStarted(Boolean(draft.draftStarted));
        }
      } catch (err) {
        console.error("Error loading writing draft:", err);
      } finally {
        if (!cancelled) setIsHydratingDraft(false);
      }
    };

    loadServerDraft();

    return () => {
      cancelled = true;
    };
  }, [syncTimingState, user?.id]);

  useEffect(() => {
    if (isHydratingDraft) return;
    if (!selectedTestId) {
      setMessage("Cannot find the selected writing test.");
      return;
    }

    const fetchTestData = async () => {
      try {
        const res = await fetch(
          apiPath(`writing-tests/detail/${selectedTestId}`)
        );
        if (!res.ok) {
          throw new Error(`Error ${res.status}: The test could not be found.`);
        }
        const data = await res.json();
        setTestData(data);
      } catch (err) {
        console.error("Failed to load writing test:", err);
        setMessage("Cannot load the writing test. Please go back and choose it again.");
      }
    };

    fetchTestData();
  }, [selectedTestId, isHydratingDraft]);

  const saveDraftToServer = useCallback(async () => {
    if (isHydratingDraft || submitted) return;
    if (!user?.id) return;

    const numericTestId = parseInt(selectedTestId, 10);
    if (!numericTestId || isNaN(numericTestId)) return;

    try {
      const res = await fetch(apiPath("writing/draft/autosave"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId: numericTestId,
          user: {
            id: user.id,
            name: user.name,
            phone: user.phone,
          },
          task1,
          task2,
          timeLeft,
          endAt,
          started,
        }),
      });
      const data = await res.json().catch(() => ({}));
      const nextEndAt = data?.timing?.expiresAt || data?.draftEndAt;
      if (nextEndAt) {
        announceExtension(nextEndAt, endAt);
        syncTimingState(nextEndAt);
      }
    } catch (err) {
      console.error("Error autosaving writing draft:", err);
    }
  }, [announceExtension, isHydratingDraft, submitted, user?.id, user?.name, user?.phone, selectedTestId, task1, task2, timeLeft, endAt, started, syncTimingState]);

  const reconcileServerTiming = useCallback(async () => {
    if (isHydratingDraft || submitted || !started || !user?.id) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;

    const numericTestId = Number(selectedTestId);
    if (!Number.isFinite(numericTestId) || numericTestId <= 0) return;

    try {
      const res = await fetch(apiPath(`writing/draft/active?userId=${user.id}&testId=${numericTestId}`));
      if (!res.ok) return;
      const data = await res.json().catch(() => ({}));
      const nextEndAt = data?.submission?.draftEndAt || data?.timing?.expiresAt;
      const nextEndAtMs = toTimestamp(nextEndAt);
      const currentEndAtMs = toTimestamp(endAt);

      if (
        Number.isFinite(nextEndAtMs) &&
        (!Number.isFinite(currentEndAtMs) || Math.abs(nextEndAtMs - currentEndAtMs) > 1000)
      ) {
        announceExtension(nextEndAtMs, currentEndAtMs);
        syncTimingState(nextEndAtMs);
      }
    } catch (_err) {
      // ignore polling errors; autosave and refresh can still recover timing
    }
  }, [announceExtension, endAt, isHydratingDraft, selectedTestId, started, submitted, syncTimingState, user?.id]);

  useEffect(() => {
    if (isHydratingDraft || submitted) return;
    if (!user?.id || !selectedTestId) return;

    const intervalId = setInterval(() => {
      saveDraftToServer();
    }, SERVER_AUTOSAVE_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        saveDraftToServer();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [isHydratingDraft, submitted, user?.id, selectedTestId, saveDraftToServer]);

  useEffect(() => {
    if (isHydratingDraft || submitted || !started) return;
    if (!user?.id || !selectedTestId) return;

    reconcileServerTiming();
    const intervalId = setInterval(
      reconcileServerTiming,
      SERVER_TIMING_RECONCILE_INTERVAL_MS
    );
    const onCheck = () => {
      if (document.visibilityState !== "hidden") {
        reconcileServerTiming();
      }
    };

    window.addEventListener("focus", onCheck);
    document.addEventListener("visibilitychange", onCheck);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", onCheck);
      document.removeEventListener("visibilitychange", onCheck);
    };
  }, [isHydratingDraft, reconcileServerTiming, selectedTestId, started, submitted, user?.id]);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;

    const numericTestId = parseInt(selectedTestId, 10);
    if (!numericTestId || isNaN(numericTestId)) {
      setMessage("Cannot find a valid test ID to submit.");
      return;
    }

    // Save latest draft once before final submit to minimize data loss on flaky networks.
    try {
      await saveDraftToServer();
    } catch (_err) {
      // Ignore: submit can still proceed; autosave retry exists.
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(apiPath("writing/submit"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task1,
          task2,
          timeLeft,
          user,
          testId: numericTestId,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "The server did not confirm the submission.");
      }

      setSubmitted(true);
      setMessage(data.message || "Submission completed successfully.");

      if (user?.id) {
        fetch(apiPath("writing/draft/clear"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testId: numericTestId,
            user: { id: user.id },
          }),
        }).catch(() => {});
      }

      localStorage.removeItem(writingTask1Key);
      localStorage.removeItem(writingTask2Key);
      localStorage.removeItem(writingTimeKey);
      localStorage.removeItem(writingStartedKey);
      localStorage.removeItem(writingEndAtKey);
      localStorage.removeItem("selectedTestId");

      setTimeout(() => {
        redirectInApp("/select-test", { replace: true });
      }, 3000);
    } catch (err) {
      console.error("Submit writing failed:", err);
      setSubmitted(false);
      setMessage(`Could not submit: ${err?.message || "Submission failed."}`);
      autoSubmittingRef.current = false;
      await saveDraftToServer();
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, selectedTestId, task1, task2, timeLeft, user, writingTask1Key, writingTask2Key, writingTimeKey, writingStartedKey, writingEndAtKey, saveDraftToServer]);

  // keep a stable ref to the submit function so the timer effect doesn't re-run when
  // handleSubmit changes on typing (avoids interval reset)
  const submitRef = useRef(handleSubmit);
  useEffect(() => {
    submitRef.current = handleSubmit;
  }, [handleSubmit]);

  // persist endAt so we can resume after reload
  useEffect(() => {
    if (endAt) {
      localStorage.setItem(writingEndAtKey, endAt.toString());
    } else {
      localStorage.removeItem(writingEndAtKey);
    }
  }, [endAt, writingEndAtKey]);

  // when starting, if we don't already have an endAt, set it using current timeLeft
  useEffect(() => {
    if (started && !endAt) {
      syncTimingState(Date.now() + timeLeft * 1000, timeLeft);
    }
  }, [started, endAt, syncTimingState, timeLeft]);

  // TIMER: dựa trên endAt, không phụ thuộc timeLeft (tránh reset interval khi re-render do typing)
  useEffect(() => {
    if (!started || submitted || isSubmitting || !endAt) return;

    const tick = () => {
      const remain = getRemainingSeconds(endAt);
      const nextGraceRemaining = getGraceRemainingSeconds(endAt);
      setTimeLeft(remain);
      setGraceRemaining(nextGraceRemaining);
      if (
        remain <= 0 &&
        nextGraceRemaining <= 0 &&
        !autoSubmittingRef.current
      ) {
        autoSubmittingRef.current = true;
        if (submitRef.current) submitRef.current();
      }
    };

    // chạy ngay 1 lần để sync UI
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
    // CHÚ Ý: không thêm timeLeft/handleSubmit vào dependency!
  }, [started, submitted, isSubmitting, endAt]);

  const formatTime = (seconds) => formatClock(seconds);

  useEffect(() => {
    if (!user || !user.phone) return;

    fetch(apiPath("writing/list"))
      .then((res) => res.json())
      .then((list) => {
        const last = list.find((item) => item.user?.phone === user.phone);
        if (last) setFeedback(last.feedback || "");
      })
      .catch((err) => console.error("Failed to load teacher feedback:", err));
  }, [submitted, user]);

  const countWords = (text) => text.trim().split(/\s+/).filter(Boolean).length;

  if (message && !testData) {
    return <div style={{ padding: 50 }}>{message}</div>;
  }

  if (!testData) return <div style={{ padding: 50 }}>Loading writing test...</div>;

  if (submitted) {
    return (
      <div style={{ padding: 50 }}>
        <h2>Submission completed</h2>
        <p>{message}</p>

        <div style={{ marginTop: 30 }}>
          <h3 style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><InlineIcon name="writing" size={16} />Task 1:</h3>
          <p
            style={{
              whiteSpace: "pre-line",
              border: "1px solid #ccc",
              padding: 10,
            }}
          >
            {task1}
          </p>
        </div>

        <div style={{ marginTop: 30 }}>
          <h3 style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><InlineIcon name="writing" size={16} />Task 2:</h3>
          <p
            style={{
              whiteSpace: "pre-line",
              border: "1px solid #ccc",
              padding: 10,
            }}
          >
            {task2}
          </p>
        </div>

        {feedback && (
          <div style={{ marginTop: 30 }}>
            <h3>Teacher feedback</h3>
            <p style={{ whiteSpace: "pre-line" }}>{feedback}</p>
          </div>
        )}
      </div>
    );
  }

  // Modal bắt đầu làm bài
  if (!started) {
    const writingStartMinutes =
      Number.isFinite(timeLeft) && timeLeft > 0 ? Math.ceil(timeLeft / 60) : 60;

    return (
      <TestStartModal
        iconName="writing"
        eyebrow="IX Writing"
        subtitle="Writing Test"
        title={testData?.title || "IX Writing"}
        stats={[
          { value: writingStartMinutes, label: "Minutes", tone: "sky" },
          { value: 2, label: "Tasks", tone: "green" },
        ]}
        statsMinWidth={140}
        noticeTitle="Important note"
        noticeContent={
          <>
            The timer starts as soon as you press Start. The system auto-saves both Task 1 and Task 2 while you work, but you should still review your answers before submitting.
          </>
        }
        secondaryLabel="Cancel"
        onSecondary={() => redirectInApp("/select-test", { replace: true })}
        primaryLabel="Start test"
        onPrimary={() => {
          autoSubmittingRef.current = false;
          syncTimingState(Date.now() + timeLeft * 1000, timeLeft);
          setStarted(true);
        }}
        zIndex={9999}
      />
    );
  }

  // Tính progress cho vòng tròn
  const totalWords = countWords(task1) + countWords(task2);
  const minWords = 150 + 250;
  const progress = Math.min(totalWords / minWords, 1);
  // Header đồng bộ với Reading
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <ExtensionToast message={extensionToast} />
      <header style={writingHeaderStyle}>
        <div style={writingHeaderLeft}>
          <div style={writingBadge}>IX</div>
          <span style={{ fontWeight: 600, fontSize: 18 }}>
            IX - WRITING TEST
          </span>
        </div>
        <div style={writingHeaderRight}>
          <div style={writingTimer}>
            <span style={{ marginRight: 4, display: "inline-flex", alignItems: "center" }}><InlineIcon name="clock" size={18} /></span>
            <span
              style={{
                fontWeight: 700,
                fontFamily: "Courier New, monospace",
                fontSize: 18,
              }}
            >
              {formatTime(timeLeft)}
            </span>
            <span style={{ fontSize: 13, marginLeft: 6, opacity: 0.7 }}>
              REMAINING
            </span>
          </div>
          {/* Progress Ring giống Reading */}
          <div style={progressRingStyle}>
            <svg viewBox="0 0 36 36" style={{ width: 40, height: 40 }}>
              <path
                style={{
                  fill: "none",
                  stroke: "rgba(255,255,255,0.2)",
                  strokeWidth: 3,
                }}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                style={{
                  fill: "none",
                  stroke: "#2ecc71",
                  strokeWidth: 3,
                  strokeLinecap: "round",
                }}
                strokeDasharray={`${Math.round(progress * 100)}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div style={progressTextStyle}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>
                {totalWords}
              </span>
              <span style={{ opacity: 0.7, fontSize: 12 }}>/400</span>
            </div>
          </div>
          <button
            onClick={async () => {
              try {
                await saveDraftToServer();
                await fetch(apiPath("auth/logout"), {
                  method: "POST",
                  credentials: "include",
                });
              } finally {
                clearAuth();
                redirectToLogin({ replace: true });
              }
            }}
            style={writingLogoutBtn}
          >
            Log out
          </button>
        </div>
      </header>

      {started && !submitted && timeLeft === 0 && graceRemaining > 0 && (
        <div
          style={{
            margin: "16px 24px 0",
            borderRadius: 12,
            padding: "12px 16px",
            background: "#fff7ed",
            border: "1px solid #fdba74",
            color: "#9a3412",
            fontSize: 14,
            lineHeight: 1.5,
            boxShadow: "0 10px 25px rgba(249, 115, 22, 0.08)",
          }}
        >
          <strong>Official time is over.</strong> The system keeps your answers for another {formatTime(graceRemaining)} in case of power loss or page reload. Your teacher can extend the time if needed.
        </div>
      )}

      <Split
        sizes={[50, 50]}
        minSize={200}
        gutterSize={8}
        direction={isMobile ? "vertical" : "horizontal"}
        gutter={() => {
          if (typeof document === "undefined") return null;
          const gutter = document.createElement("div");
          gutter.style.backgroundColor = "#e03";
          gutter.style.backgroundRepeat = "no-repeat";
          gutter.style.backgroundPosition = "50%";
          return gutter;
        }}
        style={{
          flexGrow: 1,
          overflow: "hidden",
          height: "100%",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
        }}
      >
        <div
          style={{
            padding: "20px",
            height: "auto",
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
            fontFamily: "sans-serif",
          }}
        >
          {activeTask === "task1" && (
            <>
              <h2>WRITING TASK 1</h2>
              <div
                className="writing-test-prompt"
                dangerouslySetInnerHTML={{ __html: testData.task1 }}
              />
              {testData.task1Image && (
                <img
                  src={hostPath(testData.task1Image)}
                  alt="Task 1"
                  style={{ maxWidth: "80%" }}
                />
              )}
              {/* <p>
                <i>Write at least 150 words.</i>
              </p> */}
            </>
          )}

          {activeTask === "task2" && (
            <>
              <h2>WRITING TASK 2</h2>
              <div
                className="writing-test-prompt"
                dangerouslySetInnerHTML={{ __html: testData.task2 }}
              />
              {/* <p>
                <i>Write at least 250 words.</i>
              </p> */}
            </>
          )}
        </div>

        <div style={{ padding: 20 }}>
          <h3>
            Your Answer – {activeTask.toUpperCase()} (
            {countWords(activeTask === "task1" ? task1 : task2)} words)
          </h3>
          <textarea
            rows={25}
            style={{
              width: "100%",
              padding: 10,
              overflow: "auto",
              boxSizing: "border-box",
              fontSize: "18px",
              fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
              marginBottom: "12px",
              border: "1px solid #ccc",
              borderRadius: "8px",
              outline: "none",
              transition: "border-color 0.2s ease",
            }}
            value={activeTask === "task1" ? task1 : task2}
            onChange={(e) => {
              if (activeTask === "task1") setTask1(e.target.value);
              else setTask2(e.target.value);
            }}
          />
        </div>
      </Split>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: 10,
          background: "#fafafa",
          borderTop: "1px solid #ccc",
        }}
      >
        <button
          onClick={() => setActiveTask("task1")}
          style={taskBtnStyle(activeTask === "task1")}
        >
          Task 1
        </button>
        <button
          onClick={() => setActiveTask("task2")}
          style={taskBtnStyle(activeTask === "task2")}
        >
          Task 2
        </button>
        <button
          onClick={handleSubmit}
          style={{
            margin: "0 10px",
            padding: "10px 20px",
            border: "none",
            borderRadius: "8px",
            fontSize: "16px",
            backgroundColor: isSubmitting ? "#999" : "#e03",
            color: "white",
            cursor: isSubmitting ? "not-allowed" : "pointer",
            opacity: isSubmitting ? 0.85 : 1,
          }}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Submit"}
        </button>
      </div>
      {message && !submitted && (
        <div
          style={{
            textAlign: "center",
            padding: "8px 12px 14px",
            color: message.toLowerCase().includes("success") ? "#166534" : "#b91c1c",
            fontWeight: 600,
            background: "#fff",
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
};

const taskBtnStyle = (isActive) => ({
  margin: "0 10px",
  padding: "10px 20px",
  border: "none",
  borderRadius: "8px",
  fontSize: "16px",
  backgroundColor: isActive ? "#0e276f" : "#e0e0e0",
  color: isActive ? "white" : "#333",
  cursor: "pointer",
});

export default WritingTest;
