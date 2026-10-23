import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminNavbar from "../../../shared/components/AdminNavbar";
import StudentNavbar from "../../../shared/components/StudentNavbar";
import LineIcon from "../../../shared/components/LineIcon.jsx";
import { apiPath, authFetch, getStoredUser } from "../../../shared/utils/api";
import {
  createPlacementSelection,
  isPlacementEligible,
  normalizePlacementSelections,
} from "../../../shared/utils/placementTests";
import "./ExamLevelHubPage.css";

const SKILL_LABELS = {
  reading: "Reading",
  listening: "Listening",
  writing: "Writing",
};

const ExamLevelHubPage = () => {
  const { code: rawCode } = useParams();
  const code = String(rawCode || "").trim().toLowerCase();
  const navigate = useNavigate();
  const user = useMemo(() => getStoredUser(), []);
  const isTeacher = ["teacher", "admin"].includes(String(user?.role || "").toLowerCase());
  const [level, setLevel] = useState(null);
  const [testsBySkill, setTestsBySkill] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [placementSelections, setPlacementSelections] = useState([]);
  const [placementSaving, setPlacementSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const levelResponse = await authFetch(apiPath(`exam-levels/${encodeURIComponent(code)}`));
        const levelPayload = await levelResponse.json().catch(() => ({}));
        if (!levelResponse.ok) {
          throw new Error(levelPayload.message || "Could not load this exam level.");
        }
        const results = await Promise.all(
          (levelPayload.skills || []).map(async (skill) => {
            const response = await authFetch(
              apiPath(`exam-levels/${encodeURIComponent(code)}/${encodeURIComponent(skill)}/tests`)
            );
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
              throw new Error(payload.message || `Could not load ${skill} tests.`);
            }
            return [skill, Array.isArray(payload) ? payload : []];
          })
        );
        if (!mounted) return;
        setLevel(levelPayload);
        setTestsBySkill(Object.fromEntries(results));
      } catch (loadError) {
        if (mounted) setError(loadError.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [code]);

  useEffect(() => {
    if (!isTeacher) return undefined;
    let mounted = true;
    authFetch(apiPath("placement/packages/current"))
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.message || "Could not load placement visibility.");
        }
        if (mounted) {
          setPlacementSelections(normalizePlacementSelections(payload.items));
        }
      })
      .catch((loadError) => {
        if (mounted) setError(loadError.message);
      });
    return () => {
      mounted = false;
    };
  }, [isTeacher]);

  const togglePlacement = async (skill, test) => {
    const selection = createPlacementSelection({
      platform: "exam-level",
      levelCode: code,
      skill,
      testId: test.id,
      testType: test.testType,
      title: test.title,
      badge: level?.name || code.toUpperCase(),
      questionsLabel: `${test.totalQuestions || 0} questions`,
      durationLabel: `${test.duration || 0} min`,
    });
    if (!isPlacementEligible(selection)) return;
    const isShown = placementSelections.some((item) => item.key === selection.key);
    const next = isShown
      ? placementSelections.filter((item) => item.key !== selection.key)
      : normalizePlacementSelections([...placementSelections, selection]);
    setPlacementSaving(true);
    setError("");
    try {
      const response = await authFetch(apiPath("placement/packages/current"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: next }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || "Could not update placement visibility.");
      }
      setPlacementSelections(normalizePlacementSelections(payload.items));
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setPlacementSaving(false);
    }
  };

  const archiveTest = async (skill, testId) => {
    setError("");
    try {
      const response = await authFetch(
        apiPath(`exam-levels/${encodeURIComponent(code)}/${encodeURIComponent(skill)}/tests/${testId}`),
        { method: "DELETE" }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || "Could not archive this test.");
      }
      setTestsBySkill((current) => ({
        ...current,
        [skill]: current[skill].filter((test) => Number(test.id) !== Number(testId)),
      }));
    } catch (archiveError) {
      setError(archiveError.message);
    }
  };

  if (loading) {
    return <div className="exam-level-page-state">Loading exam level…</div>;
  }

  return (
    <>
      {isTeacher ? <AdminNavbar /> : <StudentNavbar />}
      <main className="exam-level-hub">
        <header className="exam-level-hub__header">
          <div>
            <p className="exam-level-hub__eyebrow">EXAM LEVEL</p>
            <h1>{level?.name || "Exam level"}</h1>
            {level?.description && <p>{level.description}</p>}
          </div>
          <button type="button" className="exam-level-hub__back" onClick={() => navigate("/select-test")}>
            Back to tests
          </button>
          {isTeacher && (
            <button
              type="button"
              className="exam-level-hub__back"
              onClick={() => navigate(`/exam-levels/${encodeURIComponent(code)}/submissions`)}
            >
              View submissions
            </button>
          )}
        </header>
        {error && <p className="exam-level-hub__error" role="alert">{error}</p>}
        {(level?.skills || []).map((skill) => (
          <section className="exam-level-hub__skill" key={skill}>
            <div className="exam-level-hub__skillHeader">
              <div>
                <h2>{SKILL_LABELS[skill] || skill}</h2>
                <p>{testsBySkill[skill]?.length || 0} tests</p>
              </div>
              {isTeacher && (
                <button
                  type="button"
                  className="exam-level-hub__create"
                  onClick={() => navigate(`/admin/exam-levels/${encodeURIComponent(code)}/${skill}/new`)}
                >
                  <LineIcon name="create" size={16} />
                  Create {SKILL_LABELS[skill] || skill} test
                </button>
              )}
            </div>
            {testsBySkill[skill]?.length ? (
              <div className="exam-level-hub__grid">
                {testsBySkill[skill].map((test) => {
                  const placementSelection = createPlacementSelection({
                    platform: "exam-level",
                    levelCode: code,
                    skill,
                    testId: test.id,
                    testType: test.testType,
                  });
                  const placementShown = placementSelections.some(
                    (item) => item.key === placementSelection.key
                  );

                  return (
                  <article className="exam-level-hub__card" key={test.id}>
                    <div className="exam-level-hub__cardTop">
                      <span>{SKILL_LABELS[skill] || skill}</span>
                      <strong>{test.status === "draft" ? "Draft" : "Published"}</strong>
                    </div>
                    <h3>{test.title}</h3>
                    <p>{test.classCode || "No class"} · {test.totalQuestions || 0} questions · {test.duration} min</p>
                    <div className="exam-level-hub__actions">
                      <button type="button" onClick={() => navigate(`/exam-levels/${encodeURIComponent(code)}/${skill}/${test.id}`)}>
                        Take test
                      </button>
                      {isTeacher && (
                        <>
                          <button
                            type="button"
                            disabled={placementSaving || (test.status !== "published" && !placementShown)}
                            aria-pressed={placementShown}
                            onClick={() => void togglePlacement(skill, test)}
                          >
                            {placementShown ? "Hide from Placement" : "Show on Placement"}
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/exam-levels/${encodeURIComponent(code)}/${skill}/${test.id}/edit`)}
                          >
                            Edit
                          </button>
                          <button type="button" onClick={() => void archiveTest(skill, test.id)}>
                            Archive
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                  );
                })}
              </div>
            ) : (
              <p className="exam-level-hub__empty">
                {isTeacher ? "No tests yet. Create the first test with the shared skill builder." : "No tests are available yet."}
              </p>
            )}
          </section>
        ))}
      </main>
    </>
  );
};

export default ExamLevelHubPage;
