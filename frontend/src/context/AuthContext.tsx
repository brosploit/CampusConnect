import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole } from '../types';
import { apiClient, setCsrfToken, registerSessionExpiredCallback } from '../api/client';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, totpCode?: string) => Promise<{ requiresMfa?: boolean }>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const data = await apiClient<{ user: User }>('/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    registerSessionExpiredCallback(() => {
      setUser(null);
    });
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = async (email: string, password: string, totpCode?: string) => {
    const response = await apiClient<{
      user?: User;
      requiresMfa?: boolean;
      requiresMfaChallenge?: boolean;
      requiresMfaSetup?: boolean;
      csrfToken?: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, totpCode }),
    });

    if (response.requiresMfa || response.requiresMfaChallenge || response.requiresMfaSetup) {
      return { requiresMfa: true };
    }

    if (response.csrfToken) {
      setCsrfToken(response.csrfToken);
    }

    if (response.user) {
      setUser(response.user);
    }
    return {};
  };

  const register = async (email: string, password: string, displayName?: string) => {
    const response = await apiClient<{
      user: User;
      csrfToken?: string;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    });

    if (response.csrfToken) {
      setCsrfToken(response.csrfToken);
    }
    setUser(response.user);
  };

  const logout = async () => {
    try {
      await apiClient('/auth/logout', { method: 'POST', body: JSON.stringify({}) });
    } catch {
      // Safe silence on logout errors
    } finally {
      setCsrfToken(null);
      setUser(null);
    }
  };

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    const allowed = Array.isArray(roles) ? roles : [roles];
    return allowed.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        hasRole,
        refreshUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
