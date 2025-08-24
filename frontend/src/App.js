import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';


import WritingTest from './pages/WritingTest';
import AdminSubmissions from './pages/AdminSubmissions';
import Login from './pages/Login';
import CreateWritingTest from './pages/CreateWritingTest';
import SelectTest from './pages/SelectTest';
import ProtectedRoute from './components/ProtectedRoute';
import MyFeedback from './pages/MyFeedback';
import ReviewSubmission from './pages/ReviewSubmission';

import Review from './pages/Review';
import CreateListeningTest from './pages/CreateListeningTest';
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
        <Route path="/admin/create-listening" element={
          <ProtectedRoute role="teacher">
            <CreateListeningTest />
          </ProtectedRoute>
        } />
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
        {/* ✅ Trang giáo viên xem bài làm */}
        <Route path="/admin" element={
          <ProtectedRoute role="teacher">
            <AdminSubmissions />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;
