import React, { lazy } from 'react';
import { Route } from 'react-router-dom';
import { renderProtected } from '../../../../app/routes/routeUtils';

const CreateKETListeningTest = lazy(() => import('./pages/CreateKETListeningTestPage'));

export const buildCambridgeKetListeningRoutes = () => [
  <Route key="admin-create-ket-listening" path="/admin/create-ket-listening" element={renderProtected('teacher', <CreateKETListeningTest />)} />,
];