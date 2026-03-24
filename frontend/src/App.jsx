import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import from new feature-based structure
import { EditTest, AdminWritingSubmissions, SelectTest, MyFeedback, ReviewSubmission, Review, AdminReadingSubmissions, AdminListeningSubmissions, CambridgeSubmissionsPage, TeacherPermissionsPage, AdminUserManagement } from './features/admin';
import { WritingTest, CreateWritingTest, PetWritingTest, CreatePetWritingTest, SelectPetWritingTest, EditPetWritingTest } from './features/writing';
import { Login } from './features/auth';
import { CreateReadingTest, EditReadingTest, DoReadingTest, TakeReadingTest, ReadingResults } from './features/reading';
import { CreateListeningTest, EditListeningTest, DoListeningTest, ListeningResults } from './features/listening';
import { CreateKETListeningTest, CreateKETReadingTest, CreatePETListeningTest, CreatePETReadingTest, CreateCambridgeTest, CreateMoversReadingTest, CreateMoversListeningTest, EditCambridgeReadingTest, EditCambridgeListeningTest, SelectCambridgeTest, DoCambridgeTestEntry, DoCambridgeListeningTest, DoCambridgeReadingTest, CambridgeResultPage } from './features/cambridge';
import { ProtectedRoute } from './shared/components';
import { refreshAccessToken } from './shared/utils/api';

const isLoggedIn = () => {
  const user = localStorage.getItem('user');
  return !!user;
};

function App() {
  useEffect(() => {
    // Always try to refresh on mount if user is stored (rehydrates from httpOnly session cookie)
    const tryRefresh = () => {
      if (localStorage.getItem('user')) refreshAccessToken();
    };

    tryRefresh();

    // Proactive refresh every 10 minutes to keep session alive
    const intervalId = setInterval(tryRefresh, 10 * 60 * 1000);

    // Refresh when tab becomes visible again (handles PC wake-up / long idle)
    const onVisible = () => {
      if (document.visibilityState === 'visible') tryRefresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    // When server rejects refresh token (session truly expired), redirect to login
    const onForceLogout = () => {
      window.location.href = '/login?reason=expired';
    };
    window.addEventListener('auth:force-logout', onForceLogout);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('auth:force-logout', onForceLogout);
    };
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* ✅ Trang cho học sinh chọn đề */}
        <Route path="/" element={isLoggedIn() ? <SelectTest /> : <Navigate to="/login" replace />} />
        <Route path="/select-test" element={isLoggedIn() ? <SelectTest /> : <Navigate to="/login" replace />} />
        {/* ✅ Trang làm bài viết */}
        <Route path="/writing" element={isLoggedIn() ? <WritingTest /> : <Navigate to="/login" replace />} />
        <Route path="/writing-test" element={<WritingTest />} />
        <Route path="/pet-writing" element={isLoggedIn() ? <PetWritingTest /> : <Navigate to="/login" replace />} />
        <Route path="/pet-writing-select" element={isLoggedIn() ? <SelectPetWritingTest /> : <Navigate to="/login" replace />} />
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
        <Route path="/reading-tests/:testId" element={isLoggedIn() ? <TakeReadingTest /> : <Navigate to="/login" replace />} />
        <Route path="/reading-tests" element={isLoggedIn() ? <SelectTest /> : <Navigate to="/login" replace />} />
        <Route path="/reading/:id" element={isLoggedIn() ? <DoReadingTest /> : <Navigate to="/login" replace />} />
        <Route path="/reading-results/:id" element={isLoggedIn() ? <ReadingResults /> : <Navigate to="/login" replace />} />
        
        {/* Listening Test Routes */}
        <Route path="/listening/:id" element={isLoggedIn() ? <DoListeningTest /> : <Navigate to="/login" replace />} />
        <Route path="/listening/:id/edit" element={
          <ProtectedRoute role="teacher">
            <EditListeningTest />
          </ProtectedRoute>
        } />
        <Route path="/listening-results/:id" element={isLoggedIn() ? <ListeningResults /> : <Navigate to="/login" replace />} />
        
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
        <Route path="/cambridge" element={isLoggedIn() ? <SelectCambridgeTest /> : <Navigate to="/login" replace />} />
        {/* Direct routes */}
        <Route path="/cambridge/reading/:id" element={isLoggedIn() ? <DoCambridgeReadingTest /> : <Navigate to="/login" replace />} />
        <Route path="/cambridge/listening/:id" element={isLoggedIn() ? <DoCambridgeListeningTest /> : <Navigate to="/login" replace />} />
        {/* Generic testType route: /cambridge/ket-listening/:id, /cambridge/pet-reading/:id, ... */}
        <Route path="/cambridge/:testType/:id" element={isLoggedIn() ? <DoCambridgeTestEntry /> : <Navigate to="/login" replace />} />
        <Route path="/cambridge/result/:submissionId" element={isLoggedIn() ? <CambridgeResultPage /> : <Navigate to="/login" replace />} />
        
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
    </Router>
  );
}

export default App;
