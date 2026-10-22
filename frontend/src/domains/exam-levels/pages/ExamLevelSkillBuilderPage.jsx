import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminNavbar from "../../../shared/components/AdminNavbar";
import { apiPath, authFetch } from "../../../shared/utils/api";
import ExamCoreTestBuilder from "../../exam-core/shared/components/ExamCoreTestBuilder";

const SKILL_LABELS = {
  reading: "Reading",
  listening: "Listening",
  writing: "Writing",
};

const ExamLevelSkillBuilderPage = () => {
  const { code: rawCode, skill: rawSkill, id } = useParams();
  const code = String(rawCode || "").trim().toLowerCase();
  const skill = String(rawSkill || "").trim().toLowerCase();
  const navigate = useNavigate();
  const [level, setLevel] = useState(null);
  const [initialData, setInitialData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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
        if (!levelPayload.skills?.includes(skill)) {
          throw new Error(`${SKILL_LABELS[skill] || skill} is not enabled for this level.`);
        }

        let testData = null;
        if (id) {
          const testResponse = await authFetch(
            apiPath(`exam-levels/${encodeURIComponent(code)}/${encodeURIComponent(skill)}/tests/${id}`)
          );
          const testPayload = await testResponse.json().catch(() => ({}));
          if (!testResponse.ok) {
            throw new Error(testPayload.message || "Could not load this exam test.");
          }
          testData = testPayload;
        }
        if (!mounted) return;
        setLevel(levelPayload);
        setInitialData(testData);
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
  }, [code, id, skill]);

  if (loading) {
    return <div className="exam-level-page-state">Loading exam level…</div>;
  }
  if (error || !level) {
    return (
      <div className="exam-level-page-state" role="alert">
        <p>{error || "Exam level not found."}</p>
        <button type="button" onClick={() => navigate("/select-test")}>Back to tests</button>
      </div>
    );
  }

  const templateId = level.skillConfig?.[skill]?.templateId;
  if (!templateId) {
    return <div className="exam-level-page-state" role="alert">This skill has no configured template.</div>;
  }

  const skillName = SKILL_LABELS[skill] || skill;
  const apiBasePath = `exam-levels/${encodeURIComponent(code)}/${encodeURIComponent(skill)}/tests`;
  const successPath = `/exam-levels/${encodeURIComponent(code)}`;

  return (
    <>
      <AdminNavbar />
      <ExamCoreTestBuilder
        testType={templateId}
        editId={id ? Number(id) : null}
        initialData={initialData}
        apiBasePath={apiBasePath}
        durationMinutes={level.skillConfig[skill].durationMinutes}
        displayName={`${level.name} ${skillName}`}
        successPathResolver={() => successPath}
        resetDraftOnLoad={!id}
      />
    </>
  );
};

export default ExamLevelSkillBuilderPage;
