import type { ExpoConfig } from "expo/config";
const dev = process.env.APP_VARIANT === "development";
const config: ExpoConfig = {
  name: "EventHub",
  slug: "eventhub-mobile",
  scheme: "eventhub",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.pbl6.eventhub",
    infoPlist: {
      NSLocalNetworkUsageDescription:
        "Kết nối máy chủ EventHub trong mạng nội bộ khi phát triển.",
      ...(dev
        ? { NSAppTransportSecurity: { NSAllowsLocalNetworking: true } }
        : {}),
    },
  },
  android: {
    package: "com.pbl6.eventhub",
    blockedPermissions: ["android.permission.RECORD_AUDIO"],
  },
  web: { bundler: "metro", output: "single", name: "EventHub Mobile" },
  plugins: [
    "expo-router",
    "expo-secure-store",
    [
      "expo-camera",
      {
        cameraPermission:
          "Cho phép EventHub dùng camera để quét mã QR trên vé.",
        recordAudioAndroid: false,
      },
    ],
    ["expo-build-properties", { android: { usesCleartextTraffic: dev } }],
  ],
};
export default config;
