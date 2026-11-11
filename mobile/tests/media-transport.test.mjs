import { test } from "node:test";
import assert from "node:assert/strict";
import { createApiClient } from "../src/lib/api-client.ts";
test("authenticated multipart upload preserves the body and lets fetch choose the boundary", async () => {
  const body = new FormData();
  body.append("image", new Blob(["synthetic-image"]), "avatar.png");
  let sent = false;
  const client = createApiClient({
    baseUrl: "https://example.test/api",
    native: true,
    storage: {
      read: async () => null,
      write: async () => {},
      clear: async () => {},
    },
    fetcher: async (url, options) => {
      if (url.endsWith("/auth/mobile/login"))
        return Response.json({
          success: true,
          data: {
            accessToken: "token-a",
            refreshToken: "refresh-a",
            user: { idUser: "a", name: "A", roles: ["USER"] },
          },
        });
      assert.equal(url, "https://example.test/api/media");
      assert.equal(options.body, body);
      assert.equal(options.headers["Content-Type"], undefined);
      assert.equal(options.headers.Authorization, "Bearer token-a");
      sent = true;
      return Response.json({
        success: true,
        data: { url: "/uploads/test.webp" },
      });
    },
  });
  await client.authenticate("login", {
    email: "a@example.test",
    password: "Valid2026!",
  });
  assert.deepEqual(await client.request("/media", "POST", body), {
    url: "/uploads/test.webp",
  });
  assert.equal(sent, true);
});
