import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuth } from "../features/auth/stores/authStore";
const baseURL = import.meta.env.VITE_API_BASE_URL || "/api";
const api = axios.create({ baseURL, withCredentials: true, timeout: 15000 });
let refresh: Promise<string> | null = null;
api.interceptors.request.use((config) => {
  const token = useAuth.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const request = error.config as
      (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (
      error.response?.status === 401 &&
      request &&
      !request._retry &&
      !/auth\/(login|register|refresh-token|reset|forgot|verify)/.test(
        request.url || "",
      )
    ) {
      request._retry = true;
      try {
        if (!refresh)
          refresh = axios
            .post(
              `${baseURL}/auth/refresh-token`,
              {},
              { withCredentials: true },
            )
            .then((r) => {
              const token = r.data.data.accessToken as string;
              useAuth.getState().setAccessToken(token);
              return token;
            })
            .finally(() => {
              refresh = null;
            });
        request.headers.Authorization = `Bearer ${await refresh}`;
        return api(request);
      } catch (e) {
        useAuth.getState().clearAuth();
        return Promise.reject(e);
      }
    }
    return Promise.reject(error);
  },
);
export default api;
