import React, { lazy } from 'react';
import { Route } from 'react-router-dom';
import { renderAuthenticated, renderProtected } from '../../../app/routes/routeUtils';

const CreateReadingTest = lazy(() => import('../../../features/reading/pages/CreateReadingTest'));
const EditReadingTest = lazy(() => import('../../../features/reading/pages/EditReadingTest'));
const DoReadingTest = lazy(() => import('../../../features/reading/pages/DoReadingTest'));
const TakeReadingTest = lazy(() => import('../../../features/reading/pages/TakeReadingTest'));
const ReadingResults = lazy(() => import('../../../features/reading/pages/ReadingResults'));
const SelectTest = lazy(() => import('../../../features/admin/pages/SelectTest'));

export const buildIxReadingRoutes = ({ isAuthenticated }) => [
  <Route key="admin-create-reading" path="/admin/create-reading" element={renderProtected('teacher', <CreateReadingTest />)} />,
  <Route key="reading-edit" path="/reading-tests/:testId/edit" element={renderProtected('teacher', <EditReadingTest />)} />,
  <Route key="reading-take" path="/reading-tests/:testId" element={renderAuthenticated(isAuthenticated, <TakeReadingTest />)} />,
  <Route key="reading-tests" path="/reading-tests" element={renderAuthenticated(isAuthenticated, <SelectTest />)} />,
  <Route key="reading" path="/reading/:id" element={renderAuthenticated(isAuthenticated, <DoReadingTest />)} />,
  <Route key="reading-results" path="/reading-results/:id" element={renderAuthenticated(isAuthenticated, <ReadingResults />)} />,
];