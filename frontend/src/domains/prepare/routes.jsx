import React, { lazy } from "react";
import { Navigate, Route, useParams } from "react-router-dom";
import { renderAuthenticated, renderProtected } from "../../app/routes/routeUtils";

const PrepareHubPage = lazy(() => import("./pages/PrepareHubPage"));
const PrepareSkillBuilderPage = lazy(() => import("./pages/PrepareSkillBuilderPage"));
const PrepareSkillRuntimePage = lazy(() => import("./pages/PrepareSkillRuntimePage"));
const PrepareSubmissionsPage = lazy(() => import("./pages/PrepareSubmissionsPage"));
const PrepareSubmissionReviewPage = lazy(() => import("./pages/PrepareSubmissionReviewPage"));
const PrepareSubmissionResultPage = lazy(() => import("./pages/PrepareSubmissionResultPage"));

export const buildPrepareRoutes = ({ isAuthenticated }) => [
  <Route
    key="prepare-admin-home"
    path="/admin/prepare"
    element={renderProtected("teacher", <Navigate to="/select-test?platform=prepare" replace />)}
  />,
  <Route
    key="prepare-hub"
    path="/prepare"
    element={renderAuthenticated(isAuthenticated, <PrepareHubPage />)}
  />,
  <Route
    key="prepare-submissions"
    path="/prepare/submissions"
    element={renderProtected("teacher", <PrepareSubmissionsPage />)}
  />,
  <Route
    key="prepare-submission-review"
    path="/prepare/submissions/:submissionId"
    element={renderProtected("teacher", <PrepareSubmissionReviewPage />)}
  />,
  <Route
    key="prepare-submission-result"
    path="/prepare/submission-results/:submissionId"
    element={renderProtected("teacher", <PrepareSubmissionResultPage />)}
  />,
  <Route
    key="prepare-skill-runtime"
    path="/prepare/:skill/:id"
    element={renderAuthenticated(isAuthenticated, <PrepareSkillRuntimePage />)}
  />,
  <Route
    key="prepare-skill-create"
    path="/admin/prepare/:skill/new"
    element={renderProtected("teacher", <PrepareSkillBuilderPage />)}
  />,
  <Route
    key="prepare-skill-edit"
    path="/admin/prepare/:skill/:id/edit"
    element={renderProtected("teacher", <PrepareSkillBuilderPage />)}
  />,
  <Route
    key="legacy-prepare-admin-builder-create"
    path="/admin/exam-levels/prepare/:skill/new"
    element={renderProtected("teacher", <LegacyPrepareBuilderRedirect edit={false} />)}
  />,
  <Route
    key="legacy-prepare-admin-builder-edit"
    path="/admin/exam-levels/prepare/:skill/:id/edit"
    element={renderProtected("teacher", <LegacyPrepareBuilderRedirect edit />)}
  />,
  <Route
    key="legacy-prepare-submissions-review"
    path="/exam-levels/prepare/submissions/:submissionId"
    element={renderProtected("teacher", <LegacyPrepareSubmissionReviewRedirect />)}
  />,
  <Route
    key="legacy-prepare-submissions"
    path="/exam-levels/prepare/submissions"
    element={renderProtected("teacher", <Navigate to="/prepare/submissions" replace />)}
  />,
  <Route
    key="legacy-prepare-submission-result"
    path="/exam-levels/prepare/submission-results/:submissionId"
    element={renderProtected("teacher", <LegacyPrepareResultRedirect />)}
  />,
  <Route
    key="legacy-prepare-runtime"
    path="/exam-levels/prepare/:skill/:id"
    element={renderAuthenticated(isAuthenticated, <LegacyPrepareRuntimeRedirect />)}
  />,
  <Route
    key="legacy-prepare-hub"
    path="/exam-levels/prepare"
    element={renderAuthenticated(isAuthenticated, <Navigate to="/prepare" replace />)}
  />,
];

const LegacyPrepareBuilderRedirect = ({ edit }) => {
  const { skill, id } = useParams();
  const destination = edit
    ? `/admin/prepare/${encodeURIComponent(skill)}/${encodeURIComponent(id)}/edit`
    : `/admin/prepare/${encodeURIComponent(skill)}/new`;
  return <Navigate to={destination} replace />;
};

const LegacyPrepareRuntimeRedirect = () => {
  const { skill, id } = useParams();
  return <Navigate to={`/prepare/${encodeURIComponent(skill)}/${encodeURIComponent(id)}`} replace />;
};

const LegacyPrepareSubmissionReviewRedirect = () => {
  const { submissionId } = useParams();
  return <Navigate to={`/prepare/submissions/${encodeURIComponent(submissionId)}`} replace />;
};

const LegacyPrepareResultRedirect = () => {
  const { submissionId } = useParams();
  return <Navigate to={`/prepare/submission-results/${encodeURIComponent(submissionId)}`} replace />;
};
