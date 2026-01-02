// src/types/auth.ts
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  username: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

export interface LoginFormData {
  emailOrPhone: string;
  password: string;
}

export interface RegisterFormData {
  fullName: string;
  username: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  balance: number;
  refreshBalance: () => Promise<void>;
}