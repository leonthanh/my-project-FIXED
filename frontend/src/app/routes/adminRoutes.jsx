import React, { lazy } from 'react';
import { Route, Navigate } from 'react-router-dom';
import { renderProtected } from './routeUtils';

const ReviewSubmission = lazy(() => import('../../features/admin/pages/ReviewSubmission'));
const Review = lazy(() => import('../../features/admin/pages/Review'));
const AdminReadingSubmissions = lazy(() => import('../../features/admin/pages/AdminReadingSubmissions'));
const AdminListeningSubmissions = lazy(() => import('../../features/admin/pages/AdminListeningSubmissions'));
const AdminWritingSubmissions = lazy(() => import('../../features/admin/pages/AdminWritingSubmissions'));
const TeacherPermissionsPage = lazy(() => import('../../features/admin/pages/TeacherPermissionsPage'));
const AdminUserManagement = lazy(() => import('../../features/admin/pages/AdminUserManagement'));
const AdminDisplaySettingsPage = lazy(() => import('../../features/admin/pages/AdminDisplaySettingsPage'));
const AdminRuntimeSyncMetricsPage = lazy(() => import('../../features/admin/pages/AdminRuntimeSyncMetricsPage'));
const ExamLevelsPage = lazy(() => import('../../features/admin/pages/ExamLevelsPage'));
const GatewaySubmissionsPage = lazy(() => import('../../features/gateway/pages/GatewaySubmissionsPage'));
const UserProfilePage = lazy(() => import('../../features/auth/pages/UserProfilePage'));

export const buildAdminRoutes = () => [
  <Route key="review-submission" path="/review/:id" element={renderProtected('teacher', <ReviewSubmission />)} />,
  <Route key="review" path="/review" element={renderProtected('teacher', <Review />)} />,
  <Route key="admin-reading-submissions" path="/admin/reading-submissions" element={renderProtected('teacher', <AdminReadingSubmissions />)} />,
  <Route key="admin-listening-submissions" path="/admin/listening-submissions" element={renderProtected('teacher', <AdminListeningSubmissions />)} />,
  <Route key="admin-writing-submissions" path="/admin/writing-submissions" element={renderProtected('teacher', <AdminWritingSubmissions />)} />,
  <Route key="admin-gateway-submissions" path="/admin/gateway-submissions" element={renderProtected('teacher', <GatewaySubmissionsPage />)} />,
  <Route key="admin-root" path="/admin" element={renderProtected('teacher', <Navigate to="/admin/writing-submissions" replace />)} />,
  <Route key="admin-display-settings" path="/admin/display-settings" element={renderProtected('admin', <AdminDisplaySettingsPage />)} />,
  <Route key="admin-exam-levels" path="/admin/exam-levels" element={renderProtected('admin', <ExamLevelsPage />)} />,
  <Route key="admin-runtime-sync-metrics" path="/admin/runtime-sync-metrics" element={renderProtected('admin', <AdminRuntimeSyncMetricsPage />)} />,
  <Route key="admin-teacher-permissions" path="/admin/teacher-permissions" element={renderProtected('admin', <TeacherPermissionsPage />)} />,
  <Route key="admin-user-profile" path="/admin/users/:userId/profile" element={renderProtected('admin', <UserProfilePage />)} />,
  <Route key="admin-users" path="/admin/users" element={renderProtected('admin', <AdminUserManagement />)} />,
];