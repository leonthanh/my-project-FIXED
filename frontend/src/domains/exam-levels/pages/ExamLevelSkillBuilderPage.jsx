import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiPath, authFetch } from "../../../shared/utils/api";
import { buildSelectTestPath } from "../../../shared/config/examRegistry";
import ExamCoreTestBuilder from "../../exam-core/shared/components/ExamCoreTestBuilder";
import { isPrepareReadingWriting } from "../prepare/prepareReadingWriting";

const SKILL_LABELS = {
  reading: "Reading",
  listening: "Listening",
  writing: "Writing",
  "reading-writing": "Reading & Writing",
};

export const getExamLevelSkillBuilderSuccessPath = (code, skill) => {
  const normalizedCode = String(code || "").trim().toLowerCase();
  if (normalizedCode === "prepare") {
    return buildSelectTestPath({ platform: "prepare", tab: skill });
  }
  return `/exam-levels/${encodeURIComponent(normalizedCode)}`;
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
  const successPath = getExamLevelSkillBuilderSuccessPath(code, skill);
  const isPrepareSkill = code === "prepare" && skill === "reading-writing";
  if (isPrepareSkill && !id && templateId !== "gateway-reading-writing") {
    return <div className="exam-level-page-state" role="alert">Prepare Reading & Writing cần cấu hình mẫu tương thích gateway-reading-writing.</div>;
  }
  const useLegacyPrepareFormat = isPrepareSkill && isPrepareReadingWriting(initialData?.parts);
  const useFlexiblePrepareFormat = isPrepareSkill && !useLegacyPrepareFormat;

  return (
    <>
      <ExamCoreTestBuilder
        testType={templateId}
        editId={id ? Number(id) : null}
        initialData={initialData}
        apiBasePath={apiBasePath}
        durationMinutes={level.skillConfig[skill].durationMinutes}
        displayName={`${level.name} ${skillName}`}
        successPathResolver={() => successPath}
        resetDraftOnLoad={!id && !isPrepareSkill}
        prepareReadingWriting={useLegacyPrepareFormat}
        prepareFlexibleReadingWriting={useFlexiblePrepareFormat}
        draftStorageKey={isPrepareSkill ? `examLevelDraft-${code}-${skill}-${id || "new"}` : undefined}
      />
    </>
  );
};

export default ExamLevelSkillBuilderPage;
