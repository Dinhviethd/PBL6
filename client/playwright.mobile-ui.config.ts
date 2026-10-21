import { defineConfig } from "@playwright/test";
import base from "./playwright.mobile.config";

export default defineConfig({
  ...base,
  testMatch: ["stitch-mobile.spec.ts", "notifications-ui.spec.ts"],
  use: { ...base.use, baseURL: "http://127.0.0.1:8083" },
  webServer: {
    command: "node ../scripts/mobile-ui-server.cjs",
    url: "http://127.0.0.1:8083",
    reuseExistingServer: false,
  },
});
