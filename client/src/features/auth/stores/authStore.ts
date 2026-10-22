import { create } from "zustand";
import {
  publishSessionChange,
  sessionChangeKey,
} from "../../../lib/browser-session";
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
  revision: number;
  sessionNotice: string;
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isAuthVerified: boolean;
  setAuth: (user: User, token: string) => void;
  setAccessToken: (token: string) => void;
  setUser: (user: User) => void;
  clearAuth: (notice?: string) => void;
  setAuthVerified: (verified: boolean) => void;
}
export const useAuth = create<AuthState>((set) => ({
  revision: 0,
  sessionNotice: "",
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isAuthVerified: false,
  setAuth: (user, accessToken) =>
    set((s) => ({
      user,
      accessToken,
      revision: s.revision + 1,
      sessionNotice: "",
      isAuthenticated: true,
      isAuthVerified: true,
    })),
  setAccessToken: (accessToken) => set({ accessToken }),
  setUser: (user) => set({ user, isAuthenticated: true }),
  clearAuth: (notice = "") =>
    set((s) => ({
      revision: s.revision + 1,
      sessionNotice: notice,
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isAuthVerified: true,
    })),
  setAuthVerified: (isAuthVerified) => set({ isAuthVerified }),
}));

// Only an invalidation signal is shared. Credentials and profiles stay in memory.
export const sessionChangedMessage =
  "Phiên đăng nhập đã thay đổi. Vui lòng đăng nhập lại và thực hiện lại thao tác.";
export const notifySessionChange = publishSessionChange;
window.addEventListener("storage", (event) => {
  if (event.key === sessionChangeKey && event.newValue)
    useAuth.getState().clearAuth(sessionChangedMessage);
});
