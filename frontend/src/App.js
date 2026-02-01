import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import from new feature-based structure
import { EditTest, AdminWritingSubmissions, SelectTest, MyFeedback, ReviewSubmission, Review, AdminReadingSubmissions, AdminListeningSubmissions, CambridgeSubmissionsPage } from './features/admin';
import { WritingTest, CreateWritingTest } from './features/writing';
import { Login } from './features/auth';
import { CreateReadingTest, EditReadingTest, DoReadingTest, TakeReadingTest, ReadingResults } from './features/reading';
import { CreateListeningTest, EditListeningTest, DoListeningTest, ListeningResults } from './features/listening';
import { CreateKETListeningTest, CreateKETReadingTest, CreateCambridgeTest, EditCambridgeReadingTest, EditCambridgeListeningTest, SelectCambridgeTest, DoCambridgeTestEntry, DoCambridgeListeningTest, DoCambridgeReadingTest, CambridgeResultPage } from './features/cambridge';
import { ProtectedRoute } from './shared/components';
import { refreshAccessToken } from './shared/utils/api';

const isLoggedIn = () => {
  const user = localStorage.getItem('user');
  return !!user;
};

function App() {
  useEffect(() => {
    const hasAccessToken = () => !!localStorage.getItem('accessToken');

    const refresh = () => {
      if (hasAccessToken()) {
        refreshAccessToken();
      }
    };

    // Run once on mount if token exists
    refresh();

    // refresh every 10 minutes
    const intervalId = setInterval(refresh, 10 * 60 * 1000);
    return () => clearInterval(intervalId);
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
        <Route path="/my-feedback" element={<MyFeedback />} />
        {/* ✅ Trang giáo viên tạo đề */}
        <Route path="/admin/create-writing" element={
          <ProtectedRoute role="teacher">
            <CreateWritingTest />
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
        {/* Generic Cambridge create routes (PET/Flyers/Movers/Starters...) */}
        <Route path="/admin/create-:testType" element={
          <ProtectedRoute role="teacher">
            <CreateCambridgeTest />
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
      </Routes>
    </Router>
  );
}

export default App;
