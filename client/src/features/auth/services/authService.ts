import api from "../../../lib/api";
import { notifySessionChange, useAuth, type User } from "../stores/authStore";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface VerifyOTPRequest {
  email: string;
  otp: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    accessToken: string;
  };
}

export interface ApiResponse<T = null> {
  success: boolean;
  message: string;
  data?: T;
}

export const authService = {
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/auth/register", data);
    if (response.data.success && response.data.data) {
      const { user, accessToken } = response.data.data;
      useAuth.getState().setAuth(user, accessToken);
      notifySessionChange();
    }

    return response.data;
  },

  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/auth/login", data);

    if (response.data.success && response.data.data) {
      const { user, accessToken } = response.data.data;
      useAuth.getState().setAuth(user, accessToken);
      notifySessionChange();
    }

    return response.data;
  },

  async logout(): Promise<ApiResponse> {
    const revision = useAuth.getState().revision;
    try {
      const response = await api.post<ApiResponse>("/auth/logout");
      return response.data;
    } finally {
      if (useAuth.getState().revision === revision) {
        useAuth.getState().clearAuth();
        notifySessionChange();
      }
    }
  },

  async getCurrentUser(): Promise<ApiResponse<User>> {
    const response = await api.get<ApiResponse<User>>("/auth/me");

    if (response.data.success && response.data.data) {
      useAuth.getState().setUser(response.data.data);
    }

    return response.data;
  },

  async forgotPassword(data: ForgotPasswordRequest): Promise<ApiResponse> {
    const response = await api.post<ApiResponse>("/auth/forgot-password", data);
    return response.data;
  },

  async verifyOTP(
    data: VerifyOTPRequest,
  ): Promise<ApiResponse<{ valid: boolean }>> {
    const response = await api.post<ApiResponse<{ valid: boolean }>>(
      "/auth/verify-otp",
      data,
    );
    return response.data;
  },

  async resetPassword(data: ResetPasswordRequest): Promise<ApiResponse> {
    const response = await api.post<ApiResponse>("/auth/reset-password", data);
    return response.data;
  },
};

export default authService;
