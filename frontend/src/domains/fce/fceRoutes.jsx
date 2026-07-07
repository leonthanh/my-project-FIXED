import React, { lazy } from 'react';
import { Route } from 'react-router-dom';
import { renderAuthenticated, renderProtected } from '../../app/routes/routeUtils';

const CreateFceReadingTest = lazy(() => import('./reading/pages/CreateFceReadingTestPage'));
const EditFceReadingTest = lazy(() => import('./reading/pages/EditFceReadingTestPage'));
const CreateFceListeningTest = lazy(() => import('./listening/pages/CreateFceListeningTestPage'));
const EditFceListeningTest = lazy(() => import('./listening/pages/EditFceListeningTestPage'));
const FceSubmissionsPage = lazy(() => import('./pages/FceSubmissionsPage'));
const DoCambridgeReadingTest = lazy(() => import('../cambridge/shared/pages/DoCambridgeReadingTestPage'));
const DoCambridgeListeningTest = lazy(() => import('../cambridge/shared/pages/DoCambridgeListeningTestPage'));

export const buildFceRoutes = ({ isAuthenticated }) => [
  <Route key="admin-create-fce-reading" path="/admin/create-fce-reading" element={renderProtected('teacher', <CreateFceReadingTest />)} />,
  <Route key="admin-create-fce-listening" path="/admin/create-fce-listening" element={renderProtected('teacher', <CreateFceListeningTest />)} />,
  <Route key="admin-fce-submissions" path="/admin/fce-submissions" element={renderProtected('teacher', <FceSubmissionsPage />)} />,
  <Route key="fce-reading-edit" path="/fce/reading/:id/edit" element={renderProtected('teacher', <EditFceReadingTest />)} />,
  <Route key="fce-listening-edit" path="/fce/listening/:id/edit" element={renderProtected('teacher', <EditFceListeningTest />)} />,
  <Route key="fce-reading-direct" path="/fce/reading/:id" element={renderAuthenticated(isAuthenticated, <DoCambridgeReadingTest />)} />,
  <Route key="fce-listening-direct" path="/fce/listening/:id" element={renderAuthenticated(isAuthenticated, <DoCambridgeListeningTest />)} />,
];
