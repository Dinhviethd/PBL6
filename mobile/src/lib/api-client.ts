export type User = {
  idUser: string;
  name: string;
  email: string;
  roles: string[];
};
export type TokenStorage = {
  read(): Promise<string | null>;
  write(value: string): Promise<void>;
  clear(): Promise<void>;
};
export class ApiError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 0, code = "NETWORK") {
    super(message);
    this.status = status;
    this.code = code;
  }
}
type Session = { user: User; accessToken: string; refreshToken?: string };
export function createApiClient(options: {
  baseUrl: string;
  native: boolean;
  storage: TokenStorage;
  fetcher?: typeof fetch;
  onSessionLost?: () => void;
}) {
  const fetcher = options.fetcher ?? fetch;
  let accessToken: string | null = null;
  let epoch = 0;
  let refreshTask: Promise<void> | null = null;
  let storageTask: Promise<void> = Promise.resolve();
  const store = (fn: () => Promise<void>) => {
    storageTask = storageTask.catch(() => {}).then(fn);
    return storageTask;
  };
  async function raw<T>(
    path: string,
    method = "GET",
    body?: unknown,
    headers: Record<string, string> = {},
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetcher(`${options.baseUrl}${path}`, {
        method,
        headers: { "Content-Type": "application/json", ...headers },
        credentials: options.native ? "omit" : "include",
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success)
        throw new ApiError(
          result?.message ?? "Máy chủ chưa trả về dữ liệu hợp lệ.",
          response.status,
          result?.code ?? "SERVER",
        );
      return result.data as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.",
      );
    } finally {
      clearTimeout(timer);
    }
  }
  async function clear() {
    epoch++;
    accessToken = null;
    await store(() => options.storage.clear());
    options.onSessionLost?.();
  }
  async function refresh() {
    if (!refreshTask) {
      const generation = epoch;
      refreshTask = (async () => {
        await storageTask;
        const token = options.native ? await options.storage.read() : null;
        if (options.native && !token)
          throw new ApiError("Vui lòng đăng nhập.", 401, "INVALID_SESSION");
        const result = await raw<{
          accessToken: string;
          refreshToken?: string;
        }>(
          options.native ? "/auth/mobile/refresh-token" : "/auth/refresh-token",
          "POST",
          options.native ? { refreshToken: token } : {},
        );
        if (generation !== epoch)
          throw new ApiError(
            "Phiên đăng nhập đã thay đổi.",
            401,
            "SESSION_CHANGED",
          );
        if (options.native) {
          if (!result.refreshToken)
            throw new ApiError("Phiên đăng nhập không hợp lệ.", 401);
          await store(async () => {
            if (generation === epoch)
              await options.storage.write(result.refreshToken!);
          });
        }
        if (generation === epoch) accessToken = result.accessToken;
      })().finally(() => {
        refreshTask = null;
      });
    }
    return refreshTask;
  }
  async function request<T>(
    path: string,
    method = "GET",
    body?: unknown,
    headers: Record<string, string> = {},
  ): Promise<T> {
    const generation = epoch;
    const usedToken = accessToken;
    const perform = () =>
      raw<T>(path, method, body, {
        ...headers,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      });
    try {
      return await perform();
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.status === 401 &&
        !path.startsWith("/auth/")
      ) {
        try {
          if (generation !== epoch)
            throw new ApiError("Phiên đã thay đổi.", 401, "SESSION_CHANGED");
          if (usedToken === accessToken) await refresh();
          return await perform();
        } catch (retryError) {
          if (
            retryError instanceof ApiError &&
            [401, 403].includes(retryError.status) &&
            generation === epoch
          )
            await clear();
          throw retryError;
        }
      }
      if (
        error instanceof ApiError &&
        error.code === "ACCOUNT_DISABLED" &&
        generation === epoch
      )
        await clear();
      throw error;
    }
  }
  return {
    request,
    async authenticate(
      mode: "login" | "register",
      payload: Record<string, string>,
    ) {
      const generation = ++epoch;
      const result = await raw<Session>(
        `/auth/${options.native ? "mobile/" : ""}${mode}`,
        "POST",
        payload,
      );
      if (options.native) {
        if (!result.refreshToken)
          throw new ApiError("Không nhận được phiên đăng nhập.", 401);
        await store(async () => {
          if (generation === epoch)
            await options.storage.write(result.refreshToken!);
        });
      }
      if (generation !== epoch) throw new ApiError("Phiên đã thay đổi.", 401);
      accessToken = result.accessToken;
      return result.user;
    },
    async restore() {
      try {
        await refresh();
        return await request<User>("/auth/me");
      } catch (error) {
        if (error instanceof ApiError && [401, 403].includes(error.status)) {
          await clear();
          return null;
        }
        throw error;
      }
    },
    async logout() {
      try {
        if (accessToken) {
          try {
            await raw(
              "/auth/logout",
              "POST",
              {},
              { Authorization: `Bearer ${accessToken}` },
            );
          } catch (error) {
            if (!(error instanceof ApiError) || error.status !== 401)
              throw error;
            await refresh();
            await raw(
              "/auth/logout",
              "POST",
              {},
              { Authorization: `Bearer ${accessToken}` },
            );
          }
        }
      } finally {
        await clear();
      }
    },
  };
}
