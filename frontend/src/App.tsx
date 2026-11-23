import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { OverviewPage } from './pages/OverviewPage';
import { ZoneDetailPage } from './pages/ZoneDetailPage';
import { SubmitReportPage } from './pages/SubmitReportPage';
import { ModeratorQueuePage } from './pages/ModeratorQueuePage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Public & Student Routes */}
              <Route path="/" element={<OverviewPage />} />
              <Route path="/zones/:id" element={<ZoneDetailPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Student Authenticated Route */}
              <Route
                path="/report"
                element={
                  <ProtectedRoute>
                    <SubmitReportPage />
                  </ProtectedRoute>
                }
              />

              {/* Moderator / Admin Guarded Route */}
              <Route
                path="/moderator"
                element={
                  <ProtectedRoute allowedRoles={['moderator', 'admin']}>
                    <ModeratorQueuePage />
                  </ProtectedRoute>
                }
              />

              {/* Administrator Only Guarded Route */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboardPage />
                  </ProtectedRoute>
                }
              />

              {/* Safe 404 Route */}
              <Route
                path="*"
                element={
                  <div className="max-w-md mx-auto py-24 text-center">
                    <h2 className="text-4xl font-extrabold text-white mb-2">404</h2>
                    <p className="text-slate-400 mb-6">The requested page does not exist or has moved.</p>
                    <Link
                      to="/"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors"
                    >
                      Return to Overview
                    </Link>
                  </div>
                }
              />
            </Routes>
          </main>
          <footer className="bg-slate-950/80 border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
            Campus Connect Connectivity Intelligence • Zero Student Tracking • Privacy & K-Anonymity Guarded
          </footer>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
