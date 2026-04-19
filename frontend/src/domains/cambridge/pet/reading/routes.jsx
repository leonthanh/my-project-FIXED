import React, { lazy } from 'react';
import { Route } from 'react-router-dom';
import { renderProtected } from '../../../../app/routes/routeUtils';

const CreatePETReadingTest = lazy(() => import('./pages/CreatePETReadingTestPage'));

export const buildCambridgePetReadingRoutes = () => [
  <Route key="admin-create-pet-reading" path="/admin/create-pet-reading" element={renderProtected('teacher', <CreatePETReadingTest />)} />,
];