import React, { lazy } from 'react';
import { Route } from 'react-router-dom';
import { renderAuthenticated, renderProtected } from '../../../../app/routes/routeUtils';

const PetWritingTest = lazy(() => import('./pages/PetWritingTestPage'));
const CreatePetWritingTest = lazy(() => import('./pages/CreatePetWritingTestPage'));
const SelectPetWritingTest = lazy(() => import('./pages/SelectPetWritingTestPage'));
const EditPetWritingTest = lazy(() => import('./pages/EditPetWritingTestPage'));

export const buildCambridgePetWritingRoutes = ({ isAuthenticated }) => [
  <Route key="pet-writing" path="/pet-writing" element={renderAuthenticated(isAuthenticated, <PetWritingTest />)} />,
  <Route key="pet-writing-select" path="/pet-writing-select" element={renderAuthenticated(isAuthenticated, <SelectPetWritingTest />)} />,
  <Route key="admin-create-pet-writing" path="/admin/create-pet-writing" element={renderProtected('teacher', <CreatePetWritingTest />)} />,
  <Route key="admin-edit-pet-writing" path="/admin/edit-pet-writing/:id" element={renderProtected('teacher', <EditPetWritingTest />)} />,
];