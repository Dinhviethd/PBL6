const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const dir = path.resolve(__dirname, "../.local/mobile-migration");
async function main() {
  const fixture = JSON.parse(
      fs.readFileSync(path.join(dir, "booking-fixture.json"), "utf8"),
    ),
    evidence = [];
  const base = "http://127.0.0.1:8016/api";
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
    evidence.push({
      method,
      endpoint,
      status: response.status,
      expected,
      code: result.code,
    });
    assert.equal(
      response.status,
      expected,
      `${method} ${endpoint}: ${result.message || ""}`,
    );
    return result.data;
  }
  try {
    const owner = await call("POST", "/auth/mobile/login", fixture.owner),
      token = owner.accessToken;
    const organizer = await call(
      "POST",
      "/auth/mobile/login",
      fixture.approvedOrganizer,
    );
    const profile = await call(
      "GET",
      "/organizer/profile",
      undefined,
      organizer.accessToken,
    );
    await call(
      "PATCH",
      "/organizer/profile",
      {
        version: profile.version,
        description: "Thông tin tổ chức cập nhật từ smoke test mobile",
      },
      organizer.accessToken,
    );
    const fresh = await call(
      "GET",
      "/organizer/profile",
      undefined,
      organizer.accessToken,
    );
    await call(
      "POST",
      "/organizer/profile/legal-requests",
      {
        version: fresh.version,
        changes: {
          businessName: `Công ty Mobile QA ${randomUUID().slice(0, 8)}`,
        },
      },
      organizer.accessToken,
    );
    await call(
      "GET",
      "/organizer/profile/legal-requests",
      undefined,
      organizer.accessToken,
    );
    const requests = await call(
      "GET",
      "/admin/organizer-profile-requests",
      undefined,
      token,
    );
    const legal =
      requests.find(
        (r) => r.owner_id === organizer.user.idUser && r.status === "PENDING",
      ) ?? requests.find((r) => r.status === "PENDING");
    if (legal)
      await call(
        "POST",
        `/admin/organizer-profile-requests/${legal.id}/review`,
        { approve: true, reason: "Xác minh dữ liệu tổng hợp" },
        token,
      );
    const category = await call(
      "POST",
      "/admin/categories",
      {
        name: `Temporary QA ${randomUUID().slice(0, 6)}`,
        description: "Kiểm thử CRUD",
      },
      token,
    );
    await call(
      "PATCH",
      `/admin/categories/${category.id}`,
      { name: "Danh mục kiểm thử đã sửa", description: "Kiểm thử CRUD" },
      token,
    );
    await call("DELETE", `/admin/categories/${category.id}`, undefined, token);
    const credentials = {
      name: "Khách hàng kiểm thử khóa",
      email: `${randomUUID()}@example.test`,
      password: "MobileTest2026!",
      confirmPassword: "MobileTest2026!",
    };
    const customer = await call("POST", "/auth/mobile/register", credentials);
    await call("GET", `/admin/users/${customer.user.idUser}`, undefined, token);
    await call(
      "PATCH",
      `/admin/users/${customer.user.idUser}`,
      { status: "INACTIVE", locked: true, reason: "Kiểm thử local" },
      token,
    );
    await call(
      "PATCH",
      `/admin/users/${customer.user.idUser}`,
      { status: "ACTIVE", locked: false, reason: "Kết thúc kiểm thử local" },
      token,
    );
    customer.accessToken = (
      await call("POST", "/auth/mobile/login", credentials)
    ).accessToken;
    const source = await call(
      "GET",
      `/organizer/events/${fixture.event.id}`,
      undefined,
      token,
    );
    const eventPayload = {
      title: `Sự kiện nháp ${randomUUID().slice(0, 6)}`,
      description: source.description,
      categoryId: source.category_id,
      venueName: source.venue_name,
      address: source.address,
      cityCode: source.city_code,
      startsAt: source.starts_at,
      endsAt: source.ends_at,
      checkinOpensAt: source.checkin_opens_at,
      checkinClosesAt: source.checkin_closes_at,
    };
    const draft = await call("POST", "/organizer/events", eventPayload, token);
    await call(
      "PATCH",
      `/organizer/events/${draft.id}`,
      { ...eventPayload, title: eventPayload.title + " chỉnh sửa" },
      token,
    );
    const typePayload = {
      name: "Vé nháp",
      price: "50000",
      capacity: 10,
      saleStartsAt: new Date(Date.now() - 3600000).toISOString(),
      saleEndsAt: source.starts_at,
    };
    const type = await call(
      "POST",
      `/organizer/events/${draft.id}/ticket-types`,
      typePayload,
      token,
    );
    await call(
      "PATCH",
      `/organizer/events/${draft.id}/ticket-types/${type.id}`,
      { ...typePayload, capacity: 12 },
      token,
    );
    await call(
      "DELETE",
      `/organizer/events/${draft.id}/ticket-types/${type.id}`,
      undefined,
      token,
    );
    await call(
      "POST",
      `/organizer/events/${draft.id}/cancel`,
      { reason: "Kết thúc kiểm thử local" },
      token,
    );
    await call(
      "POST",
      `/organizer/events/${fixture.event.id}/pause`,
      { paused: true },
      token,
    );
    await call(
      "POST",
      `/organizer/events/${fixture.event.id}/pause`,
      { paused: false },
      token,
    );
    const invitation = await call(
      "POST",
      `/organizer/events/${fixture.event.id}/staff`,
      { email: customer.user.email },
      token,
    );
    await call(
      "POST",
      `/me/checkin-invitations/${invitation.id}/respond`,
      { accept: true },
      customer.accessToken,
    );
    await call(
      "GET",
      `/checkin/events/${fixture.event.id}`,
      undefined,
      customer.accessToken,
    );
    const buyer = await call("POST", "/auth/mobile/login", fixture.buyer);
    const tickets = await call(
      "GET",
      "/me/tickets",
      undefined,
      buyer.accessToken,
    );
    const ticket = tickets.find(
      (t) => t.event_id === fixture.event.id && t.status === "VALID",
    );
    if (ticket) {
      await call(
        "POST",
        `/checkin/events/${fixture.event.id}/checkins`,
        { code: ticket.ticket_code },
        customer.accessToken,
      );
      const duplicate = await call(
        "POST",
        `/checkin/events/${fixture.event.id}/checkins`,
        { code: ticket.ticket_code },
        customer.accessToken,
      );
      assert.equal(duplicate.duplicate, true);
    }
    await call(
      "GET",
      `/organizer/events/${fixture.event.id}/checkins`,
      undefined,
      token,
    );
    await call(
      "DELETE",
      `/organizer/events/${fixture.event.id}/staff/${invitation.id}`,
      undefined,
      token,
    );
    console.log(`PASS ${evidence.length} management/action HTTP checks.`);
  } finally {
    fs.writeFileSync(
      path.join(dir, "management-actions-evidence.json"),
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
