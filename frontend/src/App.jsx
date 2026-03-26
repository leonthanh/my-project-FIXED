import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Login from './features/auth/pages/Login';
import ProtectedRoute from './shared/components/ProtectedRoute';
import { refreshAccessToken } from './shared/utils/api';

const EditTest = lazy(() => import('./features/admin/pages/EditTest'));
const AdminWritingSubmissions = lazy(() => import('./features/admin/pages/AdminWritingSubmissions'));
const SelectTest = lazy(() => import('./features/admin/pages/SelectTest'));
const MyFeedback = lazy(() => import('./features/admin/pages/MyFeedback'));
const ReviewSubmission = lazy(() => import('./features/admin/pages/ReviewSubmission'));
const Review = lazy(() => import('./features/admin/pages/Review'));
const AdminReadingSubmissions = lazy(() => import('./features/admin/pages/AdminReadingSubmissions'));
const AdminListeningSubmissions = lazy(() => import('./features/admin/pages/AdminListeningSubmissions'));
const CambridgeSubmissionsPage = lazy(() => import('./features/admin/pages/CambridgeSubmissionsPage'));
const TeacherPermissionsPage = lazy(() => import('./features/admin/pages/TeacherPermissionsPage'));
const AdminUserManagement = lazy(() => import('./features/admin/pages/AdminUserManagement'));

const WritingTest = lazy(() => import('./features/writing/pages/WritingTest'));
const CreateWritingTest = lazy(() => import('./features/writing/pages/CreateWritingTest'));
const PetWritingTest = lazy(() => import('./features/writing/pages/PetWritingTest'));
const CreatePetWritingTest = lazy(() => import('./features/writing/pages/CreatePetWritingTest'));
const SelectPetWritingTest = lazy(() => import('./features/writing/pages/SelectPetWritingTest'));
const EditPetWritingTest = lazy(() => import('./features/writing/pages/EditPetWritingTest'));

const CreateReadingTest = lazy(() => import('./features/reading/pages/CreateReadingTest'));
const EditReadingTest = lazy(() => import('./features/reading/pages/EditReadingTest'));
const DoReadingTest = lazy(() => import('./features/reading/pages/DoReadingTest'));
const TakeReadingTest = lazy(() => import('./features/reading/pages/TakeReadingTest'));
const ReadingResults = lazy(() => import('./features/reading/pages/ReadingResults'));

const CreateListeningTest = lazy(() => import('./features/listening/pages/CreateListeningTestNew'));
const EditListeningTest = lazy(() => import('./features/listening/pages/EditListeningTest'));
const DoListeningTest = lazy(() => import('./features/listening/pages/DoListeningTest'));
const ListeningResults = lazy(() => import('./features/listening/pages/ListeningResults'));

const CreateKETListeningTest = lazy(() => import('./features/cambridge/pages/CreateKETListeningTest'));
const CreateKETReadingTest = lazy(() => import('./features/cambridge/pages/CreateKETReadingTest'));
const CreatePETListeningTest = lazy(() => import('./features/cambridge/pages/CreatePETListeningTest'));
const CreatePETReadingTest = lazy(() => import('./features/cambridge/pages/CreatePETReadingTest'));
const CreateCambridgeTest = lazy(() => import('./features/cambridge/pages/CreateCambridgeTest'));
const CreateMoversReadingTest = lazy(() => import('./features/cambridge/pages/CreateMoversReadingTest'));
const CreateMoversListeningTest = lazy(() => import('./features/cambridge/pages/CreateMoversListeningTest'));
const EditCambridgeReadingTest = lazy(() => import('./features/cambridge/pages/EditCambridgeReadingTest'));
const EditCambridgeListeningTest = lazy(() => import('./features/cambridge/pages/EditCambridgeListeningTest'));
const SelectCambridgeTest = lazy(() => import('./features/cambridge/pages/SelectCambridgeTest'));
const DoCambridgeTestEntry = lazy(() => import('./features/cambridge/pages/DoCambridgeTestEntry'));
const DoCambridgeListeningTest = lazy(() => import('./features/cambridge/pages/DoCambridgeListeningTest'));
const DoCambridgeReadingTest = lazy(() => import('./features/cambridge/pages/DoCambridgeReadingTest'));
const CambridgeResultPage = lazy(() => import('./features/cambridge/pages/CambridgeResultPage'));

const hasStoredUser = () => {
  try {
    return Boolean(JSON.parse(localStorage.getItem('user') || 'null'));
  } catch (err) {
    localStorage.removeItem('user');
    return false;
  }
};

const hasAuthTokens = () =>
  Boolean(localStorage.getItem('accessToken') || localStorage.getItem('refreshToken'));

const hasStoredSession = () => hasStoredUser() && hasAuthTokens();

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(hasStoredSession);

  const syncAuthState = useCallback(() => {
    setIsAuthenticated(hasStoredSession());
  }, []);

  useEffect(() => {
    const onForceLogout = () => {
      syncAuthState();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.replace('/login?reason=expired');
      }
    };

    const onStorage = () => syncAuthState();
    const onAuthChanged = () => syncAuthState();

    window.addEventListener('auth:force-logout', onForceLogout);
    window.addEventListener('storage', onStorage);
    window.addEventListener('auth:changed', onAuthChanged);

    const withTimeout = (promise, ms = 6500) =>
      Promise.race([
        promise,
        new Promise((resolve) => setTimeout(() => resolve('timeout'), ms)),
      ]);

    // Always try to refresh on mount if user is stored (rehydrates from session cookie)
    const tryRefresh = async () => {
      if (!hasStoredSession()) {
        return;
      }

      const refreshResult = await withTimeout(refreshAccessToken(), 2500);
      const refreshed = refreshResult === true;
      syncAuthState();

      // Redirect only when refresh truly expired the session (clearAuth removed user)
      if (!refreshed && !hasStoredUser()) {
        window.location.replace('/login?reason=expired');
        return;
      }
    };

    tryRefresh();

    // Proactive refresh every 10 minutes to keep session alive
    const intervalId = setInterval(tryRefresh, 10 * 60 * 1000);

    // Refresh when tab becomes visible again (handles long idle / reopen)
    const onVisible = () => {
      if (document.visibilityState === 'visible') tryRefresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('auth:force-logout', onForceLogout);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('auth:changed', onAuthChanged);
    };
  }, [syncAuthState]);

  return (
    <Router>
      <Suspense fallback={
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#334155' }}>
          Loading...
        </div>
      }>
        <Routes>
          <Route path="/login" element={<Login />} />

        {/* ✅ Trang cho học sinh chọn đề */}
        <Route path="/" element={isAuthenticated ? <SelectTest /> : <Navigate to="/login" replace />} />
        <Route path="/select-test" element={isAuthenticated ? <SelectTest /> : <Navigate to="/login" replace />} />
        {/* ✅ Trang làm bài viết */}
        <Route path="/writing" element={isAuthenticated ? <WritingTest /> : <Navigate to="/login" replace />} />
        <Route path="/writing-test" element={<WritingTest />} />
        <Route path="/pet-writing" element={isAuthenticated ? <PetWritingTest /> : <Navigate to="/login" replace />} />
        <Route path="/pet-writing-select" element={isAuthenticated ? <SelectPetWritingTest /> : <Navigate to="/login" replace />} />
        <Route path="/my-feedback" element={<MyFeedback />} />
        {/* ✅ Trang giáo viên tạo đề */}
        <Route path="/admin/create-writing" element={
          <ProtectedRoute role="teacher">
            <CreateWritingTest />
          </ProtectedRoute>
        } />
        <Route path="/admin/create-pet-writing" element={
          <ProtectedRoute role="teacher">
            <CreatePetWritingTest />
          </ProtectedRoute>
        } />
        <Route path="/admin/edit-pet-writing/:id" element={
          <ProtectedRoute role="teacher">
            <EditPetWritingTest />
          </ProtectedRoute>
        } />
        
        {/* Route sửa đề thi */}
        <Route path="/edit-test/:id" element={
          <ProtectedRoute role="teacher">
            <EditTest />
          </ProtectedRoute>
        } />
        <Route path="/admin/create-listening" element={
          <ProtectedRoute role="teacher">
            <CreateListeningTest />
          </ProtectedRoute>
        } />
        <Route path="/admin/create-reading" element={
          <ProtectedRoute role="teacher">
            <CreateReadingTest />
          </ProtectedRoute>
        } />
        <Route path="/reading-tests/:testId/edit" element={
          <ProtectedRoute role="teacher">
            <EditReadingTest />
          </ProtectedRoute>
        } />
        <Route path="/reading-tests/:testId" element={isAuthenticated ? <TakeReadingTest /> : <Navigate to="/login" replace />} />
        <Route path="/reading-tests" element={isAuthenticated ? <SelectTest /> : <Navigate to="/login" replace />} />
        <Route path="/reading/:id" element={isAuthenticated ? <DoReadingTest /> : <Navigate to="/login" replace />} />
        <Route path="/reading-results/:id" element={isAuthenticated ? <ReadingResults /> : <Navigate to="/login" replace />} />
        
        {/* Listening Test Routes */}
        <Route path="/listening/:id" element={isAuthenticated ? <DoListeningTest /> : <Navigate to="/login" replace />} />
        <Route path="/listening/:id/edit" element={
          <ProtectedRoute role="teacher">
            <EditListeningTest />
          </ProtectedRoute>
        } />
        <Route path="/listening-results/:id" element={isAuthenticated ? <ListeningResults /> : <Navigate to="/login" replace />} />
        
        <Route path="/review/:id" element={
          <ProtectedRoute role="teacher">
            <ReviewSubmission />
          </ProtectedRoute>
        } />
        <Route path="/review" element={
          <ProtectedRoute role="teacher">
            <Review />
          </ProtectedRoute>
        } />
        <Route path="/admin/reading-submissions" element={
          <ProtectedRoute role="teacher">
            <AdminReadingSubmissions />
          </ProtectedRoute>
        } />
        <Route path="/admin/listening-submissions" element={
          <ProtectedRoute role="teacher">
            <AdminListeningSubmissions />
          </ProtectedRoute>
        } />
        <Route path="/admin/writing-submissions" element={
          <ProtectedRoute role="teacher">
            <AdminWritingSubmissions />
          </ProtectedRoute>
        } />
        
        {/* Cambridge KET Routes */}
        <Route path="/admin/create-ket-listening" element={
          <ProtectedRoute role="teacher">
            <CreateKETListeningTest />
          </ProtectedRoute>
        } />
        <Route path="/admin/create-ket-reading" element={
          <ProtectedRoute role="teacher">
            <CreateKETReadingTest />
          </ProtectedRoute>
        } />
        <Route path="/admin/create-pet-listening" element={
          <ProtectedRoute role="teacher">
            <CreatePETListeningTest />
          </ProtectedRoute>
        } />
        <Route path="/admin/create-pet-reading" element={
          <ProtectedRoute role="teacher">
            <CreatePETReadingTest />
          </ProtectedRoute>
        } />
        {/* Generic Cambridge create routes (PET/Flyers/Movers/Starters...) */}
        <Route path="/admin/create/:testType" element={
          <ProtectedRoute role="teacher">
            <CreateCambridgeTest />
          </ProtectedRoute>
        } />
        <Route path="/admin/create-:testType" element={
          <ProtectedRoute role="teacher">
            <CreateCambridgeTest />
          </ProtectedRoute>
        } />
        {/* Legacy compatibility for direct links */}
        <Route path="/admin/create-flyers" element={
          <ProtectedRoute role="teacher">
            <Navigate to="/admin/create/flyers" replace />
          </ProtectedRoute>
        } />
        <Route path="/admin/create-movers" element={
          <ProtectedRoute role="teacher">
            <CreateMoversReadingTest />
          </ProtectedRoute>
        } />
        <Route path="/admin/create-movers-listening" element={
          <ProtectedRoute role="teacher">
            <CreateMoversListeningTest />
          </ProtectedRoute>
        } />
        <Route path="/admin/create/movers" element={
          <ProtectedRoute role="teacher">
            <CreateMoversReadingTest />
          </ProtectedRoute>
        } />
        <Route path="/admin/create-starters" element={
          <ProtectedRoute role="teacher">
            <Navigate to="/admin/create/starters" replace />
          </ProtectedRoute>
        } />
        <Route path="/cambridge/reading/:id/edit" element={
          <ProtectedRoute role="teacher">
            <EditCambridgeReadingTest />
          </ProtectedRoute>
        } />
        <Route path="/cambridge/listening/:id/edit" element={
          <ProtectedRoute role="teacher">
            <EditCambridgeListeningTest />
          </ProtectedRoute>
        } />
        <Route path="/admin/cambridge-submissions" element={
          <ProtectedRoute role="teacher">
            <CambridgeSubmissionsPage />
          </ProtectedRoute>
        } />
        
        {/* Cambridge Student Routes */}
        <Route path="/cambridge" element={isAuthenticated ? <SelectCambridgeTest /> : <Navigate to="/login" replace />} />
        {/* Direct routes */}
        <Route path="/cambridge/reading/:id" element={isAuthenticated ? <DoCambridgeReadingTest /> : <Navigate to="/login" replace />} />
        <Route path="/cambridge/listening/:id" element={isAuthenticated ? <DoCambridgeListeningTest /> : <Navigate to="/login" replace />} />
        {/* Generic testType route: /cambridge/ket-listening/:id, /cambridge/pet-reading/:id, ... */}
        <Route path="/cambridge/:testType/:id" element={isAuthenticated ? <DoCambridgeTestEntry /> : <Navigate to="/login" replace />} />
        <Route path="/cambridge/result/:submissionId" element={isAuthenticated ? <CambridgeResultPage /> : <Navigate to="/login" replace />} />
        
        {/* Redirect legacy /admin to canonical writing submissions path */}
        <Route path="/admin" element={
          <ProtectedRoute role="teacher">
            <Navigate to="/admin/writing-submissions" replace />
          </ProtectedRoute>
        } />
        <Route path="/admin/teacher-permissions" element={
          <ProtectedRoute role="admin">
            <TeacherPermissionsPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute role="admin">
            <AdminUserManagement />
          </ProtectedRoute>
        } />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;

