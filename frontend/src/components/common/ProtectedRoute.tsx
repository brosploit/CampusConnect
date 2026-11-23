import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-slate-800/80 border border-red-500/30 rounded-xl shadow-2xl text-center">
        <div className="inline-flex p-4 bg-red-500/10 rounded-full text-red-400 mb-4">
          <ShieldAlert className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Access Denied (HTTP 403)</h2>
        <p className="text-slate-300 mb-6">
          Your account (Role: <span className="font-semibold text-emerald-400">{user.role}</span>) does not possess
          the required authorization privileges to view this administrative resource.
        </p>
        <p className="text-xs text-slate-400">
          This incident is subject to security audit logging in accordance with institutional policy.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
