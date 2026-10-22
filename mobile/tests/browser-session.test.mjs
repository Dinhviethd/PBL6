import { test } from "node:test";
import assert from "node:assert/strict";
import { withBrowserRefreshLock as webLock } from "../../client/src/lib/browser-session.ts";
import { withBrowserRefreshLock as expoLock } from "../src/lib/browser-session.ts";

for (const [name, lock] of [
  ["React web", webLock],
  ["Expo web", expoLock],
]) {
  test(`${name} does not send unsafe refresh when Web Locks is unavailable`, async () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {},
    });
    let called = false;
    try {
      await assert.rejects(
        lock(async () => {
          called = true;
        }),
        /HTTPS hoặc localhost/,
      );
      assert.equal(called, false);
    } finally {
      if (descriptor)
        Object.defineProperty(globalThis, "navigator", descriptor);
      else delete globalThis.navigator;
    }
  });
}
