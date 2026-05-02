import React, { lazy } from 'react';
import { Route } from 'react-router-dom';
import { renderAuthenticated } from './routeUtils';

const Login = lazy(() => import('../../features/auth/pages/Login'));
const PlacementEntry = lazy(() => import('../../features/placement/pages/PlacementEntry'));
const PlacementAttempt = lazy(() => import('../../features/placement/pages/PlacementAttempt'));
const SelectTest = lazy(() => import('../../features/admin/pages/SelectTest'));
const MyFeedback = lazy(() => import('../../features/admin/pages/MyFeedback'));
const DoReadingTest = lazy(() => import('../../features/reading/pages/DoReadingTest'));
const DoListeningTest = lazy(() => import('../../features/listening/pages/DoListeningTest'));
const DoCambridgeTestEntry = lazy(() => import('../../domains/cambridge/shared/pages/DoCambridgeTestEntryPage'));

export const buildCoreRoutes = ({ isAuthenticated }) => [
  <Route key="login" path="/login" element={<Login />} />,
  <Route key="placement-test" path="/placement-test" element={<PlacementEntry />} />,
  <Route key="placement-test-share" path="/placement-test/:shareToken" element={<PlacementEntry />} />,
  <Route key="placement-attempt" path="/placement-attempt/:attemptToken" element={<PlacementAttempt />} />,
  <Route key="placement-ix-reading" path="/placement/ix/reading/:id" element={<DoReadingTest />} />,
  <Route key="placement-ix-listening" path="/placement/ix/listening/:id" element={<DoListeningTest />} />,
  <Route key="placement-orange-runtime" path="/placement/orange/:testType/:id" element={<DoCambridgeTestEntry />} />,
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