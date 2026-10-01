import { create } from "zustand";
export interface User {
  idUser: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  emailVerified: boolean;
  createdAt: Date;
  roles: string[];
  permissions: string[];
}
interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isAuthVerified: boolean;
  setAuth: (user: User, token: string) => void;
  setAccessToken: (token: string) => void;
  setUser: (user: User) => void;
  clearAuth: () => void;
  setAuthVerified: (verified: boolean) => void;
}
export const useAuth = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isAuthVerified: false,
  setAuth: (user, accessToken) =>
    set({ user, accessToken, isAuthenticated: true, isAuthVerified: true }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setUser: (user) => set({ user, isAuthenticated: true }),
  clearAuth: () =>
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isAuthVerified: true,
    }),
  setAuthVerified: (isAuthVerified) => set({ isAuthVerified }),
}));
