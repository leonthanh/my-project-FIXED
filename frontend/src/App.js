import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import from new feature-based structure
import { EditTest, AdminWritingSubmissions, SelectTest, MyFeedback, ReviewSubmission, Review, AdminReadingSubmissions } from './features/admin';
import { WritingTest, CreateWritingTest } from './features/writing';
import { Login } from './features/auth';
import { CreateReadingTest, EditReadingTest, DoReadingTest, TakeReadingTest, ReadingResults } from './features/reading';
import { CreateListeningTest } from './features/listening';
import { ProtectedRoute } from './shared/components';

const isLoggedIn = () => {
  const user = localStorage.getItem('user');
  return !!user;
};

function App() {
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
        <Route path="/admin/writing-submissions" element={
          <ProtectedRoute role="teacher">
            <AdminWritingSubmissions />
          </ProtectedRoute>
        } />
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
