import React, { lazy } from 'react';
import { Route } from 'react-router-dom';
import { renderAuthenticated } from './routeUtils';

const Login = lazy(() => import('../../features/auth/pages/Login'));
const SelectTest = lazy(() => import('../../features/admin/pages/SelectTest'));
const MyFeedback = lazy(() => import('../../features/admin/pages/MyFeedback'));

export const buildCoreRoutes = ({ isAuthenticated }) => [
  <Route key="login" path="/login" element={<Login />} />,
  <Route
    key="home"
    path="/"
    element={renderAuthenticated(isAuthenticated, <SelectTest />)}
  />,
  <Route
    key="select-test"
    path="/select-test"
    element={renderAuthenticated(isAuthenticated, <SelectTest />)}
  />,
  <Route
    key="my-feedback"
    path="/my-feedback"
    element={renderAuthenticated(isAuthenticated, <MyFeedback />)}
  />,
];