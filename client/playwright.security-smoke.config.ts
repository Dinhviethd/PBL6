import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
// Existing mocked API scenarios, served by the built Express app with real headers.
export default defineConfig({
  ...base,
  testMatch: ["notifications-ui.spec.ts", "vnpay-ui.spec.ts", "sepay-ui.spec.ts"],
  use: { ...base.use, baseURL: "http://127.0.0.1:5188" },
  webServer: {
    command: "node tests/helpers/security-server.cjs",
    url: "http://127.0.0.1:5188/api/config",
    reuseExistingServer: false,
  },
});
