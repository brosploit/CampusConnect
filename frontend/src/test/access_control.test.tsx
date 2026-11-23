import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../components/common/ProtectedRoute';
import * as AuthContextModule from '../context/AuthContext';

describe('Role-Based Access Control & Route Guarding', () => {
  it('redirects unauthenticated users away from protected routes to /login', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      hasRole: vi.fn().mockReturnValue(false),
      refreshUser: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <div data-testid="admin-content">Secret Admin Console</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div data-testid="login-page">Sign In Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByTestId('admin-content')).toBeNull();
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });

  it('blocks students from accessing admin routes with explicit 403 Access Denied view', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 'user-std-1',
        email: 'student@campus.edu',
        displayName: 'Student One',
        role: 'student',
        mfaEnabled: false,
        isVerified: true,
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      hasRole: vi.fn().mockImplementation((roles) => roles.includes('student')),
      refreshUser: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <div data-testid="admin-content">Secret Admin Console</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    // Administrative content must NOT render
    expect(screen.queryByTestId('admin-content')).toBeNull();

    // 403 Forbidden screen must render
    expect(screen.getByText(/Access Denied \(HTTP 403\)/i)).toBeInTheDocument();
    expect(screen.getByText(/does not possess the required authorization privileges/i)).toBeInTheDocument();
  });

  it('allows administrators to access admin protected routes', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 'user-admin-1',
        email: 'admin@campus.edu',
        displayName: 'Campus Admin',
        role: 'admin',
        mfaEnabled: true,
        isVerified: true,
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      hasRole: vi.fn().mockImplementation((roles) => roles.includes('admin')),
      refreshUser: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <div data-testid="admin-content">Secret Admin Console</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('admin-content')).toBeInTheDocument();
    expect(screen.queryByText(/Access Denied/i)).toBeNull();
  });
});
