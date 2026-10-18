import React, { lazy } from 'react';
import { Route } from 'react-router-dom';
import { renderAuthenticated, renderProtected } from '../../app/routes/routeUtils';

const GatewayCreateTestPage = lazy(() => import('../../features/gateway/pages/GatewayCreateTestPage'));
const GatewayDoTestPage = lazy(() => import('../../features/gateway/pages/GatewayDoTestPage'));
const GatewayEditTestPage = lazy(() => import('../../features/gateway/pages/GatewayEditTestPage'));
const GatewayResultPage = lazy(() => import('./pages/GatewayResultPage'));

export const buildGatewayRoutes = ({ isAuthenticated }) => [
  <Route
    key="gateway-placement-do"
    path="/placement/gateway/:skill/:id"
    element={renderAuthenticated(isAuthenticated, <GatewayDoTestPage />)}
  />,
  <Route
    key="gateway-create"
    path="/admin/create-gateway/:skill"
    element={renderProtected('teacher', <GatewayCreateTestPage />)}
  />,
  <Route
    key="gateway-result"
    path="/gateway/result/:submissionId"
    element={renderAuthenticated(isAuthenticated, <GatewayResultPage />)}
  />,
  <Route
    key="gateway-do"
    path="/gateway/:skill/:id"
    element={renderAuthenticated(isAuthenticated, <GatewayDoTestPage />)}
  />,
  <Route
    key="gateway-edit"
    path="/admin/edit-gateway/:skill/:id"
    element={renderProtected('teacher', <GatewayEditTestPage />)}
  />,
];
