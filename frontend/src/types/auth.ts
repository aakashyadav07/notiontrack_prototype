export interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'FACULTY' | 'STUDENT';
  isActive: boolean;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  role: 'ADMIN' | 'FACULTY' | 'STUDENT';
}

export interface RegisterResponse {
  user: User;
  accessToken: string;
}

export interface RefreshTokenRequest {
  refreshToken?: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}