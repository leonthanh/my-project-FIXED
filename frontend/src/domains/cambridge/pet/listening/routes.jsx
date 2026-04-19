import React, { lazy } from 'react';
import { Route } from 'react-router-dom';
import { renderProtected } from '../../../../app/routes/routeUtils';

const CreatePETListeningTest = lazy(() => import('./pages/CreatePETListeningTestPage'));

export const buildCambridgePetListeningRoutes = () => [
  <Route key="admin-create-pet-listening" path="/admin/create-pet-listening" element={renderProtected('teacher', <CreatePETListeningTest />)} />,
];