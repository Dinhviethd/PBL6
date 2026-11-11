import { test as base } from "@playwright/test";
export { expect, type Page } from "@playwright/test";
let nextStart = 0;
// Keep the real server's 20 credential requests/minute protection enabled.
// Tests register/login/reset accounts; pace scenarios rather than disabling it.
export const test = base.extend<{ apiPace: void }>({
  apiPace: [
    async ({ baseURL }, use) => {
      if (baseURL !== "http://127.0.0.1:8083") throw new Error("Migration mutation tests require the isolated local preview.");
      const wait = Math.max(0, nextStart - Date.now());
      if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
      nextStart = Date.now() + 15000;
      await use();
    },
    { auto: true },
  ],
});
