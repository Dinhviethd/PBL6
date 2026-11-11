const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const dir = path.resolve(__dirname, "../.local/mobile-migration");
async function main() {
  const fixture = JSON.parse(
    fs.readFileSync(path.join(dir, "booking-fixture.json"), "utf8"),
  );
  const base = "http://127.0.0.1:8016/api",
    evidence = [];
  async function call(method, endpoint, body, token, expected = 200) {
    const response = await fetch(base + endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const result = await response.json();
    const data = result.data;
    const shape = Array.isArray(data)
      ? {
          array: true,
          length: data.length,
          itemKeys: Object.keys(data[0] ?? {}),
        }
      : {
          keys: Object.keys(data ?? {}),
          nested: Object.fromEntries(
            Object.entries(data ?? {})
              .filter(([, v]) => v && typeof v === "object")
              .map(([k, v]) => [
                k,
                Array.isArray(v)
                  ? {
                      array: true,
                      length: v.length,
                      itemKeys: Object.keys(v[0] ?? {}),
                    }
                  : Object.keys(v),
              ]),
          ),
        };
    evidence.push({
      method,
      endpoint,
      status: response.status,
      expected,
      code: result.code,
      shape,
    });
    assert.equal(
      response.status,
      expected,
      `${method} ${endpoint}: ${result.message || ""}`,
    );
    return data;
  }
  try {
    const auth = await call("POST", "/auth/mobile/login", fixture.owner);
    const buyer = await call("POST", "/auth/mobile/login", fixture.buyer);
    const token = auth.accessToken,
      id = fixture.event.id;
    for (const endpoint of [
      "/organizer/dashboard",
      "/organizer/events",
      "/organizer/events/status-counts",
      `/organizer/events/${id}`,
      `/organizer/events/${id}/orders`,
      `/organizer/events/${id}/order-manager`,
      `/organizer/events/${id}/orders/${fixture.paidOrder}`,
      `/organizer/events/${id}/attendees`,
      `/organizer/events/${id}/analytics`,
      `/organizer/events/${id}/staff`,
      `/organizer/events/${id}/checkins`,
      "/admin/stats",
      "/admin/users",
      "/admin/organizer-applications",
      "/admin/categories",
      "/admin/events",
      "/admin/events/kpis",
      "/admin/payments",
      "/admin/sepay/transactions",
      "/admin/settings/payment-information",
    ])
      await call("GET", endpoint, undefined, token);
    const credentials = {
      name: "BTC Mobile QA",
      email: `${randomUUID()}@example.test`,
      password: "MobileTest2026!",
      confirmPassword: "MobileTest2026!",
    };
    const applicant = await call("POST", "/auth/mobile/register", credentials);
    const application = await call(
      "POST",
      "/me/organizer-applications",
      {
        organizationName: "BTC Mobile QA",
        contactName: "QA",
        contactEmail: credentials.email,
        contactPhone: "0900000000",
        description: "Tổ chức sự kiện kiểm thử local",
        businessName: "Công ty kiểm thử",
        taxIdOrBusinessLicense: "QA-TEST-ONLY",
        websiteOrSocial: "https://example.test",
        headOfficeAddress: "Địa chỉ kiểm thử",
        mainEventCategory: "Âm nhạc",
        expectedEventScale: "100 người",
      },
      applicant.accessToken,
    );
    await call(
      "GET",
      "/me/organizer-applications",
      undefined,
      applicant.accessToken,
    );
    await call(
      "GET",
      `/admin/organizer-applications/${application.id}`,
      undefined,
      token,
    );
    await call(
      "POST",
      `/admin/organizer-applications/${application.id}/review`,
      { approve: true },
      token,
    );
    const organizer = await call("POST", "/auth/mobile/login", credentials);
    await call("GET", "/organizer/profile", undefined, organizer.accessToken);
    await call("GET", "/organizer/team", undefined, organizer.accessToken);
    fixture.approvedOrganizer = credentials;
    fs.writeFileSync(
      path.join(dir, "booking-fixture.json"),
      JSON.stringify(fixture, null, 2),
      { mode: 0o600 },
    );
    console.log(
      `PASS ${evidence.length} management HTTP calls; response shapes recorded.`,
    );
  } finally {
    fs.writeFileSync(
      path.join(dir, "management-api-evidence.json"),
      JSON.stringify(
        { timestamp: new Date().toISOString(), target: base, calls: evidence },
        null,
        2,
      ),
    );
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
