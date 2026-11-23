import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Radio, Shield, LogOut, AlertCircle } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg group-hover:border-emerald-500 transition-colors">
            <Radio className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white block">Campus Connect</span>
            <span className="text-xs text-slate-400 block -mt-1">Connectivity Intelligence</span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center space-x-6">
          <Link
            to="/"
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Zone Overview
          </Link>

          {isAuthenticated && (
            <Link
              to="/report"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Report Issue
            </Link>
          )}

          {hasRole(['moderator', 'admin']) && (
            <Link
              to="/moderator"
              className="text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors flex items-center space-x-1"
            >
              <AlertCircle className="w-4 h-4" />
              <span>Issue Triage</span>
            </Link>
          )}

          {hasRole('admin') && (
            <Link
              to="/admin"
              className="text-sm font-medium text-sky-400 hover:text-sky-300 transition-colors flex items-center space-x-1"
            >
              <Shield className="w-4 h-4" />
              <span>Admin Console</span>
            </Link>
          )}
        </nav>

        {/* User Profile / Auth State */}
        <div className="flex items-center space-x-4">
          {isAuthenticated && user ? (
            <div className="flex items-center space-x-3">
              <div className="text-right hidden sm:block">
                <span className="text-sm font-medium text-slate-200 block">
                  {user.displayName || user.email}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold bg-slate-800 text-emerald-400 border border-emerald-500/20">
                  {user.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Secure Logout"
                aria-label="Secure Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
