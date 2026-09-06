import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Tests from './pages/Tests';
import Vocab from './pages/Vocab';
import TranscriptHistory from './pages/TranscriptHistory';
import AdminTests from './pages/AdminTests';
import TestReview from './pages/TestReview';
import TestRoom from './pages/TestRoom';
import Analytics from './pages/Analytics'; // Thêm import trang Thống kê cá nhân
import AdminTestEditor from './pages/AdminTestEditor';
import StudentDashboard from './pages/StudentDashboard';
import Profile from './pages/Profile';
import AdminUsers from './pages/AdminUsers';
import PasswordReset from './pages/PasswordReset';
import AdminAuditLogs from './pages/AdminAuditLogs';
import AdminTestPreview from './pages/AdminTestPreview';

// Simple PrivateRoute wrapper
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// Simple PublicRoute wrapper (prevents logged in users from seeing login)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  if (token) {
    return <Navigate to="/tests" replace />;
  }
  return <>{children}</>;
};

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen text-slate-900 antialiased flex flex-col selection:bg-indigo-500 selection:text-white">
        <Routes>
          <Route path="/tests/:id/room" element={<></>} />
          <Route path="/tests/review/:attemptId" element={<></>} />
          <Route path="*" element={<Navbar />} />
        </Routes>
        <main className="flex-1 w-full flex flex-col">
          <Routes>
            <Route path="/" element={<Navigate to="/tests" replace />} />
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } 
            />
            <Route path="/forgot-password" element={<PublicRoute><PasswordReset /></PublicRoute>} />
            <Route 
              path="/register" 
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              } 
            />
            <Route 
              path="/tests" 
              element={
                <PrivateRoute>
                  <Tests />
                </PrivateRoute>
              } 
            />
            <Route
              path="/student-dashboard"
              element={
                <PrivateRoute>
                  <StudentDashboard />
                </PrivateRoute>
              }
            />
            <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route 
              path="/vocab" 
              element={
                <PrivateRoute>
                  <Vocab />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/transcript" 
              element={
                <PrivateRoute>
                  <TranscriptHistory />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/analytics" 
              element={
                <PrivateRoute>
                  <Analytics />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/tests/:id/room" 
              element={
                <PrivateRoute>
                  <TestRoom />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/tests/review/:attemptId" 
              element={
                <PrivateRoute>
                  <TestReview />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <PrivateRoute>
                  <AdminTests />
                </PrivateRoute>
              } 
            />
            <Route
              path="/admin/tests/:testId/edit"
              element={
                <PrivateRoute>
                  <AdminTestEditor />
                </PrivateRoute>
              }
            />
            <Route path="/admin/users" element={<PrivateRoute><AdminUsers /></PrivateRoute>} />
            <Route path="/admin/audit-logs" element={<PrivateRoute><AdminAuditLogs /></PrivateRoute>} />
            <Route path="/admin/tests/:testId/preview" element={<PrivateRoute><AdminTestPreview /></PrivateRoute>} />
            <Route 
              path="/dashboard" 
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              } 
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}