import React, { lazy } from 'react';
import { Route } from 'react-router-dom';
import { renderProtected } from '../../../../app/routes/routeUtils';

const CreateKETReadingTest = lazy(() => import('./pages/CreateKETReadingTestPage'));

export const buildCambridgeKetReadingRoutes = () => [
  <Route key="admin-create-ket-reading" path="/admin/create-ket-reading" element={renderProtected('teacher', <CreateKETReadingTest />)} />,
];