import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SHMProvider } from './context/SHMContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { LiveOverviewPage } from './pages/LiveOverviewPage';
import { HistoricalAnalyticsPage } from './pages/HistoricalAnalyticsPage';
import { SensorsDirectoryPage } from './pages/SensorsDirectoryPage';
import { AlertsEventsPage } from './pages/AlertsEventsPage';
import { SystemAdminPage } from './pages/SystemAdminPage';
import { SignInPage } from './pages/SignInPage';

// Protected Route Wrapper: Requires authenticated user
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/signin" replace />;
  }
  return <>{children}</>;
};

// Admin Only Route Wrapper
const ProtectedAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/signin" replace />;
  }
  if (user.role !== 'admin') {
    return <SystemAdminPage />; // Will render Access Denied view in SystemAdminPage
  }
  return <>{children}</>;
};

const MainLayout: React.FC = () => {
  const { user } = useAuth();

  // If user is not logged in, show full-page Sign In screen without main app navigation
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Routes>
          <Route path="/signin" element={<SignInPage />} />
          <Route path="*" element={<Navigate to="/signin" replace />} />
        </Routes>
      </div>
    );
  }

  // When user is authenticated, render full application header, sidebar & routes
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Header />
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar />
        <main style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', backgroundColor: 'var(--bg-primary)' }}>
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <LiveOverviewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <HistoricalAnalyticsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sensors"
              element={
                <ProtectedRoute>
                  <SensorsDirectoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/alerts"
              element={
                <ProtectedRoute>
                  <AlertsEventsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedAdminRoute>
                  <SystemAdminPage />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedAdminRoute>
                  <SystemAdminPage />
                </ProtectedAdminRoute>
              }
            />
            <Route path="/signin" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <SHMProvider>
        <BrowserRouter>
          <MainLayout />
        </BrowserRouter>
      </SHMProvider>
    </AuthProvider>
  );
};

export default App;
