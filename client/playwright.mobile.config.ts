import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests-mobile",
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: "http://127.0.0.1:8082",
    headless: true,
    viewport: { width: 390, height: 844 },
    trace: "retain-on-failure",
  },
  reporter: "list",
});
