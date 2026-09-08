import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ChartLoading from './components/ChartLoading';
import Login from './pages/Login';
import Register from './pages/Register';
import Tests from './pages/Tests';
import Vocab from './pages/Vocab';
import TranscriptHistory from './pages/TranscriptHistory';
import AdminTests from './pages/AdminTests';
import TestReview from './pages/TestReview';
import TestRoom from './pages/TestRoom';
import AdminTestEditor from './pages/AdminTestEditor';
import Profile from './pages/Profile';
import Landing from './pages/Landing';
import AdminUsers from './pages/AdminUsers';
import PasswordReset from './pages/PasswordReset';
import AdminAuditLogs from './pages/AdminAuditLogs';
import AdminTestPreview from './pages/AdminTestPreview';
import AdminUserDetail from './pages/AdminUserDetail';
const AdminVocab = lazy(() => import('./pages/AdminVocab'));

// Code-split các trang chứa biểu đồ để Recharts không phình chunk ban đầu.
// Recharts chỉ được tải khi người dùng thực sự vào các route này.
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Mistakes = lazy(() => import('./pages/Mistakes'));
const Achievements = lazy(() => import('./pages/Achievements'));
const Practice = lazy(() => import('./pages/Practice'));

function PageFallback() {
  return (
    <div className="page page-lg">
      <ChartLoading label="Đang tải trang..." />
    </div>
  );
}

// Simple PrivateRoute wrapper
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function getStoredUser(): { role?: string; isAdmin?: boolean } | null {
  try {
    const item = localStorage.getItem('user');
    if (!item || item === 'undefined') return null;
    return JSON.parse(item);
  } catch {
    return null;
  }
}

// Chặn học viên truy cập trang quản trị (BE vẫn bảo vệ bằng isAdmin, đây là lớp UX)
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  const user = getStoredUser();
  const isAdmin = user?.role === 'ADMIN' || user?.isAdmin === true;
  if (!isAdmin) {
    return <Navigate to="/tests" replace />;
  }
  return <>{children}</>;
};

// Trang chủ: khách xem landing, đã login thì vào thẳng app theo vai trò.
function HomeRoute() {
  const token = localStorage.getItem('token');
  if (token) {
    const user = getStoredUser();
    const isAdmin = user?.role === 'ADMIN' || user?.isAdmin === true;
    return <Navigate to={isAdmin ? "/dashboard" : "/tests"} replace />;
  }
  return <Landing />;
}

// Simple PublicRoute wrapper (prevents logged in users from seeing login)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  if (token) {
    const user = getStoredUser();
    const isAdmin = user?.role === 'ADMIN' || user?.isAdmin === true;
    return <Navigate to={isAdmin ? "/dashboard" : "/tests"} replace />;
  }
  return <>{children}</>;
};

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen text-slate-900 antialiased flex flex-col selection:bg-primary-500 selection:text-white">
        <Navbar />
        <main className="flex-1 w-full flex flex-col">
          <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<HomeRoute />} />
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
              path="/mistakes"
              element={
                <PrivateRoute>
                  <Mistakes />
                </PrivateRoute>
              }
            />
            <Route
              path="/achievements"
              element={
                <PrivateRoute>
                  <Achievements />
                </PrivateRoute>
              }
            />
            <Route
              path="/practice"
              element={
                <PrivateRoute>
                  <Practice />
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
                <AdminRoute>
                  <AdminTests />
                </AdminRoute>
              } 
            />
            <Route
              path="/admin/tests/:testId/edit"
              element={
                <AdminRoute>
                  <AdminTestEditor />
                </AdminRoute>
              }
            />
            <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
            <Route path="/admin/users/:userId" element={<AdminRoute><AdminUserDetail /></AdminRoute>} />
            <Route path="/admin/vocab" element={<AdminRoute><AdminVocab /></AdminRoute>} />
            <Route path="/admin/audit-logs" element={<AdminRoute><AdminAuditLogs /></AdminRoute>} />
            <Route path="/admin/tests/:testId/preview" element={<AdminRoute><AdminTestPreview /></AdminRoute>} />
            <Route 
              path="/dashboard" 
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              } 
            />
          </Routes>
          </Suspense>
        </main>
      </div>
    </BrowserRouter>
  );
}