import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';
import LoadingSpinner from './components/LoadingSpinner';
import { Toaster } from 'react-hot-toast';

// Lazy load pages
const LoginPage = lazy(() => import('./pages/LoginPage').then(module => ({ default: module.default })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(module => ({ default: module.default })));
const TimetablePage = lazy(() => import('./pages/TimetablePage').then(module => ({ default: module.default })));
const SeatAllocationPage = lazy(() => import('./pages/SeatAllocationPage').then(module => ({ default: module.default })));
const StudentsPage = lazy(() => import('./pages/StudentsPage').then(module => ({ default: module.default })));
const FacultyPage = lazy(() => import('./pages/FacultyPage').then(module => ({ default: module.default })));
const RoomsPage = lazy(() => import('./pages/RoomsPage').then(module => ({ default: module.default })));
const ExamsPage = lazy(() => import('./pages/ExamsPage').then(module => ({ default: module.default })));
const ConflictsPage = lazy(() => import('./pages/ConflictsPage').then(module => ({ default: module.default })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then(module => ({ default: module.default })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then(module => ({ default: module.default })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(module => ({ default: module.default })));

// Loading fallback
const PageLoading = () => (
  <div className="min-h-screen flex items-center justify-center">
    <LoadingSpinner size="lg" />
  </div>
);

// Protected route wrapper
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Public route (redirects if authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoading />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      {/* Protected routes with layout */}
      <Route element={
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      }>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/timetable" element={<TimetablePage />} />
        <Route path="/seat-allocation" element={<SeatAllocationPage />} />
        <Route path="/students" element={<StudentsPage />} />
        <Route path="/faculty" element={<FacultyPage />} />
        <Route path="/rooms" element={<RoomsPage />} />
        <Route path="/exams" element={<ExamsPage />} />
        <Route path="/conflicts" element={<ConflictsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Redirect root to dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoading />}>
          <AppRoutes />
        </Suspense>
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;