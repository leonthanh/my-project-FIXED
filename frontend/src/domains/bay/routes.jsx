import React, { lazy } from 'react';
import { Route } from 'react-router-dom';
import { renderAuthenticated, renderProtected } from '../../app/routes/routeUtils';

const CreateBayReadingTest = lazy(() => import('./reading/pages/CreateBayReadingTestPage'));
const EditBayReadingTest = lazy(() => import('./reading/pages/EditBayReadingTestPage'));
const CreateBayListeningTest = lazy(() => import('./listening/pages/CreateBayListeningTestPage'));
const EditBayListeningTest = lazy(() => import('./listening/pages/EditBayListeningTestPage'));
const BaySubmissionsPage = lazy(() => import('./pages/BaySubmissionsPage'));
const DoCambridgeReadingTest = lazy(() => import('../cambridge/shared/pages/DoCambridgeReadingTestPage'));
const DoCambridgeListeningTest = lazy(() => import('../cambridge/shared/pages/DoCambridgeListeningTestPage'));

export const buildBayRoutes = ({ isAuthenticated }) => [
  <Route key="admin-create-bay-reading" path="/admin/create-bay-reading" element={renderProtected('teacher', <CreateBayReadingTest />)} />,
  <Route key="admin-create-bay-listening" path="/admin/create-bay-listening" element={renderProtected('teacher', <CreateBayListeningTest />)} />,
  <Route key="admin-bay-submissions" path="/admin/bay-submissions" element={renderProtected('teacher', <BaySubmissionsPage />)} />,
  <Route key="bay-reading-edit" path="/bay/reading/:id/edit" element={renderProtected('teacher', <EditBayReadingTest />)} />,
  <Route key="bay-listening-edit" path="/bay/listening/:id/edit" element={renderProtected('teacher', <EditBayListeningTest />)} />,
  <Route key="bay-reading-direct" path="/bay/reading/:id" element={renderAuthenticated(isAuthenticated, <DoCambridgeReadingTest />)} />,
  <Route key="bay-listening-direct" path="/bay/listening/:id" element={renderAuthenticated(isAuthenticated, <DoCambridgeListeningTest />)} />,
];
