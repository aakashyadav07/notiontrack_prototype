import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi } from '../api/auth';
import type { User, AuthState, LoginRequest, RegisterRequest } from '../types/auth';

interface AuthContextType extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setState(prev => ({ ...prev, isLoading: false, isAuthenticated: false }));
      return;
    }

    try {
      const user = await authApi.getMe();
      setState(prev => ({
        ...prev,
        user,
        accessToken: token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      setState(prev => ({
        ...prev,
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      }));
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (credentials: LoginRequest) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const { user, accessToken } = await authApi.login(credentials);
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('user', JSON.stringify(user));
      setState({
        user,
        accessToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      throw error;
    }
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const { user, accessToken } = await authApi.register(data);
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('user', JSON.stringify(user));
      setState({
        user,
        accessToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      setState({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      setState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Password change failed';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      throw error;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, changePassword, refreshUser, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}