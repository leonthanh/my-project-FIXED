import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiPath, authFetch } from "../../../shared/utils/api";
import ExamCoreListeningRuntimePage from "../../exam-core/shared/pages/ExamCoreListeningRuntimePage";
import ExamCoreReadingRuntimePage from "../../exam-core/shared/pages/ExamCoreReadingRuntimePage";

const SKILL_LABELS = {
  reading: "Reading",
  listening: "Listening",
  writing: "Writing",
};

const ExamLevelSkillRuntimePage = () => {
  const { code: rawCode, skill: rawSkill } = useParams();
  const code = String(rawCode || "").trim().toLowerCase();
  const skill = String(rawSkill || "").trim().toLowerCase();
  const [level, setLevel] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    authFetch(apiPath(`exam-levels/${encodeURIComponent(code)}`))
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.message || "Could not load this exam level.");
        }
        if (!payload.skills?.includes(skill)) {
          throw new Error(`${SKILL_LABELS[skill] || skill} is not enabled for this level.`);
        }
        if (mounted) setLevel(payload);
      })
      .catch((loadError) => {
        if (mounted) setError(loadError.message);
      });
    return () => {
      mounted = false;
    };
  }, [code, skill]);

  if (error) return <div className="exam-level-page-state" role="alert">{error}</div>;
  if (!level) return <div className="exam-level-page-state">Loading exam level…</div>;

  const templateId = level.skillConfig?.[skill]?.templateId;
  if (!templateId) {
    return <div className="exam-level-page-state" role="alert">This skill has no configured template.</div>;
  }

  const codePath = encodeURIComponent(code);
  const skillPath = encodeURIComponent(skill);
  const testPath = `exam-levels/${codePath}/${skillPath}/tests`;
  const submissionPath = `exam-levels/${codePath}/submissions`;
  const runtimeProps = {
    defaultTestType: templateId,
    fetchBasePath: testPath,
    submitBasePath: testPath,
    submissionBasePath: submissionPath,
    storageNamespace: `exam-level-${code}`,
    examDisplayName: level.name,
    hubPath: `/exam-levels/${codePath}`,
  };

  return skill === "listening" ? (
    <ExamCoreListeningRuntimePage {...runtimeProps} />
  ) : (
    <ExamCoreReadingRuntimePage {...runtimeProps} />
  );
};

export default ExamLevelSkillRuntimePage;
