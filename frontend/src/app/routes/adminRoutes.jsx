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

export const buildAdminRoutes = () => [
  <Route key="review-submission" path="/review/:id" element={renderProtected('teacher', <ReviewSubmission />)} />,
  <Route key="review" path="/review" element={renderProtected('teacher', <Review />)} />,
  <Route key="admin-reading-submissions" path="/admin/reading-submissions" element={renderProtected('teacher', <AdminReadingSubmissions />)} />,
  <Route key="admin-listening-submissions" path="/admin/listening-submissions" element={renderProtected('teacher', <AdminListeningSubmissions />)} />,
  <Route key="admin-writing-submissions" path="/admin/writing-submissions" element={renderProtected('teacher', <AdminWritingSubmissions />)} />,
  <Route key="admin-root" path="/admin" element={renderProtected('teacher', <Navigate to="/admin/writing-submissions" replace />)} />,
  <Route key="admin-teacher-permissions" path="/admin/teacher-permissions" element={renderProtected('admin', <TeacherPermissionsPage />)} />,
  <Route key="admin-users" path="/admin/users" element={renderProtected('admin', <AdminUserManagement />)} />,
];