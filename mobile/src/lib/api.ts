import { Platform } from "react-native";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { createApiClient } from "./api-client";

// Expo Go's host is the development computer, unlike localhost on a phone.
const devHost = Constants.expoConfig?.hostUri?.split(":")[0];
export const apiUrl = (
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
let lost: () => void = () => {};
export function onSessionLost(callback: () => void) {
  lost = callback;
}
export const api = createApiClient({
  baseUrl: apiUrl,
  native: Platform.OS !== "web",
  onSessionLost: () => lost(),
  storage: {
    read: () => SecureStore.getItemAsync("eventhub.refresh"),
    write: (value) =>
      SecureStore.setItemAsync("eventhub.refresh", value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      }),
    clear: async () => {
      if (Platform.OS !== "web")
        await SecureStore.deleteItemAsync("eventhub.refresh");
    },
  },
});
export const mediaUrl = (url?: string) =>
  url?.startsWith("/") ? `${apiUrl.replace(/\/api$/, "")}${url}` : url;
