import React, { lazy } from 'react';
import { Route } from 'react-router-dom';
import { renderAuthenticated, renderProtected } from '../../../app/routes/routeUtils';

const CreateListeningTest = lazy(() => import('../../../features/listening/pages/CreateListeningTestNew'));
const EditListeningTest = lazy(() => import('../../../features/listening/pages/EditListeningTest'));
const DoListeningTest = lazy(() => import('../../../features/listening/pages/DoListeningTest'));
const ListeningResults = lazy(() => import('../../../features/listening/pages/ListeningResults'));

export const buildIxListeningRoutes = ({ isAuthenticated }) => [
  <Route key="admin-create-listening" path="/admin/create-listening" element={renderProtected('teacher', <CreateListeningTest />)} />,
  <Route key="listening" path="/listening/:id" element={renderAuthenticated(isAuthenticated, <DoListeningTest />)} />,
  <Route key="listening-edit" path="/listening/:id/edit" element={renderProtected('teacher', <EditListeningTest />)} />,
  <Route key="listening-results" path="/listening-results/:id" element={renderAuthenticated(isAuthenticated, <ListeningResults />)} />,
];