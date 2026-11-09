import { defineConfig } from "@playwright/test";
import base from "./playwright.ui.config";
export default defineConfig({
  ...base,
  testMatch: ["organizer-draft-security.spec.ts", "security-framing.spec.ts"],
  webServer: [
    { command: "npm run dev -- --host 127.0.0.1 --port 5174 --strictPort", url: "http://127.0.0.1:5174", reuseExistingServer: false },
    { command: "node tests/helpers/security-server.cjs", url: "http://127.0.0.1:5188/api/config", reuseExistingServer: false },
  ],
});
