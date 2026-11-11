import { Platform } from "react-native";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { createApiClient } from "./api-client";
import {
  publishSessionChange,
  sessionChangeKey,
  withBrowserRefreshLock,
} from "./browser-session";

// Expo Go's host is the development computer, unlike localhost on a phone.
const devHost = Constants.expoConfig?.hostUri?.split(":")[0];
export const apiUrl: string = (
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === "web"
    ? "/api"
    : __DEV__
      ? `http://${devHost || (Platform.OS === "android" ? "10.0.2.2" : "localhost")}:8000/api`
      : "")
).replace(/\/$/, "");
if (Platform.OS !== "web" && !apiUrl)
  throw new Error("EXPO_PUBLIC_API_URL is required for native release builds.");
if (Platform.OS !== "web" && !__DEV__ && !apiUrl.startsWith("https://"))
  throw new Error("Native release builds require an HTTPS API.");
// Refresh tokens belong to one server. Never restore a local test token on Live.
const refreshKey = `eventhub.refresh.${Array.from(apiUrl)
  .map((c) => c.charCodeAt(0).toString(16).padStart(4, "0"))
  .join("")}`;
let lost: () => void = () => {};
export function onSessionLost(callback: () => void) {
  lost = callback;
}
export const api = createApiClient({
  baseUrl: apiUrl,
  native: Platform.OS !== "web",
  onSessionLost: () => lost(),
  onSessionChanged: Platform.OS === "web" ? publishSessionChange : undefined,
  withRefreshLock: Platform.OS === "web" ? withBrowserRefreshLock : undefined,
  storage: {
    read: () => SecureStore.getItemAsync(refreshKey),
    write: (value) =>
      SecureStore.setItemAsync(refreshKey, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      }),
    clear: async () => {
      if (Platform.OS !== "web") await SecureStore.deleteItemAsync(refreshKey);
    },
  },
});
if (Platform.OS === "web" && typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === sessionChangeKey && event.newValue) void api.invalidate();
  });
}
export const mediaUrl = (url?: string) =>
  url?.startsWith("/") ? `${apiUrl.replace(/\/api$/, "")}${url}` : url;
