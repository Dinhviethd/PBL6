import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import {
  sessionChangedMessage,
  useAuth,
  type User,
} from "../features/auth/stores/authStore";

const baseURL = import.meta.env.VITE_API_BASE_URL || "/api";
const api = axios.create({ baseURL, withCredentials: true, timeout: 15000 });
type BoundRequest = InternalAxiosRequestConfig & {
  _session?: { revision: number; userId: string | null; token: string | null };
  _retry?: boolean;
};
const changed = () =>
  Object.assign(new Error(sessionChangedMessage), { code: "SESSION_CHANGED" });
function assertCurrent(request: BoundRequest) {
  if (request._session?.revision !== useAuth.getState().revision)
    throw changed();
}
let refresh: { revision: number; task: Promise<string> } | null = null;

async function refreshFor(request: BoundRequest) {
  const { revision, userId } = request._session!;
  if (!refresh || refresh.revision !== revision) {
    const task = (async () => {
      const response = await axios.post(
        `${baseURL}/auth/refresh-token`,
        {},
        {
          withCredentials: true,
          timeout: 15000,
        },
      );
      assertCurrent(request);
      const token = response.data.data.accessToken as string;
      // Check the new principal before accepting a token from the shared cookie.
      // This also protects tabs that missed a cross-tab invalidation signal.
      const profile = await axios.get<{ data: User }>(`${baseURL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000,
      });
      assertCurrent(request);
      if (userId !== null && profile.data.data.idUser !== userId) {
        useAuth.getState().clearAuth(sessionChangedMessage);
        throw changed();
      }
      useAuth.getState().setAccessToken(token);
      return token;
    })();
    refresh = { revision, task };
    void task
      .finally(() => {
        if (refresh?.task === task) refresh = null;
      })
      .catch(() => {});
  }
  return refresh.task;
}

api.interceptors.request.use((config: BoundRequest) => {
  const state = useAuth.getState();
  if (!config._session)
    config._session = {
      revision: state.revision,
      userId: state.user?.idUser ?? null,
      token: state.accessToken,
    };
  assertCurrent(config);
  if (state.accessToken)
    config.headers.Authorization = `Bearer ${state.accessToken}`;
  else config.headers.delete("Authorization");
  return config;
});
api.interceptors.response.use(
  (response) => {
    assertCurrent(response.config as BoundRequest);
    return response;
  },
  async (error: AxiosError) => {
    const request = error.config as BoundRequest | undefined;
    if (!request?._session) throw error;
    assertCurrent(request);
    if (
      error.response?.status !== 401 ||
      request._retry ||
      /auth\/(login|register|refresh-token|reset|forgot|verify)/.test(
        request.url || "",
      )
    )
      throw error;

    // Only bootstrap may acquire a cookie session without a bound user.
    if (request._session.userId === null && request.url !== "/auth/me")
      throw error;
    request._retry = true;
    try {
      if (request._session.token === useAuth.getState().accessToken)
        await refreshFor(request);
      assertCurrent(request);
    } catch (refreshError) {
      const state = useAuth.getState();
      if (
        state.revision === request._session.revision &&
        axios.isAxiosError(refreshError) &&
        [401, 403].includes(refreshError.response?.status ?? 0) &&
        (state.user || state.accessToken)
      )
        state.clearAuth();
      throw refreshError;
    }
    return api(request);
  },
);
export default api;
