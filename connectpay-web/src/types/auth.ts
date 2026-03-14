// src/types/auth.ts

export interface User {
  id:              string;
  name:            string;
  email:           string;
  phone:           string;
  username:        string;
  isPinSetup:      boolean;   // ← added: used to redirect to pin-setup after login
  isEmailVerified: boolean;   // ← added: for future email verification UI
}

export interface AuthContextType {
  user:            User | null;
  loading:         boolean;
  login:           (credentials: { email: string; password: string }) => Promise<User>; // ← returns User so login page can check isPinSetup
  logout:          () => Promise<void>;
  isAuthenticated: boolean;
  balance:         number;
  refreshBalance:  () => Promise<void>;
}

export interface LoginFormData {
  emailOrPhone: string;
  password:     string;
}

export interface RegisterFormData {
  fullName:        string;
  username:        string;
  phone:           string;
  email:           string;
  password:        string;
  confirmPassword: string;
}