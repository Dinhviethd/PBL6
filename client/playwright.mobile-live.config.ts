import { defineConfig } from "@playwright/test";
import base from "./playwright.mobile.config";
export default defineConfig({
  ...base,
  testMatch: [
    "migration-live.spec.ts",
    "migration-payment-live.spec.ts",
    "migration-management-live.spec.ts",
    "migration-completion-live.spec.ts",
  ],
  workers: 1,
  reporter: [
    ["list"],
    [
      "json",
      { outputFile: "../.local/mobile-migration/playwright-live-results.json" },
    ],
  ],
  use: { ...base.use, baseURL: "http://127.0.0.1:8083" },
  webServer: {
    command: "node ../scripts/mobile-ui-server.cjs --live-test-api --sepay",
    url: "http://127.0.0.1:8083",
    reuseExistingServer: false,
  },
});
