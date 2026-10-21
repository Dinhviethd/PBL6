import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// Only suites which intercept API requests: safe without an application database.
export default defineConfig({
  ...base,
  testMatch: [
    "stitch-web.spec.ts",
    "vnpay-ui.spec.ts",
    "notifications-ui.spec.ts",
  ],
  use: { ...base.use, baseURL: "http://127.0.0.1:5174" },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5174 --strictPort",
    url: "http://127.0.0.1:5174",
    reuseExistingServer: !process.env.CI,
  },
});
