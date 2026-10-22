import React, { lazy } from 'react';
import { Route } from 'react-router-dom';
import { renderAuthenticated, renderProtected } from '../../app/routes/routeUtils';

const CreateGeneralReadingTest = lazy(() => import('./reading/pages/CreateGeneralReadingTestPage'));
const EditGeneralReadingTest = lazy(() => import('./reading/pages/EditGeneralReadingTestPage'));
const CreateGeneralListeningTest = lazy(() => import('./listening/pages/CreateGeneralListeningTestPage'));
const EditGeneralListeningTest = lazy(() => import('./listening/pages/EditGeneralListeningTestPage'));
const GeneralSubmissionsPage = lazy(() => import('./pages/GeneralSubmissionsPage'));
const GeneralReadingResultPage = lazy(() => import('./pages/GeneralReadingResultPage'));
const DoGeneralReadingTest = lazy(() => import('./reading/pages/DoGeneralReadingTestPage'));
const DoGeneralListeningTest = lazy(() => import('./listening/pages/DoGeneralListeningTestPage'));

export const buildGeneralRoutes = ({ isAuthenticated }) => [
  <Route key="admin-create-general-reading" path="/admin/create-general-reading" element={renderProtected('teacher', <CreateGeneralReadingTest />)} />,
  <Route key="admin-create-general-listening" path="/admin/create-general-listening" element={renderProtected('teacher', <CreateGeneralListeningTest />)} />,
  <Route key="admin-general-submissions" path="/admin/general-submissions" element={renderProtected('teacher', <GeneralSubmissionsPage />)} />,
  <Route key="general-reading-result" path="/general/result/:submissionId" element={renderProtected('teacher', <GeneralReadingResultPage />)} />,
  <Route key="general-reading-edit" path="/general/reading/:id/edit" element={renderProtected('teacher', <EditGeneralReadingTest />)} />,
  <Route key="general-listening-edit" path="/general/listening/:id/edit" element={renderProtected('teacher', <EditGeneralListeningTest />)} />,
  <Route key="general-reading-direct" path="/general/reading/:id" element={renderAuthenticated(isAuthenticated, <DoGeneralReadingTest />)} />,
  <Route key="general-listening-direct" path="/general/listening/:id" element={renderAuthenticated(isAuthenticated, <DoGeneralListeningTest />)} />,
  <Route key="general-reading-placement" path="/placement/general/reading/:id" element={renderAuthenticated(isAuthenticated, <DoGeneralReadingTest />)} />,
  <Route key="general-listening-placement" path="/placement/general/listening/:id" element={renderAuthenticated(isAuthenticated, <DoGeneralListeningTest />)} />,
];
