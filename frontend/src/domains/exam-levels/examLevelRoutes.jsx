import React, { lazy } from "react";
import { Route } from "react-router-dom";
import { renderAuthenticated, renderProtected } from "../../app/routes/routeUtils";

const ExamLevelHubPage = lazy(() => import("./pages/ExamLevelHubPage"));
const ExamLevelSkillBuilderPage = lazy(() => import("./pages/ExamLevelSkillBuilderPage"));
const ExamLevelSkillRuntimePage = lazy(() => import("./pages/ExamLevelSkillRuntimePage"));
const ExamLevelSubmissionsPage = lazy(() => import("./pages/ExamLevelSubmissionsPage"));
const ExamLevelSubmissionReviewPage = lazy(() => import("./pages/ExamLevelSubmissionReviewPage"));

export const buildExamLevelRoutes = ({ isAuthenticated }) => [
  <Route
    key="exam-level-hub"
    path="/exam-levels/:code"
    element={renderAuthenticated(isAuthenticated, <ExamLevelHubPage />)}
  />,
  <Route
    key="exam-level-submissions"
    path="/exam-levels/:code/submissions"
    element={renderProtected("teacher", <ExamLevelSubmissionsPage />)}
  />,
  <Route
    key="exam-level-submission-review"
    path="/exam-levels/:code/submissions/:submissionId"
    element={renderProtected("teacher", <ExamLevelSubmissionReviewPage />)}
  />,
  <Route
    key="exam-level-skill-runtime"
    path="/exam-levels/:code/:skill/:id"
    element={renderAuthenticated(isAuthenticated, <ExamLevelSkillRuntimePage />)}
  />,
  <Route
    key="exam-level-placement-runtime"
    path="/placement/exam-level/:code/:skill/:id"
    element={<ExamLevelSkillRuntimePage />}
  />,
  <Route
    key="exam-level-skill-create"
    path="/admin/exam-levels/:code/:skill/new"
    element={renderProtected("teacher", <ExamLevelSkillBuilderPage />)}
  />,
  <Route
    key="exam-level-skill-edit"
    path="/admin/exam-levels/:code/:skill/:id/edit"
    element={renderProtected("teacher", <ExamLevelSkillBuilderPage />)}
  />,
];
