import React, { lazy } from 'react';
import { Route } from 'react-router-dom';
import { renderAuthenticated, renderProtected } from '../../../app/routes/routeUtils';

const CreateCambridgeTest = lazy(() => import('./pages/CreateCambridgeTestPage'));
const EditCambridgeReadingTest = lazy(() => import('./pages/EditCambridgeReadingTestPage'));
const EditCambridgeListeningTest = lazy(() => import('./pages/EditCambridgeListeningTestPage'));
const SelectCambridgeTest = lazy(() => import('./pages/SelectCambridgeTestPage'));
const DoCambridgeTestEntry = lazy(() => import('./pages/DoCambridgeTestEntryPage'));
const DoCambridgeListeningTest = lazy(() => import('./pages/DoCambridgeListeningTestPage'));
const DoCambridgeReadingTest = lazy(() => import('./pages/DoCambridgeReadingTestPage'));
const CambridgeResultPage = lazy(() => import('./pages/CambridgeResultPage'));
const CambridgeSubmissionsPage = lazy(() => import('../../../features/admin/pages/CambridgeSubmissionsPage'));

export const buildCambridgeSharedRoutes = ({ isAuthenticated }) => [
  <Route key="admin-create-test-type-slash" path="/admin/create/:testType" element={renderProtected('teacher', <CreateCambridgeTest />)} />,
  <Route key="admin-create-test-type-dash" path="/admin/create-:testType" element={renderProtected('teacher', <CreateCambridgeTest />)} />,
  <Route key="cambridge-reading-edit-generic" path="/cambridge/reading/:id/edit" element={renderProtected('teacher', <EditCambridgeReadingTest />)} />,
  <Route key="cambridge-listening-edit" path="/cambridge/listening/:id/edit" element={renderProtected('teacher', <EditCambridgeListeningTest />)} />,
  <Route key="cambridge-submissions" path="/admin/cambridge-submissions" element={renderProtected('teacher', <CambridgeSubmissionsPage />)} />,
  <Route key="cambridge-select" path="/cambridge" element={renderAuthenticated(isAuthenticated, <SelectCambridgeTest />)} />,
  <Route key="cambridge-reading-direct" path="/cambridge/reading/:id" element={renderAuthenticated(isAuthenticated, <DoCambridgeReadingTest />)} />,
  <Route key="cambridge-listening-direct" path="/cambridge/listening/:id" element={renderAuthenticated(isAuthenticated, <DoCambridgeListeningTest />)} />,
  <Route key="cambridge-generic-test-type" path="/cambridge/:testType/:id" element={renderAuthenticated(isAuthenticated, <DoCambridgeTestEntry />)} />,
  <Route key="cambridge-result" path="/cambridge/result/:submissionId" element={renderAuthenticated(isAuthenticated, <CambridgeResultPage />)} />,
];