import React, { lazy } from 'react';
import { Route } from 'react-router-dom';
import { renderAuthenticated, renderProtected } from '../../../app/routes/routeUtils';

const EditTest = lazy(() => import('../../../features/admin/pages/EditTest'));
const WritingTest = lazy(() => import('../../../features/writing/pages/WritingTest'));
const CreateWritingTest = lazy(() => import('../../../features/writing/pages/CreateWritingTest'));

export const buildIxWritingRoutes = ({ isAuthenticated }) => [
  <Route key="writing" path="/writing" element={renderAuthenticated(isAuthenticated, <WritingTest />)} />,
  <Route key="writing-test" path="/writing-test" element={renderAuthenticated(isAuthenticated, <WritingTest />)} />,
  <Route key="admin-create-writing" path="/admin/create-writing" element={renderProtected('teacher', <CreateWritingTest />)} />,
  <Route key="edit-test" path="/edit-test/:id" element={renderProtected('teacher', <EditTest />)} />,
];